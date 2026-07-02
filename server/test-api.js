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

// 4. AI question generation: validation and role-guard don't require a real API key
async function generate(token, body) {
  const res = await fetch(`${BASE}/api/questions/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

{
  const { status } = await generate(token, { count: 3 }); // missing topic
  assert.equal(status, 400, 'missing topic should return 400');
}
{
  const { status } = await generate(token, { topic: 'Physics', count: 0 });
  assert.equal(status, 400, 'count=0 should return 400');
}
{
  const { status } = await generate(token, { topic: 'Physics', count: 3, type: 'essay' });
  assert.equal(status, 400, 'invalid type should return 400');
}
console.log('✅ AI generation input validation rejects bad requests');

const studentToken = await login('student1', 'pass123', 'student');
{
  const { status } = await generate(studentToken, { topic: 'Physics', count: 3 });
  assert.equal(status, 403, 'student should not be able to generate questions');
}
console.log('✅ AI generation route rejects non-teacher roles');

if (!process.env.ANTHROPIC_API_KEY) {
  const { status, data } = await generate(token, { topic: 'Physics', count: 3 });
  assert.equal(status, 503, 'without ANTHROPIC_API_KEY, generation should return 503');
  assert.ok(data.error, 'expected an error message');
  console.log('✅ AI generation reports 503 when ANTHROPIC_API_KEY is not configured');
}

console.log('\n✅ API smoke test passed');
