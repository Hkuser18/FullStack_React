import React, { useState } from 'react';
import { users as mockUsers } from '../api/mockDb';

const LoginPage = ({ onLogin, onGoToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const allUsers = [...mockUsers, ...localUsers];

    const match = allUsers.find(
      (u) => u.username === username && u.password === password && u.role === role
    );

    if (match) {
      onLogin({ id: match.id, name: match.name, role: match.role });
    } else {
      setError('Invalid username, password, or role.');
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow" style={{ width: '100%', maxWidth: 420 }}>
        <div className="card-header bg-dark text-white text-center py-3">
          <h4 className="mb-0">E-Test System &mdash; Login</h4>
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
                placeholder="Enter username"
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
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-dark w-100 mt-2">
              Login as {role === 'teacher' ? 'Teacher' : 'Student'}
            </button>
          </form>

          <div className="text-center mt-3">
            <button className="btn btn-link p-0" onClick={onGoToRegister}>
              No account yet? Register here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
