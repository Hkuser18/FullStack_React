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
export function registerSocketHandlers(io, pool) {
  // examId -> Map<studentId, session>
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
    socket.on('exam:join', ({ examId, totalQuestions }) => {
      if (socket.user.role !== 'student') return;
      const studentId = socket.user.id;
      const sessions = getExamSessions(examId);
      const existing = sessions.get(studentId);
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
    socket.on('monitor:subscribe', async ({ examId }) => {
      if (!['teacher', 'admin'].includes(socket.user.role)) return;
      if (socket.user.role === 'teacher') {
        const { rows } = await pool.query('SELECT created_by FROM exams WHERE id=$1', [examId]);
        if (!rows.length || rows[0].created_by !== socket.user.id) return;
      }
      socket.join(examRoom(examId));
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
    socket.on('disconnect', () => {
      const { examId, studentId } = socket.data;
      if (!examId || !studentId) return;
      const session = activeSessions.get(examId)?.get(studentId);
      if (!session) return;

      session.connected = false;
      broadcastUpdate(examId, studentId);

      session.disconnectTimer = setTimeout(() => {
        activeSessions.get(examId)?.delete(studentId);
        io.to(examRoom(examId)).emit('monitor:left', { examId, studentId });
      }, DISCONNECT_GRACE_MS);
    });
  });

  return {
    // Called by POST /api/attempts before the INSERT, so the count can be persisted.
    getAndClearTabSwitchCount(examId, studentId) {
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
