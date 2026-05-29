// ServerApiService - fetch-based API client for the Express server (port 3001)
// All methods return Promises, matching MockApiService's interface exactly.
import Logger from '../services/LoggerService';

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`/api${path}`, opts);
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

  // ── Utility ────────────────────────────────────────────────────────────────

  resetDatabase() {
    Logger.warn('ServerApiService: resetting database');
    return req('POST', '/db/reset');
  }
}

export default new ServerApiService();
