const express = require('express');
const cors    = require('cors');
const db      = require('./db');

const app  = express();
const PORT = 3001;

const EXAM_STATUSES = ['draft', 'published', 'closed'];

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { username, password, role } = req.body;
  const match = db.users.find(
    u => u.username === username && u.password === password && u.role === role
  );
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });
  const { password: _, ...user } = match;
  res.json(user);
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, name, role } = req.body;
  if (db.users.find(u => u.username === username))
    return res.status(409).json({ error: 'Username already taken' });
  const newUser = { id: `u_${Date.now()}`, username, password, name, role };
  db.users.push(newUser);
  const { password: _, ...safe } = newUser;
  res.status(201).json(safe);
});

// ── Users ─────────────────────────────────────────────────────────────────────

app.get('/api/users', (_req, res) => {
  res.json(db.users.map(({ password, ...u }) => u));
});

app.get('/api/users/:id', (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...safe } = user;
  res.json(safe);
});

// ── Exams ─────────────────────────────────────────────────────────────────────

app.get('/api/exams', (_req, res) => {
  res.json(db.exams);
});

app.get('/api/exams/published', (_req, res) => {
  res.json(db.exams.filter(e => e.status === 'published'));
});

app.get('/api/exams/teacher/:teacherId', (req, res) => {
  res.json(db.exams.filter(e => e.createdBy === req.params.teacherId));
});

app.get('/api/exams/:id', (req, res) => {
  const exam = db.exams.find(e => e.id === req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  res.json(exam);
});

app.post('/api/exams', (req, res) => {
  const { id: _id, status: _s, createdAt: _c, ...data } = req.body;
  const newExam = {
    title: 'Untitled Exam', description: '', duration: 30, passingScore: 60,
    ...data,
    id:        `e_${Date.now()}`,
    status:    'draft',
    createdAt: new Date().toISOString(),
    questions: data.questions ?? [],
  };
  db.exams.push(newExam);
  res.status(201).json(newExam);
});

app.put('/api/exams/:id', (req, res) => {
  const idx = db.exams.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Exam not found' });
  const { id: _id, status, createdBy, createdAt, ...safe } = req.body;
  db.exams[idx] = { ...db.exams[idx], ...safe };
  res.json(db.exams[idx]);
});

app.delete('/api/exams/:id', (req, res) => {
  const idx = db.exams.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Exam not found' });
  db.exams.splice(idx, 1);
  res.json({ success: true });
});

app.patch('/api/exams/:id/status', (req, res) => {
  const { status } = req.body;
  if (!EXAM_STATUSES.includes(status))
    return res.status(400).json({ error: `Invalid status: ${status}` });
  const idx = db.exams.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Exam not found' });
  db.exams[idx].status = status;
  res.json(db.exams[idx]);
});

// ── Attempts ──────────────────────────────────────────────────────────────────

app.post('/api/attempts', (req, res) => {
  const data = req.body;
  const exam = db.exams.find(e => e.id === data.examId);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  const correct = data.answers.reduce(
    (acc, ans, i) => acc + (ans === exam.questions[i]?.correctOption ? 1 : 0), 0
  );
  const score  = Math.round((correct / exam.questions.length) * 100);
  const passed = score >= (exam.passingScore ?? 60);

  const attempt = {
    ...data,
    id:          `a_${Date.now()}`,
    score,
    passed,
    submittedAt: new Date().toISOString(),
  };
  db.attempts.push(attempt);
  res.status(201).json(attempt);
});

app.get('/api/attempts/student/:studentId', (req, res) => {
  res.json(db.attempts.filter(a => a.studentId === req.params.studentId));
});

app.get('/api/attempts/exam/:examId', (req, res) => {
  res.json(db.attempts.filter(a => a.examId === req.params.examId));
});

app.get('/api/attempts/check/:studentId/:examId', (req, res) => {
  const { studentId, examId } = req.params;
  res.json({ attempted: db.attempts.some(a => a.studentId === studentId && a.examId === examId) });
});

// ── Utility ───────────────────────────────────────────────────────────────────

app.post('/api/db/reset', (_req, res) => {
  db.reset();
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`ExamsApp server running at http://localhost:${PORT}`);
});
