// Analytics - cross-exam teacher dashboard. Unlike StudentResults.jsx (per-exam), this aggregates
// across ALL of the teacher's exams: summary stats, a per-exam breakdown table, an aggregate score
// distribution, and per-question difficulty for a selected exam. 100% client-side aggregation over
// existing endpoints — no new backend/schema.
import { useState, useEffect } from 'react';
import Api from '../../api';
import Notify from '../../services/NotifyService';
import Logger from '../../services/LoggerService';
import ScoreChart from '../shared/ScoreChart';

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     cls: 'draft'     },
  published: { label: 'Published', cls: 'published' },
  closed:    { label: 'Closed',    cls: 'closed'    },
};

function exportCsv(perExamStats) {
  const rows = [
    ['Exam', 'Status', 'Attempts', 'Avg Score (%)', 'Pass Rate (%)'],
    ...perExamStats.map(s => [s.title, s.status, s.count, s.avgScore, s.passRate]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'analytics_summary.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// Re-derives per-question correctness client-side, since neither attempts.score (an aggregate %)
// nor attempts.answers alone records it — mirrors TakeExam.jsx's isAnswered/openMatches precedent.
const isCorrect = (q, a) =>
  q.type === 'open'
    ? (q.keywords ?? []).some(kw => String(a ?? '').toLowerCase().includes(kw.toLowerCase()))
    : a === q.correctOption;

const Analytics = ({ user, onNavigate }) => {
  const [exams,          setExams]          = useState([]);
  const [attemptsByExam, setAttemptsByExam] = useState({});
  const [loading,        setLoading]        = useState(true);
  const [selectedExamId, setSelectedExamId] = useState('');

  useEffect(() => {
    Api.getExamsByTeacher(user.id)
      .then(data => {
        setExams(data);
        if (data.length > 0) setSelectedExamId(data[0].id);
        return Promise.all(
          data.map(e => Api.getAttemptsByExam(e.id).then(a => [e.id, a]))
        );
      })
      .then(pairs => {
        setAttemptsByExam(Object.fromEntries(pairs));
        setLoading(false);
      })
      .catch(err => {
        Notify.error('Failed to load analytics.');
        Logger.error('Analytics.load', err.message);
        setLoading(false);
      });
  }, [user.id]);

  if (loading) return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status" />
    </div>
  );

  const allAttempts = Object.values(attemptsByExam).flat();
  const avgScore  = allAttempts.length
    ? Math.round(allAttempts.reduce((s, a) => s + a.score, 0) / allAttempts.length)
    : 0;
  const passCount = allAttempts.filter(a => a.passed).length;
  const passRate  = allAttempts.length ? Math.round((passCount / allAttempts.length) * 100) : 0;

  const perExamStats = exams.map(e => {
    const attempts = attemptsByExam[e.id] ?? [];
    const eAvg = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length) : 0;
    const ePassCount = attempts.filter(a => a.passed).length;
    const ePassRate = attempts.length ? Math.round((ePassCount / attempts.length) * 100) : 0;
    return { id: e.id, title: e.title, status: e.status, count: attempts.length, avgScore: eAvg, passRate: ePassRate };
  });

  const selectedExam = exams.find(e => e.id === selectedExamId);
  const selectedAttempts = attemptsByExam[selectedExamId] ?? [];
  const questionStats = selectedExam
    ? selectedExam.questions
        .map((q, i) => {
          const correctCount = selectedAttempts.filter(att => isCorrect(q, att.answers[i])).length;
          const pct = selectedAttempts.length ? Math.round((correctCount / selectedAttempts.length) * 100) : 0;
          return { id: q.id, text: q.text, pct };
        })
        .sort((a, b) => a.pct - b.pct)
    : [];

  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => onNavigate('my-exams')}>
          &larr; Back
        </button>
        <h4 className="mb-0">Analytics</h4>
      </div>

      {exams.length === 0 ? (
        <div className="alert alert-info">No exams yet — create one to see analytics here.</div>
      ) : (
        <div className="row g-3 mb-4">
          {[
            { label: 'Total Exams',       value: exams.length,       color: 'primary' },
            { label: 'Total Submissions', value: allAttempts.length, color: 'info'    },
            { label: 'Overall Avg Score', value: `${avgScore}%`,     color: 'warning' },
            { label: 'Overall Pass Rate', value: `${passRate}%`,     color: 'success' },
          ].map(stat => (
            <div key={stat.label} className="col-sm-3">
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

      {exams.length > 0 && (
        <>
          <ScoreChart attempts={allAttempts} />

          <div className="card shadow-sm mb-4">
            <div className="card-header bg-light fw-semibold d-flex justify-content-between align-items-center">
              <span>Per-Exam Breakdown</span>
              <button className="btn btn-sm btn-outline-success" onClick={() => exportCsv(perExamStats)}>
                ⬇ Export CSV
              </button>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Exam</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>Avg Score</th>
                    <th>Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {perExamStats.map(s => {
                    const sc = STATUS_CONFIG[s.status];
                    return (
                      <tr key={s.id}>
                        <td className="fw-semibold">{s.title}</td>
                        <td><span className={`status-badge ${sc.cls}`}>{sc.label}</span></td>
                        <td>{s.count}</td>
                        <td>{s.count > 0 ? `${s.avgScore}%` : '—'}</td>
                        <td>{s.count > 0 ? `${s.passRate}%` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-3" style={{ maxWidth: 420 }}>
            <label className="form-label fw-semibold">Question Difficulty — Select Exam</label>
            <select className="form-select" value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
              {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>

          {selectedAttempts.length === 0 ? (
            <div className="alert alert-info">No submissions yet for this exam.</div>
          ) : (
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-light fw-semibold">
                Question Difficulty — {selectedExam?.title} (hardest first)
              </div>
              <div className="card-body">
                <div className="d-flex flex-column gap-3">
                  {questionStats.map((q, i) => (
                    <div key={q.id}>
                      <div className="d-flex justify-content-between small mb-1">
                        <span>Q{i + 1}. {q.text}</span>
                        <span className="fw-semibold">{q.pct}% correct</span>
                      </div>
                      <div className="progress" style={{ height: 8 }}>
                        <div
                          className={`progress-bar ${q.pct < 50 ? 'bg-danger' : q.pct < 80 ? 'bg-warning' : 'bg-success'}`}
                          style={{ width: `${q.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;
