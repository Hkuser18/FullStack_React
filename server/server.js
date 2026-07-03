import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Server } from 'socket.io';
import { GoogleGenAI } from '@google/genai';
import pool, { SEED_USERS, SEED_EXAMS, SEED_ATTEMPTS, SEED_QUESTION_BANK } from './db.js';
import { registerSocketHandlers } from './socket.js';

const BCRYPT_ROUNDS = 10;

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

const app  = express();
const PORT = process.env.PORT || 3002;

const EXAM_STATUSES = ['draft', 'published', 'closed'];

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Live Monitor real-time layer — shares the same port/CORS origin as the REST API
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' },
});
const monitorBridge = registerSocketHandlers(io);

// Throttles brute-force login/register attempts per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
});

// AI question generation calls a paid external API — throttle harder than normal routes
const aiGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI generation requests, please try again later.' },
});

// Wraps async route handlers so thrown errors reach the error middleware
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// JWT middleware — attaches req.user or returns 401
const auth = (req, res, next) => {
  const header = req.headers['authorization'];
  const token  = header && header.startsWith('Bearer ') && header.slice(7);
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role-guard middleware factory — use after auth
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: 'Forbidden: insufficient role' });
  next();
};

// ── Reusable column lists (camelCase aliases match the mock API shape) ─────────

const QB_COLS = `
  id, text, type, options,
  correct_option AS "correctOption",
  keywords, topic,
  created_by AS "createdBy",
  created_at AS "createdAt"
`;

const EXAM_COLS = `
  id, title, description, status,
  created_by    AS "createdBy",
  duration,
  passing_score AS "passingScore",
  created_at    AS "createdAt",
  start_date    AS "startDate",
  end_date      AS "endDate",
  questions
`;

const ATTEMPT_COLS = `
  id,
  exam_id      AS "examId",
  student_id   AS "studentId",
  answers, score, passed, feedback,
  started_at   AS "startedAt",
  submitted_at AS "submittedAt",
  tab_switch_count AS "tabSwitchCount"
`;

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', authLimiter, wrap(async (req, res) => {
  const { username, password, role } = req.body;
  const { rows } = await pool.query(
    `SELECT id, username, password, role, name, status FROM users
     WHERE username=$1 AND role=$2`,
    [username, role]
  );
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
  const user = rows[0];
  if (!(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Invalid credentials' });
  if (user.status === 'pending')
    return res.status(403).json({ error: 'Your teacher account is awaiting admin approval.' });
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  const { status: _s, password: _p, ...publicUser } = user;
  res.json({ ...publicUser, token });
}));

app.post('/api/auth/register', authLimiter, wrap(async (req, res) => {
  const { username, password, name, role } = req.body;
  const dup = await pool.query('SELECT id FROM users WHERE username=$1', [username]);
  if (dup.rows.length) return res.status(409).json({ error: 'Username already taken' });
  const id           = `u_${Date.now()}`;
  const status       = role === 'teacher' ? 'pending' : 'active';
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO users (id, username, password, role, name, status)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, username, role, name`,
    [id, username, passwordHash, role, name, status]
  );
  const msg = role === 'teacher'
    ? 'Teacher account created — awaiting admin approval before you can log in.'
    : null;
  res.status(201).json({ ...rows[0], ...(msg && { message: msg }) });
}));

// ── Admin ─────────────────────────────────────────────────────────────────────

app.get('/api/admin/teachers/pending', auth, requireRole('admin'), wrap(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, username, name, role FROM users WHERE role='teacher' AND status='pending'`
  );
  res.json(rows);
}));

app.patch('/api/admin/teachers/:id/approve', auth, requireRole('admin'), wrap(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE users SET status='active' WHERE id=$1 AND role='teacher' RETURNING id, username, name, role`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Teacher not found' });
  res.json(rows[0]);
}));

app.patch('/api/admin/teachers/:id/reject', auth, requireRole('admin'), wrap(async (req, res) => {
  const { rowCount } = await pool.query(
    `DELETE FROM users WHERE id=$1 AND role='teacher' AND status='pending'`,
    [req.params.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Pending teacher not found' });
  res.json({ success: true });
}));

// ── Users ─────────────────────────────────────────────────────────────────────

app.get('/api/users', auth, requireRole('teacher', 'admin'), wrap(async (_req, res) => {
  const { rows } = await pool.query('SELECT id, username, role, name FROM users');
  res.json(rows);
}));

app.get('/api/users/:id', auth, wrap(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, username, role, name FROM users WHERE id=$1',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
}));

// ── Exams ─────────────────────────────────────────────────────────────────────
// NOTE: specific routes (/published, /teacher/:id) must come before /:id

app.get('/api/exams', auth, wrap(async (_req, res) => {
  const { rows } = await pool.query(`SELECT ${EXAM_COLS} FROM exams`);
  res.json(rows);
}));

app.get('/api/exams/published', auth, wrap(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT ${EXAM_COLS} FROM exams WHERE status='published'`
  );
  res.json(rows);
}));

app.get('/api/exams/teacher/:teacherId', auth, wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${EXAM_COLS} FROM exams WHERE created_by=$1`,
    [req.params.teacherId]
  );
  res.json(rows);
}));

app.get('/api/exams/:id', auth, wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${EXAM_COLS} FROM exams WHERE id=$1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Exam not found' });
  res.json(rows[0]);
}));

app.post('/api/exams', auth, requireRole('teacher', 'admin'), wrap(async (req, res) => {
  const {
    title = 'Untitled Exam', description = '', duration = 30,
    passingScore = 60, createdBy, questions = [], startDate = null, endDate = null,
  } = req.body;
  const id = `e_${Date.now()}`;
  const { rows } = await pool.query(
    `INSERT INTO exams (id, title, description, status, created_by, duration, passing_score, questions, start_date, end_date)
     VALUES ($1,$2,$3,'draft',$4,$5,$6,$7,$8,$9)
     RETURNING ${EXAM_COLS}`,
    [id, title, description, createdBy, duration, passingScore, JSON.stringify(questions), startDate, endDate]
  );
  res.status(201).json(rows[0]);
}));

app.put('/api/exams/:id', auth, requireRole('teacher', 'admin'), wrap(async (req, res) => {
  const { title, description, duration, passingScore, questions, startDate = null, endDate = null } = req.body;
  const { rows } = await pool.query(
    `UPDATE exams
     SET title=$1, description=$2, duration=$3, passing_score=$4, questions=$5, start_date=$6, end_date=$7
     WHERE id=$8
     RETURNING ${EXAM_COLS}`,
    [title, description, duration, passingScore, JSON.stringify(questions), startDate, endDate, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Exam not found' });
  res.json(rows[0]);
}));

app.delete('/api/exams/:id', auth, requireRole('teacher', 'admin'), wrap(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM exams WHERE id=$1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Exam not found' });
  res.json({ success: true });
}));

app.patch('/api/exams/:id/status', auth, requireRole('teacher', 'admin'), wrap(async (req, res) => {
  const { status } = req.body;
  if (!EXAM_STATUSES.includes(status))
    return res.status(400).json({ error: `Invalid status: ${status}` });
  const { rows } = await pool.query(
    `UPDATE exams SET status=$1 WHERE id=$2 RETURNING ${EXAM_COLS}`,
    [status, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Exam not found' });
  res.json(rows[0]);
}));

// ── Attempts ──────────────────────────────────────────────────────────────────

app.post('/api/attempts', auth, requireRole('student'), wrap(async (req, res) => {
  const { examId, studentId, answers, startedAt } = req.body;

  const { rows: exRows } = await pool.query(
    'SELECT questions, passing_score FROM exams WHERE id=$1',
    [examId]
  );
  if (!exRows.length) return res.status(404).json({ error: 'Exam not found' });

  const { questions, passing_score } = exRows[0];
  const correct = answers.reduce((acc, ans, i) => {
    const q = questions[i];
    if (!q) return acc;
    if (q.type === 'open') {
      const text = String(ans ?? '').toLowerCase();
      return acc + ((q.keywords ?? []).some(kw => text.includes(kw.toLowerCase())) ? 1 : 0);
    }
    return acc + (ans === q.correctOption ? 1 : 0);
  }, 0);
  const score  = Math.round((correct / questions.length) * 100);
  const passed = score >= passing_score;

  const tabSwitchCount = monitorBridge.getAndClearTabSwitchCount(examId, studentId);

  const id = `a_${Date.now()}`;
  const { rows } = await pool.query(
    `INSERT INTO attempts (id, exam_id, student_id, answers, score, passed, started_at, submitted_at, tab_switch_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8)
     RETURNING ${ATTEMPT_COLS}`,
    [id, examId, studentId, JSON.stringify(answers), score, passed, startedAt, tabSwitchCount]
  );
  monitorBridge.broadcastSubmitted(examId, studentId, rows[0]);
  res.status(201).json(rows[0]);
}));

app.get('/api/attempts/student/:studentId', auth, wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${ATTEMPT_COLS} FROM attempts WHERE student_id=$1`,
    [req.params.studentId]
  );
  res.json(rows);
}));

app.get('/api/attempts/exam/:examId', auth, wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${ATTEMPT_COLS} FROM attempts WHERE exam_id=$1`,
    [req.params.examId]
  );
  res.json(rows);
}));

app.get('/api/attempts/check/:studentId/:examId', auth, wrap(async (req, res) => {
  const { studentId, examId } = req.params;
  const { rows } = await pool.query(
    'SELECT 1 FROM attempts WHERE student_id=$1 AND exam_id=$2 LIMIT 1',
    [studentId, examId]
  );
  res.json({ attempted: rows.length > 0 });
}));

// Manual grading override — lets a teacher adjust the auto-graded score and leave feedback
app.patch('/api/attempts/:id', auth, requireRole('teacher', 'admin'), wrap(async (req, res) => {
  const { score, feedback } = req.body;
  if (typeof score !== 'number' || score < 0 || score > 100)
    return res.status(400).json({ error: 'score must be a number between 0 and 100' });

  const { rows: atRows } = await pool.query('SELECT exam_id FROM attempts WHERE id=$1', [req.params.id]);
  if (!atRows.length) return res.status(404).json({ error: 'Attempt not found' });

  const { rows: exRows } = await pool.query('SELECT passing_score FROM exams WHERE id=$1', [atRows[0].exam_id]);
  const passed = score >= exRows[0].passing_score;

  const { rows } = await pool.query(
    `UPDATE attempts SET score=$1, passed=$2, feedback=$3 WHERE id=$4 RETURNING ${ATTEMPT_COLS}`,
    [score, passed, feedback ?? null, req.params.id]
  );
  res.json(rows[0]);
}));

// ── Question Bank ─────────────────────────────────────────────────────────────

app.get('/api/questions', auth, wrap(async (_req, res) => {
  const { rows } = await pool.query(`SELECT ${QB_COLS} FROM question_bank ORDER BY created_at DESC`);
  res.json(rows);
}));

app.get('/api/questions/teacher/:teacherId', auth, wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${QB_COLS} FROM question_bank WHERE created_by=$1 ORDER BY created_at DESC`,
    [req.params.teacherId]
  );
  res.json(rows);
}));

app.post('/api/questions', auth, requireRole('teacher', 'admin'), wrap(async (req, res) => {
  const { text, type = 'multiple-choice', options, correctOption, keywords, topic = '', createdBy } = req.body;
  const id = `qb_${Date.now()}`;
  const { rows } = await pool.query(
    `INSERT INTO question_bank (id, text, type, options, correct_option, keywords, topic, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING ${QB_COLS}`,
    [id, text, type,
     options ? JSON.stringify(options) : null,
     correctOption ?? null,
     keywords ? JSON.stringify(keywords) : null,
     topic, createdBy]
  );
  res.status(201).json(rows[0]);
}));

app.put('/api/questions/:id', auth, requireRole('teacher', 'admin'), wrap(async (req, res) => {
  const { text, type, options, correctOption, keywords, topic } = req.body;
  const { rows } = await pool.query(
    `UPDATE question_bank
     SET text=$1, type=$2, options=$3, correct_option=$4, keywords=$5, topic=$6
     WHERE id=$7
     RETURNING ${QB_COLS}`,
    [text, type,
     options ? JSON.stringify(options) : null,
     correctOption ?? null,
     keywords ? JSON.stringify(keywords) : null,
     topic ?? '', req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Question not found' });
  res.json(rows[0]);
}));

app.delete('/api/questions/:id', auth, requireRole('teacher', 'admin'), wrap(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM question_bank WHERE id=$1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Question not found' });
  res.json({ success: true });
}));

// ── AI Question Generation ──────────────────────────────────────────────────────
// Structured-outputs schema: MC-only fields (options/correctOption) and
// open-only fields (keywords) are both present but nullable, since JSON Schema
// structured outputs don't support conditional/discriminated-union requiredness.
const QUESTION_GEN_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type:          { type: 'string', enum: ['multiple-choice', 'open'] },
          text:          { type: 'string' },
          topic:         { type: 'string' },
          options:       { type: ['array', 'null'], items: { type: 'string' } },
          correctOption: { type: ['integer', 'null'] },
          keywords:      { type: ['array', 'null'], items: { type: 'string' } },
        },
        required: ['type', 'text', 'topic', 'options', 'correctOption', 'keywords'],
      },
    },
  },
  required: ['questions'],
};

// The model's output feeds directly into auto-grading (correctOption / keywords),
// so nothing from it is trusted without validation — malformed items are dropped
// rather than saved as a broken exam question.
function sanitizeGeneratedQuestion(q, fallbackTopic) {
  if (!q || typeof q.text !== 'string' || !q.text.trim()) return null;
  const topic = (typeof q.topic === 'string' && q.topic.trim()) || fallbackTopic;

  if (q.type === 'open') {
    const keywords = Array.isArray(q.keywords)
      ? q.keywords.filter(k => typeof k === 'string' && k.trim())
      : [];
    if (!keywords.length) return null;
    return { type: 'open', text: q.text.trim(), topic, keywords };
  }

  const options = Array.isArray(q.options)
    ? q.options.filter(o => typeof o === 'string' && o.trim())
    : [];
  if (options.length < 2) return null;
  if (!Number.isInteger(q.correctOption) || q.correctOption < 0 || q.correctOption >= options.length) return null;
  return { type: 'multiple-choice', text: q.text.trim(), topic, options, correctOption: q.correctOption };
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

async function generateQuestionsWithAI(topic, count, type) {
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const typeInstruction = type === 'mixed'
    ? 'a mix of "multiple-choice" and "open" questions'
    : `only "${type}" questions`;

  const interaction = await genAI.interactions.create({
    model: GEMINI_MODEL,
    input: `Generate ${count} exam question(s) about "${topic}" for a university-level course. Use ${typeInstruction}.

For "multiple-choice" questions: provide exactly 4 plausible options in "options" and the 0-based index of the correct one in "correctOption"; leave "keywords" null.
For "open" questions: provide 3-6 short lowercase "keywords" that a correct free-text answer should contain; leave "options" and "correctOption" null.

Each question's "topic" field should be a short label (e.g. "${topic}"). Questions must be factually correct, unambiguous, and have exactly one defensible correct answer.`,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: QUESTION_GEN_SCHEMA,
    },
  });

  if (!interaction.output_text) throw new Error('AI response contained no content.');

  const parsed = JSON.parse(interaction.output_text);
  return Array.isArray(parsed.questions) ? parsed.questions : [];
}

app.post('/api/questions/generate', auth, requireRole('teacher', 'admin'), aiGenerationLimiter, wrap(async (req, res) => {
  const { topic, count = 5, type = 'mixed' } = req.body;
  if (typeof topic !== 'string' || !topic.trim())
    return res.status(400).json({ error: 'topic is required' });
  const n = Number(count);
  if (!Number.isInteger(n) || n < 1 || n > 10)
    return res.status(400).json({ error: 'count must be an integer between 1 and 10' });
  if (!['multiple-choice', 'open', 'mixed'].includes(type))
    return res.status(400).json({ error: 'type must be multiple-choice, open, or mixed' });
  if (!process.env.GEMINI_API_KEY)
    return res.status(503).json({ error: 'AI question generation is not configured on this server' });

  let raw;
  try {
    raw = await generateQuestionsWithAI(topic.trim(), n, type);
  } catch (err) {
    console.error('AI question generation failed:', err.message);
    return res.status(502).json({ error: 'AI question generation is temporarily unavailable. Please try again later.' });
  }
  const sanitized = raw
    .map(q => sanitizeGeneratedQuestion(q, topic.trim()))
    .filter(Boolean)
    .map((q, i) => ({ ...q, id: `ai_${Date.now()}_${i}` }));

  if (!sanitized.length)
    return res.status(502).json({ error: 'The AI did not return any valid questions — try again or rephrase the topic.' });

  res.json({ questions: sanitized });
}));

// ── Utility ───────────────────────────────────────────────────────────────────

app.post('/api/db/reset', auth, wrap(async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE attempts, exams, question_bank, users RESTART IDENTITY CASCADE');
    for (const u of SEED_USERS)
      await client.query(
        'INSERT INTO users (id, username, password, role, name, status) VALUES ($1,$2,$3,$4,$5,$6)',
        [u.id, u.username, await bcrypt.hash(u.password, BCRYPT_ROUNDS), u.role, u.name, u.status ?? 'active']
      );
    for (const e of SEED_EXAMS)
      await client.query(
        `INSERT INTO exams (id, title, description, status, created_by, duration, passing_score, created_at, questions)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [e.id, e.title, e.description, e.status, e.createdBy,
         e.duration, e.passingScore, e.createdAt, JSON.stringify(e.questions)]
      );
    for (const a of SEED_ATTEMPTS)
      await client.query(
        `INSERT INTO attempts (id, exam_id, student_id, answers, score, passed, started_at, submitted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [a.id, a.examId, a.studentId, JSON.stringify(a.answers),
         a.score, a.passed, a.startedAt, a.submittedAt]
      );
    for (const q of SEED_QUESTION_BANK)
      await client.query(
        `INSERT INTO question_bank (id, text, type, options, correct_option, keywords, topic, created_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [q.id, q.text, q.type,
         q.options ? JSON.stringify(q.options) : null,
         q.correctOption ?? null,
         q.keywords ? JSON.stringify(q.keywords) : null,
         q.topic, q.createdBy, q.createdAt]
      );
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ── Error handler ─────────────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS question_bank (
      id             TEXT        PRIMARY KEY,
      text           TEXT        NOT NULL,
      type           TEXT        NOT NULL DEFAULT 'multiple-choice'
                                 CHECK (type IN ('multiple-choice', 'open')),
      options        JSONB,
      correct_option INT,
      keywords       JSONB,
      topic          TEXT        NOT NULL DEFAULT '',
      created_by     TEXT        NOT NULL REFERENCES users(id),
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_question_bank_created_by ON question_bank(created_by)
  `);
  // Exam scheduling columns (idempotent)
  await pool.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS end_date   TIMESTAMPTZ`);
  // User status for teacher approval (idempotent)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`);
  // Teacher feedback / manual grading override (idempotent)
  await pool.query(`ALTER TABLE attempts ADD COLUMN IF NOT EXISTS feedback TEXT`);
  // Live Monitor: tab-switch count captured at submit time (idempotent)
  await pool.query(`ALTER TABLE attempts ADD COLUMN IF NOT EXISTS tab_switch_count INT NOT NULL DEFAULT 0`);
  console.log('Migration complete');
}

server.listen(PORT, async () => {
  console.log(`ExamsApp server running on port ${PORT}`);
  await migrate().catch(err => console.error('Migration failed:', err.message));
});
