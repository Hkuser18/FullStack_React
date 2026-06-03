import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3002;
const BASE = `http://localhost:${PORT}`;

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  const data = await res.json();
  console.log(`GET ${path} → ${res.status}`);
  console.dir(data, { depth: null });
  return data;
}

const exams = await get('/api/exams');
console.log(`\n✅ ${exams.length} exams returned`);
