// MyResults - היסטוריית המבחנים של התלמיד המחובר
// ממיין לפי תאריך הגשה מהחדש לישן - הניסיון האחרון תמיד למעלה
// examsMap ממיר מזהי מבחנים לשמות - נטען במקביל לניסיונות כדי לחסוך זמן
import { useState, useEffect } from 'react';
import Api from '../../api';
import Notify from '../../services/NotifyService';
import Logger from '../../services/LoggerService';

const MyResults = ({ user }) => {
  const [attempts, setAttempts] = useState([]);
  const [examsMap, setExamsMap] = useState({});
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      Api.getAttemptsByStudent(user.id),
      Api.getExams(),
    ])
      .then(([myAttempts, allExams]) => {
        const sorted = [...myAttempts].sort(
          (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
        );
        setAttempts(sorted);
        setExamsMap(Object.fromEntries(allExams.map(e => [e.id, e])));
        setLoading(false);
      })
      .catch(err => {
        Notify.error('Failed to load results.');
        Logger.error('MyResults', err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="text-center py-5">
      <div className="spinner-border text-info" role="status" />
    </div>
  );

  const avgScore  = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
    : 0;
  const passCount = attempts.filter(a => a.passed).length;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Results</h1>
      </div>

      {attempts.length > 0 && (
        <div className="row g-3 mb-4">
          {[
            { label: 'Exams Taken', value: attempts.length, icon: '📋', bg: 'var(--primary-light)', color: 'var(--primary)' },
            { label: 'Avg Score',   value: `${avgScore}%`,  icon: '📊', bg: 'var(--info-light)',    color: 'var(--info)'    },
            { label: 'Passed',      value: passCount,        icon: '✅', bg: 'var(--success-light)', color: 'var(--success)' },
          ].map(stat => (
            <div key={stat.label} className="col-sm-4">
              <div className="card border-0 shadow-sm" style={{ borderRadius: 'var(--radius-lg)' }}>
                <div className="card-body py-3 text-center">
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{stat.icon}</div>
                  <div className="fw-bold" style={{ fontSize: '1.6rem', color: stat.color }}>{stat.value}</div>
                  <small style={{ color: 'var(--gray-600)' }}>{stat.label}</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {attempts.length === 0 ? (
        <div className="alert alert-info">You have not taken any exams yet.</div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-header bg-light fw-semibold">Exam History</div>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Exam</th>
                  <th>Score</th>
                  <th>Result</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map(a => (
                  <tr key={a.id}>
                    <td className="fw-semibold">{examsMap[a.examId]?.title ?? a.examId}</td>
                    <td><strong>{a.score}%</strong></td>
                    <td>
                      <span className={`badge bg-${a.passed ? 'success' : 'danger'}`}>
                        {a.passed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td className="text-muted small">
                      {new Date(a.submittedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyResults;
