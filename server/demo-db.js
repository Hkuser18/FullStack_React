import pool from './db.js';

const LINE = '─'.repeat(60);

// ── Part 1: Connectivity ──────────────────────────────────────────
async function checkConnectivity(client) {
  console.log('\n' + LINE);
  console.log('  PART 1 — Connectivity Check');
  console.log(LINE);

  const res = await client.query('SELECT NOW() AS server_time, current_database() AS db, version()');
  const { server_time, db, version } = res.rows[0];

  console.log(`  Server time : ${server_time}`);
  console.log(`  Database    : ${db}`);
  console.log(`  PG version  : ${version.split(',')[0]}`);
  console.log('  Status      : Connected');
}

// ── Part 2: Query users and exams ────────────────────────────────
async function queryUsersAndExams(client) {
  console.log('\n' + LINE);
  console.log('  PART 2 — Users & Exams from the Database');
  console.log(LINE);

  // Users
  const usersRes = await client.query(
    'SELECT id, username, role, name FROM users ORDER BY id'
  );
  console.log(`\n  USERS (${usersRes.rowCount} rows):`);
  console.table(usersRes.rows);

  // Exams
  const examsRes = await client.query(
    `SELECT id, title, status, duration, passing_score,
            jsonb_array_length(questions) AS num_questions
     FROM exams
     ORDER BY created_at`
  );
  console.log(`  EXAMS (${examsRes.rowCount} rows):`);
  console.table(examsRes.rows);
}

// ── Part 3: JSONB — loop over questions of one exam ──────────────
async function loopQuestions(client) {
  console.log('\n' + LINE);
  console.log('  PART 3 — JSONB Loop: Questions of "JavaScript Basics" (e1)');
  console.log(LINE);

  const res = await client.query(
    `SELECT jsonb_array_elements(questions) AS question
     FROM exams
     WHERE id = 'e1'`
  );

  console.log(`\n  Found ${res.rowCount} questions:\n`);

  res.rows.forEach((row, index) => {
    const q = row.question;            // already a JS object (pg parses JSONB)
    console.log(`  Q${index + 1} [${q.id}]: ${q.text}`);
    q.options.forEach((opt, i) => {
      const marker = i === q.correctOption ? '✔' : ' ';
      console.log(`       ${marker} ${i}: ${opt}`);
    });
    console.log();
  });
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  const client = await pool.connect();
  try {
    await checkConnectivity(client);
    await queryUsersAndExams(client);
    await loopQuestions(client);

    console.log(LINE);
    console.log('  Demo complete.');
    console.log(LINE + '\n');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
