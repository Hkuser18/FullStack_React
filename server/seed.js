import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';
import pool, { SEED_USERS, SEED_EXAMS, SEED_ATTEMPTS } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BCRYPT_ROUNDS = 10;

async function seed() {
  const client = await pool.connect();
  try {
    console.log('📦 Applying schema...');
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✅ Schema ready');

    console.log('🌱 Seeding users...');
    for (const u of SEED_USERS)
      await client.query(
        `INSERT INTO users (id, username, password, role, name)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [u.id, u.username, await bcrypt.hash(u.password, BCRYPT_ROUNDS), u.role, u.name]
      );

    console.log('🌱 Seeding exams...');
    for (const e of SEED_EXAMS)
      await client.query(
        `INSERT INTO exams (id, title, description, status, created_by, duration, passing_score, created_at, questions)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [e.id, e.title, e.description, e.status, e.createdBy,
         e.duration, e.passingScore, e.createdAt, JSON.stringify(e.questions)]
      );

    console.log('🌱 Seeding attempts...');
    for (const a of SEED_ATTEMPTS)
      await client.query(
        `INSERT INTO attempts (id, exam_id, student_id, answers, score, passed, started_at, submitted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [a.id, a.examId, a.studentId, JSON.stringify(a.answers),
         a.score, a.passed, a.startedAt, a.submittedAt]
      );

    console.log('✅ Database seeded successfully');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
