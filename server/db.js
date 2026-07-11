import pg from 'pg';
import dotenv from 'dotenv';
// dotenv.config() טוען משתני סביבה מקובץ .env לתוך process.env - אבל רק אם המשתנה
// עוד לא קיים שם. אם מריצים את השרת עם DATABASE_URL שהוגדר ידנית מבחוץ (לדוגמה
// לבדיקות מול DB זמני), הערך החיצוני "מנצח" ולא נדרס ע"י מה שכתוב בקובץ .env.
dotenv.config();
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/exam_app';

// Render (and most other hosted Postgres) requires SSL; local/Docker Compose Postgres doesn't
// support it at all. DATABASE_SSL lets an environment (e.g. docker-compose.yml) override the
// hostname-based guess explicitly instead of us trying to enumerate every "this is local" host.
// כלומר: אם מתחברים ל-localhost מניחים סביבת פיתוח מקומית (בלי SSL), אחרת מניחים
// שירות ענן מרוחק (עם SSL) - ניתן לעקוף את הניחוש הזה במפורש עם DATABASE_SSL.
const useSSL = process.env.DATABASE_SSL
  ? process.env.DATABASE_SSL === 'true'
  : !connectionString.includes('localhost');

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('🔌 Database connected successfully at:', res.rows[0].now);
  }
});

// ── Seed data (used by /api/db/reset) ─────────────────────────────────────────
// הנתונים למטה הם "דאטה לדוגמה" קבועה - משמשים גם את seed.js (מילוי DB ראשוני
// בפריסה חדשה) וגם את /api/db/reset בשרת (איפוס ל-DB נקי בזמן פיתוח/דמו).
// שימו לב: הסיסמאות כאן ('pass123') הן טקסט גלוי רק במשתנה הזה - בפועל הן
// עוברות דרך bcrypt.hash() לפני שהן נכתבות ל-DB, אף פעם לא נשמרות כמו שהן.

export const SEED_USERS = [
  { id: 'u0', username: 'admin',    password: 'pass123', role: 'admin',   name: 'Admin',       status: 'active' },
  { id: 'u1', username: 'teacher1', password: 'pass123', role: 'teacher', name: 'Dr. Smith',   status: 'active' },
  { id: 'u2', username: 'teacher2', password: 'pass123', role: 'teacher', name: 'Prof. Cohen', status: 'active' },
  { id: 'u3', username: 'student1', password: 'pass123', role: 'student', name: 'Alice',       status: 'active' },
  { id: 'u4', username: 'student2', password: 'pass123', role: 'student', name: 'Bob',         status: 'active' },
];

export const SEED_EXAMS = [
  {
    id: 'e1', title: 'JavaScript Basics', description: 'Test your knowledge of core JS concepts.',
    status: 'published', createdBy: 'u1', duration: 20, passingScore: 60,
    createdAt: '2026-01-10T10:00:00.000Z',
    questions: [
      { id: 'q1', text: 'What is a closure?', options: ['A function with its lexical environment', 'A way to close a file', 'A loop type', 'A CSS property'], correctOption: 0 },
      { id: 'q2', text: 'Which keyword declares a constant?', options: ['var', 'let', 'const', 'def'], correctOption: 2 },
      { id: 'q3', text: 'What does === check?', options: ['Value only', 'Type only', 'Value and type', 'Reference equality'], correctOption: 2 },
      { id: 'q4', text: 'What is the output of typeof null?', options: ['"null"', '"undefined"', '"object"', '"boolean"'], correctOption: 2 },
    ],
  },
  {
    id: 'e2', title: 'React Fundamentals', description: 'Core React concepts and hooks.',
    status: 'published', createdBy: 'u1', duration: 25, passingScore: 70,
    createdAt: '2026-01-15T10:00:00.000Z',
    questions: [
      { id: 'q1', text: 'Which hook manages local state?', options: ['useEffect', 'useState', 'useContext', 'useRef'], correctOption: 1 },
      { id: 'q2', text: 'What is JSX?', options: ['JavaScript XML', 'A CSS library', 'A database', 'A server framework'], correctOption: 0 },
      { id: 'q3', text: 'What does useEffect do?', options: ['Manages state', 'Runs side effects', 'Creates context', 'Renders elements'], correctOption: 1 },
    ],
  },
  {
    id: 'e3', title: 'HTML & CSS Basics', description: 'Web fundamentals quiz.',
    status: 'draft', createdBy: 'u2', duration: 15, passingScore: 60,
    createdAt: '2026-02-01T10:00:00.000Z',
    questions: [
      { id: 'q1', text: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyperlink Text Model Logic', 'Home Tool Markup Language'], correctOption: 0 },
      { id: 'q2', text: 'Which CSS property changes text color?', options: ['background-color', 'font-size', 'color', 'text-style'], correctOption: 2 },
    ],
  },
  {
    id: 'e4', title: 'Git Version Control', description: 'Test your Git knowledge.',
    status: 'closed', createdBy: 'u2', duration: 20, passingScore: 65,
    createdAt: '2026-01-20T10:00:00.000Z',
    questions: [
      { id: 'q1', text: 'What does git commit do?', options: ['Pushes to remote', 'Saves a snapshot locally', 'Creates a branch', 'Merges branches'], correctOption: 1 },
      { id: 'q2', text: 'What is a branch in Git?', options: ['A tag', 'A copy of the repo', 'A pointer to a commit', 'A remote connection'], correctOption: 2 },
      { id: 'q3', text: 'Which command stages changes?', options: ['git commit', 'git push', 'git add', 'git pull'], correctOption: 2 },
    ],
  },
];

export const SEED_QUESTION_BANK = [
  {
    id: 'qb1', text: 'What is a closure in JavaScript?', type: 'open',
    keywords: ['closure', 'lexical', 'scope', 'function', 'environment'],
    topic: 'JavaScript', createdBy: 'u1', createdAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'qb2', text: 'Which keyword declares a block-scoped variable?',
    type: 'multiple-choice',
    options: ['var', 'let', 'const', 'def'], correctOption: 1,
    topic: 'JavaScript', createdBy: 'u1', createdAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'qb3', text: 'What does the useEffect hook do in React?', type: 'open',
    keywords: ['side effect', 'effect', 'lifecycle', 'render', 'cleanup'],
    topic: 'React', createdBy: 'u1', createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'qb4', text: 'What does HTML stand for?',
    type: 'multiple-choice',
    options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyperlink Model Logic', 'Home Tool Markup Language'],
    correctOption: 0,
    topic: 'HTML', createdBy: 'u2', createdAt: '2026-02-01T10:00:00.000Z',
  },
  {
    id: 'qb5', text: 'Explain what a Git branch is and why it is useful.', type: 'open',
    keywords: ['branch', 'pointer', 'commit', 'parallel', 'independent', 'feature'],
    topic: 'Git', createdBy: 'u2', createdAt: '2026-01-20T10:00:00.000Z',
  },
];

export const SEED_ATTEMPTS = [
  { id: 'a1', examId: 'e1', studentId: 'u3', answers: [0, 2, 2, 2], score: 100, passed: true,  startedAt: '2026-02-01T09:00:00.000Z', submittedAt: '2026-02-01T09:14:00.000Z' },
  { id: 'a2', examId: 'e1', studentId: 'u4', answers: [1, 2, 0, 1], score: 25,  passed: false, startedAt: '2026-02-01T10:00:00.000Z', submittedAt: '2026-02-01T10:18:00.000Z' },
  { id: 'a3', examId: 'e2', studentId: 'u3', answers: [1, 0, 1],    score: 100, passed: true,  startedAt: '2026-02-05T09:00:00.000Z', submittedAt: '2026-02-05T09:20:00.000Z' },
];

export default pool;
