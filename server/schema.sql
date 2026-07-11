-- ── Tables ────────────────────────────────────────────────────────────────────
-- Pure DDL. Seed data lives in db.js / seed.js (bcrypt-hashes passwords at
-- insert time) — do not add INSERT statements here, they'd drift out of sync.

CREATE TABLE IF NOT EXISTS users (
  id       TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role     TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  name     TEXT NOT NULL,
  status   TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending'))
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
  start_date    TIMESTAMPTZ,
  end_date      TIMESTAMPTZ,
  questions     JSONB       NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS attempts (
  id           TEXT        PRIMARY KEY,
  exam_id      TEXT        NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id   TEXT        NOT NULL REFERENCES users(id),
  answers      JSONB       NOT NULL DEFAULT '[]',
  score        INT         NOT NULL,
  passed       BOOLEAN     NOT NULL,
  feedback     TEXT,
  started_at   TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tab_switch_count INT NOT NULL DEFAULT 0
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
