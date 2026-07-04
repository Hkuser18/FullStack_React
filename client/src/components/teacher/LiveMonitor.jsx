// LiveMonitor - real-time view of who's currently taking a published exam.
// Session state lives entirely in Socket.IO events (monitor:snapshot/update/
// violation/submitted/left) — there's no REST fetch for "in-progress attempts"
// because the server has no DB row for those (see server/socket.js).
import { useState, useEffect } from 'react';
import Api from '../../api';
import Notify from '../../services/NotifyService';
import SocketService from '../../services/SocketService';

const SERVER_ENABLED = import.meta.env.VITE_USE_SERVER === 'true';

const activityBadge = (count) => {
  if (count === 0) return 'bg-secondary bg-opacity-50';
  if (count <= 3) return 'bg-warning text-dark';
  return 'bg-danger';
};

// Owns the live subscription for a single exam. Mounted fresh (via a `key={examId}` from the
// parent) whenever the selected exam changes, so switching exams resets state by remounting
// rather than by imperatively clearing state inside an effect.
function LiveMonitorSession({ examId, examTitle, usersMap }) {
  const [sessions,       setSessions]       = useState({}); // studentId -> session
  const [submittedCount, setSubmittedCount] = useState(0);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    SocketService.connect();

    // Room membership doesn't survive a reconnect and Socket.IO doesn't replay prior emits,
    // so re-subscribe on every 'connect' (fires on both the initial connect and any reconnect) —
    // same fix TakeExam.jsx applies for exam:join.
    const resubscribe = () => SocketService.emit('monitor:subscribe', { examId });
    SocketService.on('connect', resubscribe);
    if (SocketService.getSocket()?.connected) resubscribe();

    const onSnapshot = ({ examId: eId, sessions: list }) => {
      if (eId !== examId) return;
      setSessions(Object.fromEntries(list.map(s => [s.studentId, s])));
      setLoading(false);
    };

    const onUpdate = (session) => {
      if (session.examId !== examId) return;
      setSessions(prev => ({ ...prev, [session.studentId]: session }));
    };

    const onViolation = ({ examId: eId, studentId, tabSwitchCount }) => {
      if (eId !== examId) return;
      setSessions(prev => prev[studentId]
        ? { ...prev, [studentId]: { ...prev[studentId], tabSwitchCount } }
        : prev);
      const name = usersMap[studentId]?.name ?? studentId;
      Notify.warning(`${name} switched tabs (${tabSwitchCount}x)`);
    };

    const onSubmitted = ({ examId: eId, studentId, score }) => {
      if (eId !== examId) return;
      setSessions(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      setSubmittedCount(c => c + 1);
      const name = usersMap[studentId]?.name ?? studentId;
      Notify.info(`${name} submitted — score ${score}%`);
    };

    const onLeft = ({ examId: eId, studentId }) => {
      if (eId !== examId) return;
      setSessions(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    };

    SocketService.on('monitor:snapshot', onSnapshot);
    SocketService.on('monitor:update', onUpdate);
    SocketService.on('monitor:violation', onViolation);
    SocketService.on('monitor:submitted', onSubmitted);
    SocketService.on('monitor:left', onLeft);

    return () => {
      SocketService.emit('monitor:unsubscribe', { examId });
      SocketService.off('connect', resubscribe);
      SocketService.off('monitor:snapshot', onSnapshot);
      SocketService.off('monitor:update', onUpdate);
      SocketService.off('monitor:violation', onViolation);
      SocketService.off('monitor:submitted', onSubmitted);
      SocketService.off('monitor:left', onLeft);
    };
    // usersMap is only used for toast text and is loaded once near mount — re-subscribing
    // whenever it changes would be wasteful and isn't needed for correctness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const rows = Object.values(sessions).sort((a, b) =>
    (usersMap[a.studentId]?.name ?? a.studentId).localeCompare(usersMap[b.studentId]?.name ?? b.studentId)
  );
  const flaggedCount = rows.filter(s => s.tabSwitchCount > 0).length;

  return (
    <>
      <div className="row g-3 mb-4">
        {[
          { label: 'Active Now', value: rows.length,    color: 'primary' },
          { label: 'Submitted',  value: submittedCount,  color: 'success' },
          { label: 'Flagged',    value: flaggedCount,    color: flaggedCount > 0 ? 'danger' : 'secondary' },
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

      {loading ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : rows.length === 0 ? (
        <div className="alert alert-info">No students currently taking this exam.</div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-header bg-light fw-semibold">Live Sessions — {examTitle}</div>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Student</th>
                  <th>Progress</th>
                  <th>Suspicious Activity</th>
                  <th>Connection</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s.studentId}>
                    <td className="fw-semibold">{usersMap[s.studentId]?.name ?? s.studentId}</td>
                    <td style={{ minWidth: 160 }}>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-grow-1" style={{ height: 6 }}>
                          <div
                            className="progress-bar bg-info"
                            style={{ width: `${(s.questionsAnswered / s.totalQuestions) * 100}%` }}
                          />
                        </div>
                        <small className="text-muted">{s.questionsAnswered}/{s.totalQuestions}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${activityBadge(s.tabSwitchCount)}`}>
                        {s.tabSwitchCount} tab switch{s.tabSwitchCount === 1 ? '' : 'es'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge bg-${s.connected ? 'success' : 'secondary'}`}>
                        {s.connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

const LiveMonitor = ({ user, onNavigate }) => {
  const [exams,          setExams]          = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [usersMap,       setUsersMap]       = useState({});

  useEffect(() => {
    if (!SERVER_ENABLED) return;
    Api.getExamsByTeacher(user.id)
      .then(data => {
        const published = data.filter(e => e.status === 'published');
        setExams(published);
        if (published.length > 0) setSelectedExamId(published[0].id);
      })
      .catch(() => Notify.error('Failed to load exams.'));

    Api.getUsers().then(all => {
      setUsersMap(Object.fromEntries(all.map(u => [u.id, u])));
    });
  }, [user.id]);

  if (!SERVER_ENABLED) {
    return (
      <div>
        <div className="d-flex align-items-center gap-3 mb-4">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => onNavigate('my-exams')}>
            &larr; Back
          </button>
          <h4 className="mb-0">Live Monitor</h4>
        </div>
        <div className="alert alert-warning">Live Monitor requires the real server.</div>
      </div>
    );
  }

  const selectedExam = exams.find(e => e.id === selectedExamId);

  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => onNavigate('my-exams')}>
          &larr; Back
        </button>
        <h4 className="mb-0">Live Monitor</h4>
      </div>

      <div className="mb-4" style={{ maxWidth: 420 }}>
        <label className="form-label fw-semibold">Select Exam</label>
        <select className="form-select" value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
          {exams.length === 0 && <option value="">No published exams</option>}
          {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {selectedExamId && (
        <LiveMonitorSession
          key={selectedExamId}
          examId={selectedExamId}
          examTitle={selectedExam?.title ?? ''}
          usersMap={usersMap}
        />
      )}
    </div>
  );
};

export default LiveMonitor;
