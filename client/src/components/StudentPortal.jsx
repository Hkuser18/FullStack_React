
import React, { useState } from 'react';
import { getExamById } from '../api/examService';

/**
 * jsx component for the student portal, allowing students to enter an exam ID * * and fetch the corresponding exam details.
 * currently, it only displays the exam title and number of questions, with a
 * placeholder button to start the exam.
 * @returns a JSX element representing the student portal interface.
 */
const StudentPortal = () => {
  const [examId, setExamId] = useState('');
  const [exam, setExam] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFetchExam = async () => {
    if (!examId.trim()) return;

    setLoading(true);
    setError('');
    setExam(null);

    try {
      const data = await getExamById(examId);
      setExam(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="card shadow-sm">
        <div className="card-header bg-info text-white">
          <h3>Student Portal</h3>
        </div>
        <div className="card-body">
          <div className="mb-4">
            <label htmlFor="examId" className="form-label">Enter Exam ID to Start</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                id="examId"
                placeholder="e.g. 1"
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
              />
              <button
                className="btn btn-primary"
                type="button"
                onClick={handleFetchExam}
                disabled={loading}
              >
                {loading ? 'Fetching...' : 'Fetch Exam'}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {exam && (
            <div className="mt-4 animate-fade-in">
              <div className="card border-info">
                <div className="card-body">
                  <h4 className="card-title text-info">{exam.title}</h4>
                  <p className="card-text">Number of questions: {exam.questions.length}</p>
                  <button className="btn btn-lg btn-success w-100">Start Exam</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;
