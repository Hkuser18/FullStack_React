
import React, { useState, useEffect } from 'react';
import { getAllExams } from '../api/examService';
import QuestionViewer from './QuestionViewer';


/**
 * jsx component for the teacher dashboard, allowing teachers to view and manage their exams. It fetches all exams on mount and displays them in a list, showing the exam title and number of questions.
 * includes placceholders for editing and creating exams, not yet implemented.
 * @returns a JSX element representing the teacher dashboard interface.
 */
const TeacherDashboard = ({ user, onNavigate }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedExamId, setExpandedExamId] = useState(null);

  // Fetch all exams when the component mounts
  useEffect(() => {
    getAllExams().then(data => {
      setExams(data);
      setLoading(false);
    });
  }, []);

  const toggleExpand = (examId) => {
    setExpandedExamId(expandedExamId === examId ? null : examId);
  };

  // currently return a basic list.
  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h3>Teacher Dashboard</h3>
        </div>
        <div className="card-body">
          <h4 className="card-title mb-4">Manage Exams</h4>
          {loading ? (
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="list-group">
              {exams.map(exam => (
                <div key={exam.id} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <h5 className="mb-1">{exam.title}</h5>
                      <small className="text-muted">{exam.questions.length} Questions</small>
                    </div>
                    <div>
                      <button 
                        className="btn btn-outline-info btn-sm me-2"
                        onClick={() => toggleExpand(exam.id)}
                      >
                        {expandedExamId === exam.id ? 'Hide Questions' : 'View Questions'}
                      </button>
                      <button className="btn btn-outline-secondary btn-sm">Edit</button>
                    </div>
                  </div>
                  
                  {expandedExamId === exam.id && (
                    <div className="mt-3 p-3 bg-light rounded animate-fade-in">
                      <h6>Exam Questions:</h6>
                      {exam.questions.map(q => (
                        <QuestionViewer key={q.id} question={q} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-success mt-4">Create New Exam</button>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
