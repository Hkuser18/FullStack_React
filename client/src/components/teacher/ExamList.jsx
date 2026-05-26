// ExamList - דף "המבחנים שלי" למורה
// מציג את כל המבחנים שיצר המורה המחובר, עם פעולות לפי סטטוס
// לוגיקת הסטטוסים: draft -> published -> closed (וחזרה ל-published אם צריך)
// הסיבה לאסור עריכה על מבחן סגור: ציוני תלמידים כבר קיימים - שינוי שאלות יפר את ההגינות
import { useState, useEffect } from 'react';
import Api, { ExamStatus } from '../../api/MockApiService';
import Notify from '../../services/NotifyService';
import Logger from '../../services/LoggerService';
import QuestionViewer from '../QuestionViewer';

// מיפוי בין סטטוס לסגנון Bootstrap - מרכז את ההגדרות במקום אחד
const STATUS_CONFIG = {
  draft:     { badge: 'secondary', label: 'Draft'     },
  published: { badge: 'success',   label: 'Published' },
  closed:    { badge: 'dark',      label: 'Closed'    },
};

const ExamList = ({ user, onNavigate }) => {
  const [exams,         setExams]         = useState([]);
  const [attemptCounts, setAttemptCounts] = useState({});
  const [loading,       setLoading]       = useState(true);
  const [expandedId,    setExpandedId]    = useState(null);

  const toggleQuestions = (examId) =>
    setExpandedId(prev => prev === examId ? null : examId);

  const load = () => {
    setLoading(true);
    Api.getExamsByTeacher(user.id)
      .then(data => {
        setExams(data);
        return Promise.all(
          data.map(e => Api.getAttemptsByExam(e.id).then(a => [e.id, a.length]))
        );
      })
      .then(pairs => {
        setAttemptCounts(Object.fromEntries(pairs));
        setLoading(false);
      })
      .catch(err => {
        Notify.error('Failed to load exams.');
        Logger.error('ExamList.load', err.message);
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  const changeStatus = (examId, status) => {
    Api.setExamStatus(examId, status)
      .then(() => { Notify.success(`Status changed to ${status}.`); load(); })
      .catch(err => Notify.error(err.message));
  };

  const deleteExam = (exam) => {
    if (!window.confirm(`Delete "${exam.title}"? This cannot be undone.`)) return;
    Api.deleteExam(exam.id)
      .then(() => { Notify.success('Exam deleted.'); load(); })
      .catch(err => Notify.error(err.message));
  };

  if (loading) return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status" />
    </div>
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">My Exams</h4>
        <button className="btn btn-primary" onClick={() => onNavigate('create-exam')}>
          + Create New Exam
        </button>
      </div>

      {exams.length === 0 && (
        <div className="alert alert-info">No exams yet. Create your first exam!</div>
      )}

      <div className="d-flex flex-column gap-3">
        {exams.map(exam => {
          const sc       = STATUS_CONFIG[exam.status];
          const attempts = attemptCounts[exam.id] ?? 0;
          return (
            <div key={exam.id} className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">

                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h5 className="mb-0">{exam.title}</h5>
                      <span className={`badge bg-${sc.badge}`}>{sc.label}</span>
                    </div>
                    <p className="text-muted small mb-1">{exam.description}</p>
                    <small className="text-muted">
                      {exam.questions.length} questions &middot; {exam.duration} min &middot; Pass: {exam.passingScore}% &middot; {attempts} submission{attempts !== 1 ? 's' : ''}
                    </small>
                  </div>

                  <div className="d-flex gap-2 flex-wrap">
                    {exam.status === ExamStatus.DRAFT && (
                      <>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => onNavigate('edit-exam', { examId: exam.id })}>Edit</button>
                        <button className="btn btn-sm btn-success"           onClick={() => changeStatus(exam.id, ExamStatus.PUBLISHED)}>Publish</button>
                        <button className="btn btn-sm btn-outline-danger"    onClick={() => deleteExam(exam)}>Delete</button>
                      </>
                    )}
                    {exam.status === ExamStatus.PUBLISHED && (
                      <>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => onNavigate('edit-exam', { examId: exam.id })}>Edit</button>
                        <button className="btn btn-sm btn-dark"              onClick={() => changeStatus(exam.id, ExamStatus.CLOSED)}>Close Exam</button>
                      </>
                    )}
                    {exam.status === ExamStatus.CLOSED && (
                      <button className="btn btn-sm btn-outline-success" onClick={() => changeStatus(exam.id, ExamStatus.PUBLISHED)}>Reopen</button>
                    )}
                    <button className="btn btn-sm btn-outline-primary" onClick={() => onNavigate('student-results', { examId: exam.id })}>
                      Results{attempts > 0 ? ` (${attempts})` : ''}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-info"
                      onClick={() => toggleQuestions(exam.id)}
                    >
                      {expandedId === exam.id ? 'Hide Questions' : 'View Questions'}
                    </button>
                  </div>

                </div>
              </div>

              {expandedId === exam.id && (
                <div className="card-footer bg-light">
                  <p className="fw-semibold text-secondary small mb-3">
                    {exam.questions.length} Question{exam.questions.length !== 1 ? 's' : ''} — correct answer highlighted in green
                  </p>
                  {exam.questions.map(q => (
                    <QuestionViewer key={q.id} question={q} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExamList;
