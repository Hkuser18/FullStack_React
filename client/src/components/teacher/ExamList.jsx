import { useState, useEffect } from 'react';
import Api, { ExamStatus } from '../../api';
import Notify from '../../services/NotifyService';
import Logger from '../../services/LoggerService';
import QuestionViewer from '../QuestionViewer';

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     cls: 'draft'     },
  published: { label: 'Published', cls: 'published' },
  closed:    { label: 'Closed',    cls: 'closed'    },
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
      <div className="spinner-border" style={{ color: 'var(--primary)' }} role="status" />
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Exams</h1>
        <button className="btn-primary-app" onClick={() => onNavigate('create-exam')}>
          + Create Exam
        </button>
      </div>

      {exams.length === 0 && (
        <div className="alert alert-info rounded-3">No exams yet. Create your first exam!</div>
      )}

      <div className="d-flex flex-column gap-3">
        {exams.map(exam => {
          const sc       = STATUS_CONFIG[exam.status];
          const attempts = attemptCounts[exam.id] ?? 0;
          return (
            <div key={exam.id} className={`exam-card status-${exam.status}`}>
              <div className="exam-card-body">
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">

                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h5 className="mb-0 fw-semibold" style={{ color: 'var(--gray-800)' }}>{exam.title}</h5>
                      <span className={`status-badge ${sc.cls}`}>{sc.label}</span>
                    </div>
                    {exam.description && (
                      <p className="mb-1" style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>{exam.description}</p>
                    )}
                    <span className="text-muted-app">
                      {exam.questions.length} questions · {exam.duration} min · Pass: {exam.passingScore}% · {attempts} submission{attempts !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="d-flex gap-2 flex-wrap align-items-center">
                    {exam.status === ExamStatus.DRAFT && (
                      <>
                        <button className="btn-ghost" onClick={() => onNavigate('edit-exam', { examId: exam.id })}>Edit</button>
                        <button className="btn btn-sm btn-success rounded-3" onClick={() => changeStatus(exam.id, ExamStatus.PUBLISHED)}>Publish</button>
                        <button className="btn btn-sm btn-outline-danger rounded-3" onClick={() => deleteExam(exam)}>Delete</button>
                      </>
                    )}
                    {exam.status === ExamStatus.PUBLISHED && (
                      <>
                        <button className="btn-ghost" onClick={() => onNavigate('edit-exam', { examId: exam.id })}>Edit</button>
                        <button className="btn btn-sm btn-dark rounded-3" onClick={() => changeStatus(exam.id, ExamStatus.CLOSED)}>Close</button>
                      </>
                    )}
                    {exam.status === ExamStatus.CLOSED && (
                      <button className="btn btn-sm btn-outline-success rounded-3" onClick={() => changeStatus(exam.id, ExamStatus.PUBLISHED)}>Reopen</button>
                    )}
                    <button
                      className="btn btn-sm rounded-3"
                      style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600 }}
                      onClick={() => onNavigate('student-results', { examId: exam.id })}
                    >
                      Results{attempts > 0 ? ` (${attempts})` : ''}
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => toggleQuestions(exam.id)}
                    >
                      {expandedId === exam.id ? '▲ Hide' : '▼ Questions'}
                    </button>
                  </div>
                </div>
              </div>

              {expandedId === exam.id && (
                <div className="exam-card-footer animate-fade-in">
                  <p className="text-muted-app mb-3">
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
