import { describe, it, expect, beforeEach, vi } from 'vitest';
import Api, { ExamStatus } from './MockApiService';
import Storage from '../services/StorageService';

// We'll mock StorageService to avoid real localStorage calls
vi.mock('../services/StorageService', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
  }
}));

// Mock Logger and Config
vi.mock('../services/LoggerService');
vi.mock('../services/ConfigService', () => ({
  default: {
    get: vi.fn().mockReturnValue(0), // Set delay to 0 for tests
  }
}));

describe('MockApiService - Teacher Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Initialize the API with some data
    Api._users = [{ id: 't1', username: 'teacher1', role: 'teacher' }];
    Api._exams = [
      { id: 'e1', title: 'Exam 1', createdBy: 't1', status: ExamStatus.DRAFT },
      { id: 'e2', title: 'Exam 2', createdBy: 't2', status: ExamStatus.PUBLISHED }
    ];
  });

  it('should fetch exams created by a specific teacher', async () => {
    const teacherExams = await Api.getExamsByTeacher('t1');
    expect(teacherExams).toHaveLength(1);
    expect(teacherExams[0].id).toBe('e1');
  });

  it('should create a new exam with default values', async () => {
    const examData = { title: 'New Test Exam', createdBy: 't1' };
    const newExam = await Api.createExam(examData);

    expect(newExam.id).toBeDefined();
    expect(newExam.title).toBe('New Test Exam');
    expect(newExam.status).toBe(ExamStatus.DRAFT);
    expect(newExam.createdBy).toBe('t1');
  });

  it('should update exam status', async () => {
    const updated = await Api.setExamStatus('e1', ExamStatus.PUBLISHED);
    expect(updated.status).toBe(ExamStatus.PUBLISHED);
    
    // Verify it changed in the internal state too
    const exam = await Api.getExamById('e1');
    expect(exam.status).toBe(ExamStatus.PUBLISHED);
  });
});
