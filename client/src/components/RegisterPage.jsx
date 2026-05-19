import React, { useState } from 'react';
import Auth   from '../services/AuthService';
import Logger from '../services/LoggerService';
import Notify from '../services/NotifyService';

const RegisterPage = ({ onRegister, onGoToLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    Auth.register({ username, password, role, name: username })
      .then(() => {
        Notify.success('Account created! You can now log in.');
        setSuccess('Account created! You can now log in.');
        onRegister();
      })
      .catch((err) => {
        setError(err.message);
      });
    return;
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow" style={{ width: '100%', maxWidth: 420 }}>
        <div className="card-header bg-dark text-white text-center py-3">
          <h4 className="mb-0">E-Test System &mdash; Register</h4>
        </div>
        <div className="card-body p-4">
          <div className="d-flex justify-content-center gap-3 mb-4">
            <button
              type="button"
              className={`btn flex-fill ${role === 'student' ? 'btn-info text-white' : 'btn-outline-info'}`}
              onClick={() => setRole('student')}
            >
              Student
            </button>
            <button
              type="button"
              className={`btn flex-fill ${role === 'teacher' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setRole('teacher')}
            >
              Teacher
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-control"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Choose a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Repeat your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            {error && <div className="alert alert-danger py-2">{error}</div>}
            {success && <div className="alert alert-success py-2">{success}</div>}

            <button type="submit" className="btn btn-dark w-100 mt-2">
              Create Account
            </button>
          </form>

          <div className="text-center mt-3">
            <button className="btn btn-link p-0" onClick={onGoToLogin}>
              Already have an account? Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
