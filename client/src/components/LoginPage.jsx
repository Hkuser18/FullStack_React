import { useState } from 'react';
import Auth   from '../services/AuthService';
import Notify from '../services/NotifyService';
import Logger from '../services/LoggerService';

const LoginPage = ({ onLogin, onGoToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('student');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await Auth.login(username, password, role);
      Notify.success(`Welcome back, ${user.name}!`);
      onLogin(user);
    } catch {
      Logger.warn('Login failed', { username, role });
      setError('Invalid username, password, or role.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        <div className="auth-card-header">
          <div className="logo">📝</div>
          <h4>E-Test System</h4>
          <p>Sign in to continue</p>
        </div>

        <div className="auth-card-body">
          <div className="role-toggle">
            <button
              type="button"
              className={`role-toggle-btn${role === 'student' ? ' active' : ''}`}
              onClick={() => setRole('student')}
            >
              Student
            </button>
            <button
              type="button"
              className={`role-toggle-btn${role === 'teacher' ? ' active' : ''}`}
              onClick={() => setRole('teacher')}
            >
              Teacher
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label-app">Username</label>
              <input
                type="text"
                className="form-input-app"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label-app">Password</label>
              <input
                type="password"
                className="form-input-app"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="alert alert-danger py-2 mb-3" role="alert" style={{ fontSize: '0.85rem', borderRadius: 8 }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary-app w-100" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Logging in…' : `Login as ${role === 'teacher' ? 'Teacher' : 'Student'}`}
            </button>
          </form>

          <hr className="divider" />
          <div className="text-center">
            <button
              className="btn btn-link p-0"
              style={{ fontSize: '0.85rem', color: 'var(--primary)' }}
              onClick={onGoToRegister}
            >
              No account yet? Register here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
