import { useState, useEffect } from 'react';
import Api from '../../api';
import Notify from '../../services/NotifyService';
import Logger from '../../services/LoggerService';

const AvailableExams = ({ user, onNavigate }) => {
  const [exams,     setExams]     = useState([]);
  const [attempted, setAttempted] = useState({});
  const [loading,   setLoading]   = useState(true);

  const isWithinSchedule = (exam) => {
    const now = Date.now();
    if (exam.startDate && now < new Date(exam.startDate).getTime()) return false;
    if (exam.endDate   && now > new Date(exam.endDate).getTime())   return false;
    return true;
  };

  useEffect(() => {
    Api.getPublishedExams()
      .then(data => {
        const visible = data.filter(isWithinSchedule);
        setExams(visible);
        return Promise.all(
          visible.map(e => Api.hasAttempted(user.id, e.id).then(has => [e.id, has]))
        );
      })
      .then(pairs => {
        setAttempted(Object.fromEntries(pairs));
        setLoading(false);
      })
      .catch(err => {
        Notify.error('Failed to load exams.');
        Logger.error('AvailableExams', err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="text-center py-5">
      <div className="spinner-border" style={{ color: 'var(--primary)' }} role="status" />
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Available Exams</h1>
      </div>

      {exams.length === 0 && (
        <div className="alert alert-info rounded-3">No exams are currently available.</div>
      )}

      <div className="d-flex flex-column gap-3">
        {exams.map(exam => {
          const done = attempted[exam.id];
          return (
            <div key={exam.id} className={`exam-card status-published${done ? ' opacity-75' : ''}`}>
              <div className="exam-card-body">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h5 className="mb-0 fw-semibold" style={{ color: 'var(--gray-800)' }}>{exam.title}</h5>
                      {done && <span className="status-badge completed">✓ Completed</span>}
                    </div>
                    {exam.description && (
                      <p className="mb-1" style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>{exam.description}</p>
                    )}
                    <span className="text-muted-app">
                      {exam.questions.length} questions · {exam.duration} min · Pass: {exam.passingScore}%
                    </span>
                    {exam.endDate && (
                      <span className="text-muted-app d-block" style={{ fontSize: '0.8rem' }}>
                        ⏰ Closes {new Date(exam.endDate).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <button
                    className={done ? 'btn-ghost' : 'btn-primary-app'}
                    disabled={done}
                    onClick={() => onNavigate('take-exam', { examId: exam.id })}
                  >
                    {done ? 'Already Submitted' : 'Take Exam →'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AvailableExams;
