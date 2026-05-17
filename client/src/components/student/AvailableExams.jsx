// AvailableExams - רשימת מבחנים זמינים לתלמיד
// מציג רק מבחנים עם סטטוס 'published' - תלמידים לא רואים טיוטות
// בדיקת hasAttempted מונעת הגשה כפולה - כל תלמיד מגיש מבחן פעם אחת בלבד
import { useState, useEffect } from 'react';
import Api from '../../api/MockApiService';
import Notify from '../../services/NotifyService';
import Logger from '../../services/LoggerService';

const AvailableExams = ({ user, onNavigate }) => {
  const [exams,     setExams]     = useState([]);
  const [attempted, setAttempted] = useState({});
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Api.getPublishedExams()
      .then(data => {
        setExams(data);
        return Promise.all(
          data.map(e => Api.hasAttempted(user.id, e.id).then(has => [e.id, has]))
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
      <div className="spinner-border text-info" role="status" />
    </div>
  );

  return (
    <div>
      <h4 className="mb-4">Available Exams</h4>

      {exams.length === 0 && (
        <div className="alert alert-info">No exams are currently available.</div>
      )}

      <div className="d-flex flex-column gap-3">
        {exams.map(exam => {
          const done = attempted[exam.id];
          return (
            <div key={exam.id} className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h5 className="mb-0">{exam.title}</h5>
                      {done && <span className="badge bg-success">Completed</span>}
                    </div>
                    <p className="text-muted small mb-1">{exam.description}</p>
                    <small className="text-muted">
                      {exam.questions.length} questions &middot; {exam.duration} min &middot; Pass: {exam.passingScore}%
                    </small>
                  </div>
                  <button
                    className={`btn ${done ? 'btn-outline-secondary' : 'btn-info text-white'}`}
                    disabled={done}
                    onClick={() => onNavigate('take-exam', { examId: exam.id })}
                  >
                    {done ? 'Already Submitted' : 'Take Exam'}
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
