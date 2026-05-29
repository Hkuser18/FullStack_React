// In-memory database — seeded with the same data as the React mock
// Data lives only for the lifetime of the server process

const SEED_USERS = [
  { id: 'u1', username: 'teacher1', password: 'pass123', role: 'teacher', name: 'Dr. Smith' },
  { id: 'u2', username: 'teacher2', password: 'pass123', role: 'teacher', name: 'Prof. Cohen' },
  { id: 'u3', username: 'student1', password: 'pass123', role: 'student', name: 'Alice' },
  { id: 'u4', username: 'student2', password: 'pass123', role: 'student', name: 'Bob' },
];

const SEED_EXAMS = [
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

const SEED_ATTEMPTS = [
  { id: 'a1', examId: 'e1', studentId: 'u3', answers: [0, 2, 2, 2], score: 100, passed: true,  startedAt: '2026-02-01T09:00:00.000Z', submittedAt: '2026-02-01T09:14:00.000Z' },
  { id: 'a2', examId: 'e1', studentId: 'u4', answers: [1, 2, 0, 1], score: 25,  passed: false, startedAt: '2026-02-01T10:00:00.000Z', submittedAt: '2026-02-01T10:18:00.000Z' },
  { id: 'a3', examId: 'e2', studentId: 'u3', answers: [1, 0, 1],    score: 100, passed: true,  startedAt: '2026-02-05T09:00:00.000Z', submittedAt: '2026-02-05T09:20:00.000Z' },
];

function deepClone(data) {
  return JSON.parse(JSON.stringify(data));
}

const db = {
  users:    deepClone(SEED_USERS),
  exams:    deepClone(SEED_EXAMS),
  attempts: deepClone(SEED_ATTEMPTS),

  reset() {
    this.users    = deepClone(SEED_USERS);
    this.exams    = deepClone(SEED_EXAMS);
    this.attempts = deepClone(SEED_ATTEMPTS);
  },
};

module.exports = db;
