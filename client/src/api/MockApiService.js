// MockApiService - מסד נתונים ו-API מדומים (Mock) לפיתוח ללא שרת
// כל הנתונים נשמרים בזיכרון (in-memory) ומסונכרנים ל-localStorage בכל שינוי
// כך הנתונים שורדים ריענון של הדף אבל נמחקים אם המשתמש מנקה את האחסון
// פונקציות מחזירות Promise עם עיכוב מלאכותי - מדמות API אמיתי עם רשת
import { SEED_USERS, SEED_EXAMS, SEED_ATTEMPTS } from './mockDb';
import Storage   from '../services/StorageService';
import Logger    from '../services/LoggerService';
import Config    from '../services/ConfigService';

// Enum לסטטוסי מבחן - שימוש בקבועים מונע שגיאות כתיב
export const ExamStatus = { DRAFT: 'draft', PUBLISHED: 'published', CLOSED: 'closed' };

class MockApiService {
  constructor() {
    if (MockApiService._instance) return MockApiService._instance;
    this._load();
    MockApiService._instance = this;
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  _load() {
    // ?? - אם localStorage ריק, טוען נתוני seed התחלתיים
    // structuredClone - עותק עמוק כדי שהשינויים בזיכרון לא ישפיעו על ה-seed
    this._users    = Storage.get('db_users',    null) ?? structuredClone(SEED_USERS);
    this._exams    = Storage.get('db_exams',    null) ?? structuredClone(SEED_EXAMS);
    this._attempts = Storage.get('db_attempts', null) ?? structuredClone(SEED_ATTEMPTS);
    Logger.info('MockApiService loaded', {
      users: this._users.length, exams: this._exams.length, attempts: this._attempts.length,
    });
  }

  _persist() {
    Storage.set('db_users',    this._users);
    Storage.set('db_exams',    this._exams);
    Storage.set('db_attempts', this._attempts);
  }

  // Wraps sync fn in a delayed Promise, matching a real API feel
  _async(fn) {
    return new Promise((resolve, reject) =>
      setTimeout(() => { try { resolve(fn()); } catch (e) { reject(e); } },
        Config.get('apiDelay') ?? 400)
    );
  }

  resetDatabase() {
    this._users    = structuredClone(SEED_USERS);
    this._exams    = structuredClone(SEED_EXAMS);
    this._attempts = structuredClone(SEED_ATTEMPTS);
    this._persist();
    Logger.warn('MockApiService: database reset to seed data');
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  getUsers() {
    return this._async(() => this._users.map(u => this._safeUser(u)));
  }

  getUserById(id) {
    return this._async(() => {
      const u = this._users.find(u => u.id === id);
      if (!u) throw new Error(`User not found: ${id}`);
      return this._safeUser(u);
    });
  }

  login(username, password, role) {
    return this._async(() => {
      const match = this._users.find(
        u => u.username === username && u.password === password && u.role === role
      );
      if (!match) throw new Error('Invalid credentials');
      return this._safeUser(match);
    });
  }

  addUser(userData) {
    return this._async(() => {
      if (this._users.find(u => u.username === userData.username))
        throw new Error('Username already taken');
      const newUser = { ...userData, id: `u_${Date.now()}` };
      this._users.push(newUser);
      Storage.set('db_users', this._users);
      Logger.info('MockApiService.addUser', { username: userData.username });
      return this._safeUser(newUser);
    });
  }

  _safeUser(u) {
    const { password, ...safe } = u;  // eslint-disable-line no-unused-vars
    return safe;
  }

  // ── Exams ─────────────────────────────────────────────────────────────────

  getExams() {
    return this._async(() => structuredClone(this._exams));
  }

  getExamById(id) {
    return this._async(() => {
      const e = this._exams.find(e => e.id === id);
      if (!e) throw new Error(`Exam not found: ${id}`);
      return structuredClone(e);
    });
  }

  getExamsByTeacher(teacherId) {
    return this._async(() =>
      structuredClone(this._exams.filter(e => e.createdBy === teacherId))
    );
  }

  getPublishedExams() {
    return this._async(() =>
      structuredClone(this._exams.filter(e => e.status === ExamStatus.PUBLISHED))
    );
  }

  createExam(examData) {
    return this._async(() => {
      const newExam = {
        title:       'Untitled Exam',
        description: '',
        duration:    Config.get('exam.defaultDuration') ?? 30,
        passingScore: Config.get('exam.passingScore')  ?? 60,
        ...examData,
        id:        `e_${Date.now()}`,
        status:    ExamStatus.DRAFT,
        createdAt: new Date().toISOString(),
        questions: examData.questions ?? [],
      };
      this._exams.push(newExam);
      Storage.set('db_exams', this._exams);
      Logger.info('MockApiService.createExam', { title: newExam.title });
      return structuredClone(newExam);
    });
  }

  updateExam(id, updates) {
    return this._async(() => {
      const idx = this._exams.findIndex(e => e.id === id);
      if (idx === -1) throw new Error(`Exam not found: ${id}`);
      // Prevent overwriting id, status, createdBy via updates
      const { id: _id, status, createdBy, createdAt, ...safe } = updates; // eslint-disable-line no-unused-vars
      this._exams[idx] = { ...this._exams[idx], ...safe };
      Storage.set('db_exams', this._exams);
      Logger.info('MockApiService.updateExam', { id });
      return structuredClone(this._exams[idx]);
    });
  }

  deleteExam(id) {
    return this._async(() => {
      const idx = this._exams.findIndex(e => e.id === id);
      if (idx === -1) throw new Error(`Exam not found: ${id}`);
      this._exams.splice(idx, 1);
      Storage.set('db_exams', this._exams);
      Logger.info('MockApiService.deleteExam', { id });
      return true;
    });
  }

  setExamStatus(id, status) {
    return this._async(() => {
      if (!Object.values(ExamStatus).includes(status))
        throw new Error(`Invalid status: ${status}`);
      const idx = this._exams.findIndex(e => e.id === id);
      if (idx === -1) throw new Error(`Exam not found: ${id}`);
      this._exams[idx].status = status;
      Storage.set('db_exams', this._exams);
      Logger.info('MockApiService.setExamStatus', { id, status });
      return structuredClone(this._exams[idx]);
    });
  }

  // ── Attempts ──────────────────────────────────────────────────────────────

  submitAttempt(attemptData) {
    return this._async(() => {
      const exam = this._exams.find(e => e.id === attemptData.examId);
      if (!exam) throw new Error('Exam not found');

      const correct = attemptData.answers.reduce(
        (acc, ans, i) => acc + (ans === exam.questions[i]?.correctOption ? 1 : 0), 0
      );
      const score  = Math.round((correct / exam.questions.length) * 100);
      const passed = score >= (exam.passingScore ?? 60);

      const attempt = {
        ...attemptData,
        id:          `a_${Date.now()}`,
        score,
        passed,
        submittedAt: new Date().toISOString(),
      };
      this._attempts.push(attempt);
      Storage.set('db_attempts', this._attempts);
      Logger.info('MockApiService.submitAttempt', { examId: attempt.examId, score, passed });
      return structuredClone(attempt);
    });
  }

  getAttemptsByStudent(studentId) {
    return this._async(() =>
      structuredClone(this._attempts.filter(a => a.studentId === studentId))
    );
  }

  getAttemptsByExam(examId) {
    return this._async(() =>
      structuredClone(this._attempts.filter(a => a.examId === examId))
    );
  }

  hasAttempted(studentId, examId) {
    return this._async(() =>
      this._attempts.some(a => a.studentId === studentId && a.examId === examId)
    );
  }
}

export default new MockApiService();
