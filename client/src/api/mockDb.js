
export const exams = [
  {
    id: '1',
    title: 'JavaScript Basics',
    questions: [
      { id: 'q1', text: 'What is a closure?', options: ['A function with its lexical environment', 'A way to close a file', 'A loop type'], correctOption: 0 },
      { id: 'q2', text: 'Which keyword is used for constants?', options: ['var', 'let', 'const'], correctOption: 2 }
    ]
  },
  {
    id: '2',
    title: 'React Fundamentals',
    questions: [
      { id: 'q1', text: 'What hook is used for state?', options: ['useEffect', 'useState', 'useContext'], correctOption: 1 },
      { id: 'q2', text: 'What is JSX?', options: ['JavaScript XML', 'A CSS library', 'A database'], correctOption: 0 }
    ]
  }
];

export const studentScores = [
  { studentId: 's1', examId: '1', score: 80 },
  { studentId: 's2', examId: '1', score: 95 }
];
