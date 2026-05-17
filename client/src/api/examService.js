// Thin facade kept for backward compatibility.
// All logic lives in MockApiService.
import Api from './MockApiService';

export const getAllExams      = ()       => Api.getExams();
export const getExamById     = (id)     => Api.getExamById(id);
export const createExam      = (exam)   => Api.createExam(exam);
export const getStudentScores = ()      => Api.getAttemptsByStudent('u3'); // legacy shim
