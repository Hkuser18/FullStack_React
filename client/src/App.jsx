import { useState } from 'react';

import LoginPage    from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import NavBar       from './components/navigation/NavBar';
import SideMenu     from './components/navigation/SideMenu';
import NotifyToast  from './components/shared/NotifyToast';
import ComingSoon   from './components/shared/ComingSoon';

import ExamList       from './components/teacher/ExamList';
import ExamForm       from './components/teacher/ExamForm';
import StudentResults from './components/teacher/StudentResults';

import AvailableExams from './components/student/AvailableExams';
import TakeExam       from './components/student/TakeExam';
import MyResults      from './components/student/MyResults';

import Auth   from './services/AuthService';
import Logger from './services/LoggerService';
import Notify from './services/NotifyService';
import './App.css';

const DEFAULT_PAGE = { teacher: 'my-exams', student: 'available-exams' };

function App() {
  const [user,       setUser]   = useState(() => Auth.getCurrentUser());
  const [screen,     setScreen] = useState('login');
  const [activePage, setPage]   = useState(() => {
    const u = Auth.getCurrentUser();
    return u ? DEFAULT_PAGE[u.role] : null;
  });
  const [pageParams, setParams] = useState({});

  const handleNavigate = (page, params = {}) => {
    setPage(page);
    setParams(params);
  };

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setPage(DEFAULT_PAGE[loggedInUser.role]);
    Logger.info('App: user logged in', { role: loggedInUser.role });
  };

  const handleLogout = () => {
    Auth.logout();
    Notify.info('You have been logged out.');
    setUser(null);
    setScreen('login');
    setPage(null);
    setParams({});
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
        return <ExamList user={user} onNavigate={handleNavigate} />;
      case 'create-exam':
        return <ExamForm user={user} onNavigate={handleNavigate} />;
      case 'edit-exam':
        return <ExamForm user={user} examId={pageParams.examId} onNavigate={handleNavigate} />;
      case 'student-results':
        return <StudentResults user={user} examId={pageParams.examId} onNavigate={handleNavigate} />;

      // Student pages
      case 'available-exams':
        return <AvailableExams user={user} onNavigate={handleNavigate} />;
      case 'take-exam':
        return <TakeExam user={user} examId={pageParams.examId} onNavigate={handleNavigate} />;
      case 'my-results':
        return <MyResults user={user} onNavigate={handleNavigate} />;

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
          onNavigate={handleNavigate}
        />
        <main className="flex-grow-1 p-4 bg-light" style={{ overflowY: 'auto' }}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
