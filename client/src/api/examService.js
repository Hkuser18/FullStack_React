
import { exams, studentScores } from './mockDb';

const DELAY = 500;
/**
 * שולף את כל המבחנים,
 * משתמש ב timeout כדי לתת תחושה של קריאה אמיתית.
 * @returns {Promise<Array>} A promise resolving to an array of all exams.
 */
export const getAllExams = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...exams]);
    }, DELAY);
  });
};

/**
 * שולף מבחן לפי ID, עם טיפול בשגיאות אם המבחן לא נמצא.
 * @param {string} id - The ID of the exam to retrieve.
 * @returns {Promise<Object>} A promise resolving to the exam object or rejecting with an error.
 */
export const getExamById = (id) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const exam = exams.find(e => e.id === id);
      if (exam) {
        resolve(exam);
      } else {
        reject(new Error('Exam not found'));
      }
    }, DELAY);
  });
};

/**
 * יוצר מבחן חדש, ומוסיף למסד הנתונים
 * @param {Object} exam - The exam object to create.
 * @returns {Promise<Object>} A promise resolving to the created exam object.
 */
export const createExam = (exam) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newExam = { ...exam, id: Date.now().toString() };
      exams.push(newExam);
      resolve(newExam);
    }, DELAY);
  });
};

/**
 * שולף את כל ציוני התלמידים.
 * @returns {Promise<Array>} A promise resolving to an array of all student scores.
 */
export const getStudentScores = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...studentScores]);
    }, DELAY);
  });
};
