// StudentResults - דף תוצאות תלמידים למורה
// מציג סטטיסטיקות ורשימת ניסיונות לכל מבחן שהמורה יצר
// ה-usersMap ממיר מזהי תלמידים לשמות קריאים - לא חושף סיסמאות
import { useState, useEffect } from 'react';
import Api from '../../api/MockApiService';
import Notify from '../../services/NotifyService';
import Logger from '../../services/LoggerService';

const StudentResults = ({ user, examId: initialExamId, onNavigate }) => {
  const [exams,           setExams]           = useState([]);
  const [selectedExamId,  setSelectedExamId]  = useState(initialExamId || '');
  const [attempts,        setAttempts]        = useState([]);
  const [usersMap,        setUsersMap]        = useState({});
  const [loading,         setLoading]         = useState(false);

  useEffect(() => {
    Api.getExamsByTeacher(user.id).then(data => {
      setExams(data);
      if (!initialExamId && data.length > 0) setSelectedExamId(data[0].id);
    }).catch(() => Notify.error('Failed to load exams.'));

    Api.getUsers().then(all => {
      setUsersMap(Object.fromEntries(all.map(u => [u.id, u])));
    });
  }, []);

  useEffect(() => {
    if (!selectedExamId) return;
    setLoading(true);
    Api.getAttemptsByExam(selectedExamId)
      .then(data => { setAttempts(data); setLoading(false); })
      .catch(err => {
        Notify.error('Failed to load results.');
        Logger.error('StudentResults', err.message);
        setLoading(false);
      });
  }, [selectedExamId]);

  const selectedExam = exams.find(e => e.id === selectedExamId);
  const avgScore  = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : 0;
  const passCount = attempts.filter(a => a.passed).length;
  const passRate  = attempts.length ? Math.round((passCount / attempts.length) * 100) : 0;

  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => onNavigate('my-exams')}>
          &larr; Back
        </button>
        <h4 className="mb-0">Student Results</h4>
      </div>

      <div className="mb-4" style={{ maxWidth: 420 }}>
        <label className="form-label fw-semibold">Select Exam</label>
        <select className="form-select" value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
          {exams.length === 0 && <option value="">No exams found</option>}
          {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {/* Summary stats */}
      {attempts.length > 0 && (
        <div className="row g-3 mb-4">
          {[
            { label: 'Submissions', value: attempts.length, color: 'primary' },
            { label: 'Avg Score',   value: `${avgScore}%`,  color: 'info'    },
            { label: 'Pass Rate',   value: `${passRate}%`,  color: 'success' },
          ].map(stat => (
            <div key={stat.label} className="col-sm-4">
              <div className={`card text-center border-${stat.color}`}>
                <div className="card-body py-2">
                  <div className={`fs-3 fw-bold text-${stat.color}`}>{stat.value}</div>
                  <small className="text-muted">{stat.label}</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : attempts.length === 0 ? (
        <div className="alert alert-info">No submissions yet for this exam.</div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-header bg-light fw-semibold">
            Results — {selectedExam?.title}
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Student</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map(a => (
                  <tr key={a.id}>
                    <td className="fw-semibold">{usersMap[a.studentId]?.name ?? a.studentId}</td>
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

export default StudentResults;
