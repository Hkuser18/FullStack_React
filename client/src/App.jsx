import { useState } from 'react';

import LoginPage      from './components/LoginPage';
import RegisterPage   from './components/RegisterPage';
import NavBar         from './components/navigation/NavBar';
import SideMenu       from './components/navigation/SideMenu';
import NotifyToast    from './components/shared/NotifyToast';
import ComingSoon     from './components/shared/ComingSoon';

import TeacherDashboard from './components/TeacherDashboard';
import StudentPortal    from './components/StudentPortal';

import Logger from './services/LoggerService';
import Notify from './services/NotifyService';
import './App.css';

const DEFAULT_PAGE = { teacher: 'my-exams', student: 'available-exams' };

function App() {
  const [user,       setUser]   = useState(null);
  const [screen,     setScreen] = useState('login');
  const [activePage, setPage]   = useState(null);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setPage(DEFAULT_PAGE[loggedInUser.role]);
    Logger.info('App: user logged in', { role: loggedInUser.role });
  };

  const handleLogout = () => {
    Notify.info('You have been logged out.');
    setUser(null);
    setScreen('login');
    setPage(null);
    Logger.info('App: user logged out');
  };

  // ── Auth screens ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <NotifyToast />
        {screen === 'register' ? (
          <RegisterPage
            onRegister={() => setScreen('login')}
            onGoToLogin={() => setScreen('login')}
          />
        ) : (
          <LoginPage
            onLogin={handleLogin}
            onGoToRegister={() => setScreen('register')}
          />
        )}
      </>
    );
  }

  // ── Page renderer ─────────────────────────────────────────────────────────
  const renderPage = () => {
    switch (activePage) {
      // Teacher pages
      case 'my-exams':
        return <TeacherDashboard user={user} onNavigate={setPage} />;
      case 'create-exam':
        return <ComingSoon title="Create Exam" />;
      case 'student-results':
        return <ComingSoon title="Student Results" />;

      // Student pages
      case 'available-exams':
        return <StudentPortal user={user} onNavigate={setPage} />;
      case 'my-results':
        return <ComingSoon title="My Results" />;

      default:
        return <ComingSoon title="Page not found" />;
    }
  };

  // ── Authenticated layout ──────────────────────────────────────────────────
  return (
    <div className="d-flex flex-column" style={{ height: '100vh' }}>
      <NotifyToast />
      <NavBar user={user} onLogout={handleLogout} />

      <div className="d-flex flex-row flex-grow-1" style={{ overflow: 'hidden' }}>
        <SideMenu
          role={user.role}
          activePage={activePage}
          onNavigate={setPage}
        />

        <main
          className="flex-grow-1 p-4 bg-light"
          style={{ overflowY: 'auto' }}
        >
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
