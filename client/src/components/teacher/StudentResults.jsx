import { useState, useEffect } from 'react';
import Api from '../../api';
import Notify from '../../services/NotifyService';
import Logger from '../../services/LoggerService';

const SCORE_BUCKETS = [
  { label: '0–59',  min: 0,  max: 59  },
  { label: '60–69', min: 60, max: 69  },
  { label: '70–79', min: 70, max: 79  },
  { label: '80–89', min: 80, max: 89  },
  { label: '90–100',min: 90, max: 100 },
];

function ScoreChart({ attempts }) {
  const counts = SCORE_BUCKETS.map(b =>
    attempts.filter(a => a.score >= b.min && a.score <= b.max).length
  );
  const max = Math.max(...counts, 1);
  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-light fw-semibold">Score Distribution</div>
      <div className="card-body">
        <div className="d-flex align-items-flex-end gap-2" style={{ height: 120, alignItems: 'flex-end' }}>
          {SCORE_BUCKETS.map((b, i) => (
            <div key={b.label} className="d-flex flex-column align-items-center flex-grow-1">
              <span className="small text-muted mb-1">{counts[i]}</span>
              <div
                style={{
                  width: '100%',
                  height: `${Math.round((counts[i] / max) * 80) + 4}px`,
                  background: i === 0 ? 'var(--danger)' : 'var(--primary)',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s',
                }}
              />
              <span className="small text-muted mt-1" style={{ fontSize: '0.7rem' }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function exportCsv(attempts, usersMap, examTitle) {
  const rows = [
    ['Student', 'Score (%)', 'Passed', 'Submitted'],
    ...attempts.map(a => [
      usersMap[a.studentId]?.name ?? a.studentId,
      a.score,
      a.passed ? 'Yes' : 'No',
      new Date(a.submittedAt).toLocaleString(),
    ]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${examTitle.replace(/\s+/g, '_')}_results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
        <>
          <ScoreChart attempts={attempts} />
          <div className="card shadow-sm">
            <div className="card-header bg-light fw-semibold d-flex justify-content-between align-items-center">
              <span>Results — {selectedExam?.title}</span>
              <button
                className="btn btn-sm btn-outline-success"
                onClick={() => exportCsv(attempts, usersMap, selectedExam?.title ?? 'results')}
              >
                ⬇ Export CSV
              </button>
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
        </>
      )}
    </div>
  );
};

export default StudentResults;
