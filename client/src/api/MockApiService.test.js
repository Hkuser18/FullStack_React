import Api, { ExamStatus } from './MockApiService';

// Replace the async delay wrapper with an immediate Promise so tests don't need fake timers
const mockAsync = fn => new Promise((resolve, reject) => {
  try { resolve(fn()); } catch (e) { reject(e); }
});

describe('MockApiService', () => {
  beforeEach(() => {
    vi.spyOn(Api, '_async').mockImplementation(mockAsync);
    Api.resetDatabase();
  });
  afterEach(() => vi.restoreAllMocks());

  // ── Users ────────────────────────────────────────────────────────────────

  test('getUsers returns all seed users without passwords', async () => {
    const users = await Api.getUsers();
    expect(users.length).toBe(4);
    users.forEach(u => expect(u).not.toHaveProperty('password'));
  });

  test('login returns matching user without password', async () => {
    const user = await Api.login('teacher1', 'pass123', 'teacher');
    expect(user.id).toBe('u1');
    expect(user).not.toHaveProperty('password');
  });

  test('login throws for wrong password', async () => {
    await expect(Api.login('teacher1', 'wrong', 'teacher')).rejects.toThrow('Invalid credentials');
  });

  test('login throws for wrong role', async () => {
    await expect(Api.login('teacher1', 'pass123', 'student')).rejects.toThrow('Invalid credentials');
  });

  test('addUser creates a new user and returns it without a password', async () => {
    const user = await Api.addUser({ username: 'newuser', password: '1234', role: 'student', name: 'New' });
    expect(user.username).toBe('newuser');
    expect(user.id).toBeDefined();
    expect(user).not.toHaveProperty('password');
  });

  test('addUser throws when username is already taken', async () => {
    await expect(
      Api.addUser({ username: 'teacher1', password: '1234', role: 'teacher', name: 'Dup' })
    ).rejects.toThrow('Username already taken');
  });

  // ── Exams ────────────────────────────────────────────────────────────────

  test('getPublishedExams returns only published exams', async () => {
    const exams = await Api.getPublishedExams();
    expect(exams.length).toBeGreaterThan(0);
    expect(exams.every(e => e.status === ExamStatus.PUBLISHED)).toBe(true);
  });

  test('getExamsByTeacher filters by teacher id', async () => {
    const exams = await Api.getExamsByTeacher('u1');
    expect(exams.every(e => e.createdBy === 'u1')).toBe(true);
    expect(exams.length).toBeGreaterThan(0);
  });

  test('createExam creates a draft exam with a generated id', async () => {
    const exam = await Api.createExam({ title: 'Brand New', createdBy: 'u1', questions: [] });
    expect(exam.id).toBeDefined();
    expect(exam.status).toBe(ExamStatus.DRAFT);
    expect(exam.title).toBe('Brand New');
  });

  test('updateExam updates allowed fields but ignores status and createdBy', async () => {
    const updated = await Api.updateExam('e1', { title: 'Renamed', status: 'closed', createdBy: 'u999' });
    expect(updated.title).toBe('Renamed');
    expect(updated.status).not.toBe('closed');
    expect(updated.createdBy).toBe('u1');
  });

  test('deleteExam removes the exam so getExamById rejects', async () => {
    await Api.deleteExam('e1');
    await expect(Api.getExamById('e1')).rejects.toThrow('Exam not found');
  });

  test('setExamStatus changes a draft exam to published', async () => {
    const exam = await Api.setExamStatus('e3', ExamStatus.PUBLISHED);
    expect(exam.status).toBe(ExamStatus.PUBLISHED);
  });

  test('setExamStatus throws for an unrecognized status value', async () => {
    await expect(Api.setExamStatus('e1', 'limbo')).rejects.toThrow('Invalid status');
  });

  // ── Score calculation ─────────────────────────────────────────────────────

  test('submitAttempt scores 100% for all correct answers', async () => {
    // e1 correctOptions: [0, 2, 2, 2]
    const attempt = await Api.submitAttempt({
      examId: 'e1', studentId: 'u_x',
      answers: [0, 2, 2, 2],
      startedAt: new Date().toISOString(),
    });
    expect(attempt.score).toBe(100);
    expect(attempt.passed).toBe(true);
  });

  test('submitAttempt scores 0% for all wrong answers', async () => {
    const attempt = await Api.submitAttempt({
      examId: 'e1', studentId: 'u_x',
      answers: [3, 3, 3, 3],
      startedAt: new Date().toISOString(),
    });
    expect(attempt.score).toBe(0);
    expect(attempt.passed).toBe(false);
  });

  test('submitAttempt scores 50% for 2 out of 4 correct', async () => {
    // e1: correctOptions [0, 2, 2, 2] — [0, 2, 1, 1] = 2 correct
    const attempt = await Api.submitAttempt({
      examId: 'e1', studentId: 'u_x',
      answers: [0, 2, 1, 1],
      startedAt: new Date().toISOString(),
    });
    expect(attempt.score).toBe(50);
    expect(attempt.passed).toBe(false); // passingScore is 60
  });

  test('submitAttempt marks passed=true when score meets passingScore', async () => {
    // e2: 3 questions, correctOptions [1, 0, 1], passingScore 70 — 3/3 = 100%
    const attempt = await Api.submitAttempt({
      examId: 'e2', studentId: 'u_x',
      answers: [1, 0, 1],
      startedAt: new Date().toISOString(),
    });
    expect(attempt.passed).toBe(true);
  });

  test('submitAttempt treats -1 (unanswered) as a wrong answer', async () => {
    const attempt = await Api.submitAttempt({
      examId: 'e1', studentId: 'u_x',
      answers: [-1, -1, -1, -1],
      startedAt: new Date().toISOString(),
    });
    expect(attempt.score).toBe(0);
  });

  // ── Attempts ──────────────────────────────────────────────────────────────

  test('hasAttempted returns false before any submission', async () => {
    expect(await Api.hasAttempted('u4', 'e2')).toBe(false);
  });

  test('hasAttempted returns true after a submission', async () => {
    await Api.submitAttempt({
      examId: 'e2', studentId: 'u4',
      answers: [1, 0, 1],
      startedAt: new Date().toISOString(),
    });
    expect(await Api.hasAttempted('u4', 'e2')).toBe(true);
  });

  test('getAttemptsByStudent returns only that student\'s attempts', async () => {
    const attempts = await Api.getAttemptsByStudent('u3');
    expect(attempts.every(a => a.studentId === 'u3')).toBe(true);
  });

  test('getAttemptsByExam returns only attempts for that exam', async () => {
    const attempts = await Api.getAttemptsByExam('e1');
    expect(attempts.every(a => a.examId === 'e1')).toBe(true);
  });
});
