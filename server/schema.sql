-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id       TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role     TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  name     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exams (
  id            TEXT PRIMARY KEY,
  title         TEXT        NOT NULL,
  description   TEXT        NOT NULL DEFAULT '',
  status        TEXT        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'published', 'closed')),
  created_by    TEXT        NOT NULL REFERENCES users(id),
  duration      INT         NOT NULL,
  passing_score INT         NOT NULL DEFAULT 60,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  questions     JSONB       NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS attempts (
  id           TEXT        PRIMARY KEY,
  exam_id      TEXT        NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id   TEXT        NOT NULL REFERENCES users(id),
  answers      JSONB       NOT NULL DEFAULT '[]',
  score        INT         NOT NULL,
  passed       BOOLEAN     NOT NULL,
  started_at   TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_question_bank_created_by ON question_bank(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_created_by  ON exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_status      ON exams(status);
CREATE INDEX IF NOT EXISTS idx_attempts_exam     ON attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student  ON attempts(student_id);

-- ── Seed data ─────────────────────────────────────────────────────────────────

INSERT INTO users (id, username, password, role, name) VALUES
  ('u1', 'teacher1', 'pass123', 'teacher', 'Dr. Smith'),
  ('u2', 'teacher2', 'pass123', 'teacher', 'Prof. Cohen'),
  ('u3', 'student1', 'pass123', 'student', 'Alice'),
  ('u4', 'student2', 'pass123', 'student', 'Bob')
ON CONFLICT (id) DO NOTHING;

INSERT INTO exams (id, title, description, status, created_by, duration, passing_score, created_at, questions) VALUES
(
  'e1', 'JavaScript Basics', 'Test your knowledge of core JS concepts.',
  'published', 'u1', 20, 60, '2026-01-10T10:00:00.000Z',
  '[
    {"id":"q1","text":"What is a closure?","options":["A function with its lexical environment","A way to close a file","A loop type","A CSS property"],"correctOption":0},
    {"id":"q2","text":"Which keyword declares a constant?","options":["var","let","const","def"],"correctOption":2},
    {"id":"q3","text":"What does === check?","options":["Value only","Type only","Value and type","Reference equality"],"correctOption":2},
    {"id":"q4","text":"What is the output of typeof null?","options":["\"null\"","\"undefined\"","\"object\"","\"boolean\""],"correctOption":2}
  ]'
),
(
  'e2', 'React Fundamentals', 'Core React concepts and hooks.',
  'published', 'u1', 25, 70, '2026-01-15T10:00:00.000Z',
  '[
    {"id":"q1","text":"Which hook manages local state?","options":["useEffect","useState","useContext","useRef"],"correctOption":1},
    {"id":"q2","text":"What is JSX?","options":["JavaScript XML","A CSS library","A database","A server framework"],"correctOption":0},
    {"id":"q3","text":"What does useEffect do?","options":["Manages state","Runs side effects","Creates context","Renders elements"],"correctOption":1}
  ]'
),
(
  'e3', 'HTML & CSS Basics', 'Web fundamentals quiz.',
  'draft', 'u2', 15, 60, '2026-02-01T10:00:00.000Z',
  '[
    {"id":"q1","text":"What does HTML stand for?","options":["Hyper Text Markup Language","High Tech Modern Language","Hyperlink Text Model Logic","Home Tool Markup Language"],"correctOption":0},
    {"id":"q2","text":"Which CSS property changes text color?","options":["background-color","font-size","color","text-style"],"correctOption":2}
  ]'
),
(
  'e4', 'Git Version Control', 'Test your Git knowledge.',
  'closed', 'u2', 20, 65, '2026-01-20T10:00:00.000Z',
  '[
    {"id":"q1","text":"What does git commit do?","options":["Pushes to remote","Saves a snapshot locally","Creates a branch","Merges branches"],"correctOption":1},
    {"id":"q2","text":"What is a branch in Git?","options":["A tag","A copy of the repo","A pointer to a commit","A remote connection"],"correctOption":2},
    {"id":"q3","text":"Which command stages changes?","options":["git commit","git push","git add","git pull"],"correctOption":2}
  ]'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO attempts (id, exam_id, student_id, answers, score, passed, started_at, submitted_at) VALUES
  ('a1', 'e1', 'u3', '[0,2,2,2]', 100, true,  '2026-02-01T09:00:00.000Z', '2026-02-01T09:14:00.000Z'),
  ('a2', 'e1', 'u4', '[1,2,0,1]', 25,  false, '2026-02-01T10:00:00.000Z', '2026-02-01T10:18:00.000Z'),
  ('a3', 'e2', 'u3', '[1,0,1]',   100, true,  '2026-02-05T09:00:00.000Z', '2026-02-05T09:20:00.000Z')
ON CONFLICT (id) DO NOTHING;
