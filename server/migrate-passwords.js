import bcrypt from 'bcryptjs';
import pool from './db.js';

const BCRYPT_ROUNDS = 10;
const isBcryptHash = (value) => /^\$2[aby]\$/.test(value);

async function migratePasswords() {
  const { rows } = await pool.query('SELECT id, username, password FROM users');

  const plaintextUsers = rows.filter((u) => !isBcryptHash(u.password));
  console.log(`Found ${rows.length} users, ${plaintextUsers.length} with plaintext passwords.`);

  for (const u of plaintextUsers) {
    const hash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hash, u.id]);
    console.log(`  rehashed ${u.username}`);
  }

  console.log('Done.');
}

migratePasswords()
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
