import dotenv from 'dotenv';
import assert from 'node:assert/strict';
dotenv.config();

const PORT = process.env.PORT || 3002;
const BASE = `http://localhost:${PORT}`;

async function login(username, password, role) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role }),
  });
  const data = await res.json();
  assert.equal(res.status, 200, `login failed: ${JSON.stringify(data)}`);
  assert.ok(data.token, 'login response missing token');
  return data.token;
}

async function getExams(token) {
  const res = await fetch(`${BASE}/api/exams`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, data: await res.json() };
}

// 1. Unauthenticated request is rejected
{
  const { status } = await getExams();
  assert.equal(status, 401, 'unauthenticated /api/exams should return 401');
  console.log('✅ unauthenticated request rejected');
}

// 2. Wrong password is rejected
{
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'teacher1', password: 'wrong', role: 'teacher' }),
  });
  assert.equal(res.status, 401, 'wrong password should return 401');
  console.log('✅ wrong password rejected');
}

// 3. Login as seeded teacher and list exams
const token = await login('teacher1', 'pass123', 'teacher');
console.log('✅ login succeeded, token received');

const { status, data: exams } = await getExams(token);
assert.equal(status, 200);
assert.ok(Array.isArray(exams), 'expected an array of exams');
assert.ok(exams.length > 0, 'expected at least one seeded exam');
console.log(`✅ ${exams.length} exams returned for authenticated teacher`);

console.log('\n✅ API smoke test passed');
