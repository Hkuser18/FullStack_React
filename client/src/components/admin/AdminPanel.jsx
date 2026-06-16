import { useState, useEffect } from 'react';
import Api from '../../api';
import Notify from '../../services/NotifyService';

const AdminPanel = () => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Api.getPendingTeachers()
      .then(data => { setPending(data); setLoading(false); })
      .catch(() => { Notify.error('Failed to load pending teachers.'); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const approve = (teacher) => {
    Api.approveTeacher(teacher.id)
      .then(() => { Notify.success(`${teacher.name} approved.`); load(); })
      .catch(err => Notify.error(err.message));
  };

  const reject = (teacher) => {
    if (!window.confirm(`Reject and delete account for "${teacher.name}"?`)) return;
    Api.rejectTeacher(teacher.id)
      .then(() => { Notify.success(`${teacher.name} rejected and removed.`); load(); })
      .catch(err => Notify.error(err.message));
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-light fw-semibold">
          Pending Teacher Approvals
          {pending.length > 0 && (
            <span className="badge bg-warning text-dark ms-2">{pending.length}</span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : pending.length === 0 ? (
          <div className="card-body">
            <p className="text-muted mb-0">No pending teacher registrations.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(t => (
                  <tr key={t.id}>
                    <td className="fw-semibold">{t.name}</td>
                    <td className="text-muted">{t.username}</td>
                    <td className="d-flex gap-2">
                      <button className="btn btn-sm btn-success" onClick={() => approve(t)}>
                        ✓ Approve
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => reject(t)}>
                        ✕ Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
