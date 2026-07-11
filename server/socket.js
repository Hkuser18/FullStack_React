import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// How long a disconnected student's session is kept around, in case of a quick
// reconnect (tab reload, laptop sleep), before it's treated as "left without submitting".
const DISCONNECT_GRACE_MS = 30_000;

const examRoom = (examId) => `exam-room:${examId}`;

// Strips the non-serializable disconnectTimer handle before sending a session over the wire.
const toPublicSession = (examId, studentId, session) => ({
  examId,
  studentId,
  questionsAnswered: session.questionsAnswered,
  totalQuestions: session.totalQuestions,
  startedAt: session.startedAt,
  tabSwitchCount: session.tabSwitchCount,
  connected: session.connected,
});

// Registers Socket.IO auth + all Live Monitor event handling on the given io instance.
// Returns { getAndClearTabSwitchCount, broadcastSubmitted } for server.js's REST routes to call.
// הערה כללית: activeSessions הוא מצב "בזיכרון" (in-memory) - לא נשמר ב-DB, ונעלם אם
// השרת נופל/עולה מחדש. זה בסדר גמור פה כי זה מייצג "מי לומד עכשיו" (מצב זמני,
// live), בניגוד ל-attempts (הציונים הסופיים) שכן נשמרים ב-Postgres.
export function registerSocketHandlers(io, pool) {
  // examId -> Map<studentId, session>
  // מבנה נתונים מקונן: לכל מבחן (examId) יש Map נפרד של תלמידים שנמצאים בו כרגע.
  const activeSessions = new Map();

  const getExamSessions = (examId) => {
    if (!activeSessions.has(examId)) activeSessions.set(examId, new Map());
    return activeSessions.get(examId);
  };

  const broadcastUpdate = (examId, studentId) => {
    const session = activeSessions.get(examId)?.get(studentId);
    if (!session) return;
    io.to(examRoom(examId)).emit('monitor:update', toPublicSession(examId, studentId, session));
  };

  // io.use הוא "middleware" של Socket.IO - רץ פעם אחת, בזמן ההתחברות הראשונית
  // (handshake), עוד לפני שמותר לחיבור לשלוח/לקבל אירועים. אותו רעיון בדיוק כמו
  // ה-auth middleware ב-server.js, רק שכאן זה בפרוטוקול Socket.IO ולא HTTP רגיל.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      socket.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    // ── Student events ──────────────────────────────────────────────────────
    // "exam:join" נשלח מ-TakeExam.jsx בצד הלקוח כשתלמיד פותח מבחן (וגם שוב בכל
    // reconnect, כי Socket.IO לא "זוכר" חברות בחדרים אחרי ניתוק).
    socket.on('exam:join', ({ examId, totalQuestions }) => {
      if (socket.user.role !== 'student') return;
      const studentId = socket.user.id;
      const sessions = getExamSessions(examId);
      const existing = sessions.get(studentId);
      // אם היה טיימר ניתוק פעיל (מהתנתקות קודמת) - מבטלים אותו, כי התלמיד חזר.
      if (existing?.disconnectTimer) clearTimeout(existing.disconnectTimer);

      sessions.set(studentId, {
        socketId: socket.id,
        questionsAnswered: existing?.questionsAnswered ?? 0,
        totalQuestions,
        startedAt: existing?.startedAt ?? Date.now(),
        tabSwitchCount: existing?.tabSwitchCount ?? 0,
        connected: true,
        disconnectTimer: null,
      });

      socket.data.examId = examId;
      socket.data.studentId = studentId;
      // socket.join מכניס את החיבור הזה ל"חדר" (room) הייחודי למבחן הזה - כך
      // ש-io.to(examRoom(examId)).emit(...) ישלח רק לכל מי שנמצא באותו מבחן
      // (תלמידים שענו + המורה שצופה), ולא לכל המשתמשים המחוברים לשרת.
      socket.join(examRoom(examId));
      broadcastUpdate(examId, studentId);
    });

    socket.on('exam:progress', ({ examId, answeredCount }) => {
      if (socket.user.role !== 'student') return;
      const studentId = socket.user.id;
      const session = activeSessions.get(examId)?.get(studentId);
      if (!session) return;
      session.questionsAnswered = answeredCount;
      broadcastUpdate(examId, studentId);
    });

    socket.on('exam:tab-blur', ({ examId }) => {
      if (socket.user.role !== 'student') return;
      const studentId = socket.user.id;
      const session = activeSessions.get(examId)?.get(studentId);
      if (!session) return;
      session.tabSwitchCount += 1;
      io.to(examRoom(examId)).emit('monitor:violation', {
        examId,
        studentId,
        tabSwitchCount: session.tabSwitchCount,
      });
    });

    // ── Teacher events ───────────────────────────────────────────────────────
    // מורה שפותח את מסך ה-Live Monitor שולח "monitor:subscribe". לפני שמצטרפים
    // לחדר, בודקים הרשאה: מורה יכול לראות רק מבחנים שהוא עצמו יצר (created_by),
    // אדמין רואה הכל. בלי הבדיקה הזו מורה היה יכול לצפות במבחן של מורה אחר.
    socket.on('monitor:subscribe', async ({ examId }) => {
      if (!['teacher', 'admin'].includes(socket.user.role)) return;
      if (socket.user.role === 'teacher') {
        const { rows } = await pool.query('SELECT created_by FROM exams WHERE id=$1', [examId]);
        if (!rows.length || rows[0].created_by !== socket.user.id) return;
      }
      socket.join(examRoom(examId));
      // snapshot = "תמונת מצב" של כל התלמידים שכבר נמצאים במבחן ברגע ההצטרפות -
      // כי אירועי monitor:update עתידיים ישקפו רק שינויים מכאן ואילך, לא היסטוריה.
      const sessions = getExamSessions(examId);
      const snapshot = [...sessions.entries()].map(([studentId, session]) =>
        toPublicSession(examId, studentId, session)
      );
      socket.emit('monitor:snapshot', { examId, sessions: snapshot });
    });

    socket.on('monitor:unsubscribe', ({ examId }) => {
      socket.leave(examRoom(examId));
    });

    // ── Disconnect / reconnect grace period ─────────────────────────────────
    // "grace period" = תקופת חסד. במקום למחוק תלמיד מהרשימה מיד כשהחיבור נופל
    // (מה שהיה גורם ל"קפיצות" מוזרות ב-Live Monitor בכל רענון דף/ניתוק רגעי),
    // מסמנים אותו כ-"disconnected" ונותנים לו DISCONNECT_GRACE_MS (30 שניות)
    // לחזור לפני שבאמת מוחקים אותו ומודיעים למורה "התלמיד עזב".
    socket.on('disconnect', () => {
      const { examId, studentId } = socket.data;
      if (!examId || !studentId) return;
      const session = activeSessions.get(examId)?.get(studentId);
      // Ignore a disconnect from a superseded connection: if the student already
      // reconnected (a fresh exam:join replaced socketId) before this stale
      // 'disconnect' event was processed, don't evict the still-active session.
      // תרחיש שהבדיקה הזו מונעת: תלמיד מרענן דף → מתחבר חיבור *חדש* (socketId חדש)
      // ושולח exam:join *לפני* שאירוע ה-disconnect של החיבור *הישן* בכלל הגיע לשרת
      // (סדר האירועים לא מובטח ברשת). בלי הבדיקה הזו, ה-disconnect המאוחר של
      // החיבור הישן היה מוחק בטעות את הסשן החדש והתקין.
      if (!session || session.socketId !== socket.id) return;

      session.connected = false;
      broadcastUpdate(examId, studentId);

      session.disconnectTimer = setTimeout(() => {
        activeSessions.get(examId)?.delete(studentId);
        io.to(examRoom(examId)).emit('monitor:left', { examId, studentId });
      }, DISCONNECT_GRACE_MS);
    });
  });

  return {
    // A pure read — does NOT clear anything. POST /api/attempts calls this both before the
    // INSERT (to get the value to persist) and again right before broadcastSubmitted deletes
    // the session (to catch a tab-blur that landed during the INSERT's async gap).
    getTabSwitchCount(examId, studentId) {
      const session = activeSessions.get(examId)?.get(studentId);
      return session?.tabSwitchCount ?? 0;
    },

    // Called by POST /api/attempts after the INSERT succeeds.
    broadcastSubmitted(examId, studentId, attempt) {
      try {
        const session = activeSessions.get(examId)?.get(studentId);
        if (session?.disconnectTimer) clearTimeout(session.disconnectTimer);
        activeSessions.get(examId)?.delete(studentId);
        io.to(examRoom(examId)).emit('monitor:submitted', {
          examId,
          studentId,
          score: attempt.score,
          passed: attempt.passed,
        });
      } catch (err) {
        console.error('broadcastSubmitted failed (non-fatal):', err.message);
      }
    },
  };
}
