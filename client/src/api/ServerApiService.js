// ServerApiService - fetch-based API client for the Express server
// All methods return Promises, matching MockApiService's interface exactly.
import Logger from '../services/LoggerService';

const TOKEN_KEY = 'auth_token';
const API_BASE  = import.meta.env.VITE_API_URL ?? '';

export const saveToken  = token => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = ()    => localStorage.removeItem(TOKEN_KEY);
const getToken          = ()    => localStorage.getItem(TOKEN_KEY);

// req() הוא ה"מנוע" המשותף שכל מתודה למטה משתמשת בו - כך שלוגיקת האימות
// וטיפול-השגיאות נכתבת פעם אחת בלבד ולא מועתקת בכל קריאת fetch בנפרד.
async function req(method, path, body) {
  const token = getToken(); // הטוקן שנשמר ב-localStorage אחרי login מוצלח
  const headers = { 'Content-Type': 'application/json' };
  // אם יש טוקן - מצרפים אותו כ-Bearer token; השרת (auth middleware ב-server.js)
  // יאמת אותו בכל בקשה מוגנת. אם אין (למשל בקריאת login עצמה) - פשוט לא נשלח.
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}/api${path}`, opts);
  // fetch לא זורק שגיאה אוטומטית על סטטוס 4xx/5xx (רק על כשל רשת) - res.ok
  // הוא הדרך הנכונה לבדוק הצלחה, ואז זורקים ידנית עם הודעת השגיאה מהשרת.
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json();
}

class ServerApiService {
  // ── Auth ───────────────────────────────────────────────────────────────────

  login(username, password, role) {
    Logger.info('ServerApiService.login', { username, role });
    return req('POST', '/auth/login', { username, password, role });
  }

  addUser(userData) {
    Logger.info('ServerApiService.addUser', { username: userData.username });
    return req('POST', '/auth/register', userData);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  getUsers() {
    return req('GET', '/users');
  }

  getUserById(id) {
    return req('GET', `/users/${id}`);
  }

  // ── Exams ──────────────────────────────────────────────────────────────────

  getExams() {
    return req('GET', '/exams');
  }

  getExamById(id) {
    return req('GET', `/exams/${id}`);
  }

  getExamsByTeacher(teacherId) {
    return req('GET', `/exams/teacher/${teacherId}`);
  }

  getPublishedExams() {
    return req('GET', '/exams/published');
  }

  createExam(examData) {
    Logger.info('ServerApiService.createExam', { title: examData.title });
    return req('POST', '/exams', examData);
  }

  updateExam(id, updates) {
    Logger.info('ServerApiService.updateExam', { id });
    return req('PUT', `/exams/${id}`, updates);
  }

  deleteExam(id) {
    Logger.info('ServerApiService.deleteExam', { id });
    return req('DELETE', `/exams/${id}`);
  }

  setExamStatus(id, status) {
    Logger.info('ServerApiService.setExamStatus', { id, status });
    return req('PATCH', `/exams/${id}/status`, { status });
  }

  // ── Attempts ───────────────────────────────────────────────────────────────

  submitAttempt(attemptData) {
    Logger.info('ServerApiService.submitAttempt', { examId: attemptData.examId });
    return req('POST', '/attempts', attemptData);
  }

  getAttemptsByStudent(studentId) {
    return req('GET', `/attempts/student/${studentId}`);
  }

  getAttemptsByExam(examId) {
    return req('GET', `/attempts/exam/${examId}`);
  }

  async hasAttempted(studentId, examId) {
    const { attempted } = await req('GET', `/attempts/check/${studentId}/${examId}`);
    return attempted;
  }

  gradeAttempt(id, data) {
    Logger.info('ServerApiService.gradeAttempt', { id });
    return req('PATCH', `/attempts/${id}`, data);
  }

  // ── Question Bank ──────────────────────────────────────────────────────────

  getQuestions() {
    return req('GET', '/questions');
  }

  getQuestionsByTeacher(teacherId) {
    return req('GET', `/questions/teacher/${teacherId}`);
  }

  addQuestion(data) {
    Logger.info('ServerApiService.addQuestion', { type: data.type });
    return req('POST', '/questions', data);
  }

  updateQuestion(id, data) {
    Logger.info('ServerApiService.updateQuestion', { id });
    return req('PUT', `/questions/${id}`, data);
  }

  deleteQuestion(id) {
    Logger.info('ServerApiService.deleteQuestion', { id });
    return req('DELETE', `/questions/${id}`);
  }

  async generateQuestions({ topic, count, type }) {
    Logger.info('ServerApiService.generateQuestions', { topic, count, type });
    const { questions } = await req('POST', '/questions/generate', { topic, count, type });
    return questions;
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  getPendingTeachers() {
    return req('GET', '/admin/teachers/pending');
  }

  approveTeacher(id) {
    return req('PATCH', `/admin/teachers/${id}/approve`);
  }

  rejectTeacher(id) {
    return req('PATCH', `/admin/teachers/${id}/reject`);
  }

  // ── Utility ────────────────────────────────────────────────────────────────

  resetDatabase() {
    Logger.warn('ServerApiService: resetting database');
    return req('POST', '/db/reset');
  }
}

export default new ServerApiService();
