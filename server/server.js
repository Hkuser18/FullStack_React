import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import pool, { SEED_USERS, SEED_EXAMS, SEED_ATTEMPTS, SEED_QUESTION_BANK } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

const app  = express();
const PORT = process.env.PORT || 3002;

const EXAM_STATUSES = ['draft', 'published', 'closed'];

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

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
  answers, score, passed,
  started_at   AS "startedAt",
  submitted_at AS "submittedAt"
`;

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', wrap(async (req, res) => {
  const { username, password, role } = req.body;
  const { rows } = await pool.query(
    `SELECT id, username, role, name, status FROM users
     WHERE username=$1 AND password=$2 AND role=$3`,
    [username, password, role]
  );
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
  const user = rows[0];
  if (user.status === 'pending')
    return res.status(403).json({ error: 'Your teacher account is awaiting admin approval.' });
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  const { status: _s, ...publicUser } = user;
  res.json({ ...publicUser, token });
}));

app.post('/api/auth/register', wrap(async (req, res) => {
  const { username, password, name, role } = req.body;
  const dup = await pool.query('SELECT id FROM users WHERE username=$1', [username]);
  if (dup.rows.length) return res.status(409).json({ error: 'Username already taken' });
  const id     = `u_${Date.now()}`;
  const status = role === 'teacher' ? 'pending' : 'active';
  const { rows } = await pool.query(
    `INSERT INTO users (id, username, password, role, name, status)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, username, role, name`,
    [id, username, password, role, name, status]
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

  const id = `a_${Date.now()}`;
  const { rows } = await pool.query(
    `INSERT INTO attempts (id, exam_id, student_id, answers, score, passed, started_at, submitted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
     RETURNING ${ATTEMPT_COLS}`,
    [id, examId, studentId, JSON.stringify(answers), score, passed, startedAt]
  );
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

// ── Utility ───────────────────────────────────────────────────────────────────

app.post('/api/db/reset', auth, wrap(async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE attempts, exams, question_bank, users RESTART IDENTITY CASCADE');
    for (const u of SEED_USERS)
      await client.query(
        'INSERT INTO users (id, username, password, role, name, status) VALUES ($1,$2,$3,$4,$5,$6)',
        [u.id, u.username, u.password, u.role, u.name, u.status ?? 'active']
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
  console.log('Migration complete');
}

app.listen(PORT, async () => {
  console.log(`ExamsApp server running on port ${PORT}`);
  await migrate().catch(err => console.error('Migration failed:', err.message));
});
