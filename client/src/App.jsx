import { useState } from 'react';
import TeacherDashboard from './components/TeacherDashboard';
import StudentPortal from './components/StudentPortal';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('login');

  const handleLogin = (loggedInUser) => setUser(loggedInUser);
  const handleLogout = () => { setUser(null); setScreen('login'); };
  const handleRegistered = () => setScreen('login');

  if (!user) {
    return screen === 'register' ? (
      <RegisterPage
        onRegister={handleRegistered}
        onGoToLogin={() => setScreen('login')}
      />
    ) : (
      <LoginPage
        onLogin={handleLogin}
        onGoToRegister={() => setScreen('register')}
      />
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
        <div className="container">
          <span className="navbar-brand">E-Test System</span>
          <div className="d-flex align-items-center gap-3">
            <span className="text-white">
              {user.name}&nbsp;
              <span className={`badge ${user.role === 'teacher' ? 'bg-primary' : 'bg-info'}`}>
                {user.role}
              </span>
            </span>
            <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="container pb-5">
        <div className="text-center mb-5">
          <h1 className="display-4">Welcome, {user.name}</h1>
        </div>

        {user.role === 'teacher' ? (
          <TeacherDashboard />
        ) : (
          <StudentPortal />
        )}
      </main>

      <footer className="footer mt-auto py-3 bg-white border-top fixed-bottom">
        <div className="container text-center">
          <span className="text-muted">Mock API Ready | Built with React & Bootstrap</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
