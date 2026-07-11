import { useState, useEffect } from 'react';

import LoginPage    from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import NavBar       from './components/navigation/NavBar';
import SideMenu     from './components/navigation/SideMenu';
import NotifyToast  from './components/shared/NotifyToast';
import ComingSoon   from './components/shared/ComingSoon';

import ExamList       from './components/teacher/ExamList';
import ExamForm       from './components/teacher/ExamForm';
import StudentResults from './components/teacher/StudentResults';
import QuestionBank   from './components/teacher/QuestionBank';
import LiveMonitor    from './components/teacher/LiveMonitor';
import Analytics      from './components/teacher/Analytics';
import AdminPanel     from './components/admin/AdminPanel';

import AvailableExams from './components/student/AvailableExams';
import TakeExam       from './components/student/TakeExam';
import MyResults      from './components/student/MyResults';

import Auth    from './services/AuthService';
import Logger  from './services/LoggerService';
import Notify  from './services/NotifyService';
import Storage from './services/StorageService';
import './App.css';

const DEFAULT_PAGE = { teacher: 'my-exams', student: 'available-exams', admin: 'admin-panel' };
const PAGE_KEY = 'ui_page';

function App() {
  const [user,        setUser]        = useState(() => Auth.getCurrentUser());
  const [screen,      setScreen]      = useState('login');
  const [activePage,  setPage]        = useState(() => {
    const u = Auth.getCurrentUser();
    if (!u) return null;
    return Storage.get(PAGE_KEY)?.activePage ?? DEFAULT_PAGE[u.role];
  });
  const [pageParams,  setParams]      = useState(() => {
    const u = Auth.getCurrentUser();
    return u ? Storage.get(PAGE_KEY)?.pageParams ?? {} : {};
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // auth_token is a single shared localStorage key — logging into a different account
  // in another tab silently overwrites it. This tab's React state (and every UI element
  // built from it) would keep showing the OLD user while every new request actually goes
  // out with the NEW tab's token, since ServerApiService reads localStorage fresh on each
  // call. The 'storage' event only fires for changes made in other tabs/windows, so this
  // reloads to resync as soon as that happens, rather than silently sending mismatched
  // requests that fail with a confusing role/permission error.
  useEffect(() => {
    const onStorageChange = (e) => {
      if (e.key === 'auth_token') window.location.reload();
    };
    window.addEventListener('storage', onStorageChange);
    return () => window.removeEventListener('storage', onStorageChange);
  }, []);

  // Persists the current page across a hard refresh — most relevant while
  // mid-exam, where the answers themselves are already auto-saved separately.
  const handleNavigate = (page, params = {}) => {
    setPage(page);
    setParams(params);
    setSidebarOpen(false);
    Storage.set(PAGE_KEY, { activePage: page, pageParams: params });
  };

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    const page = DEFAULT_PAGE[loggedInUser.role];
    setPage(page);
    Storage.set(PAGE_KEY, { activePage: page, pageParams: {} });
    Logger.info('App: user logged in', { role: loggedInUser.role });
  };

  const handleLogout = () => {
    Auth.logout();
    Notify.info('You have been logged out.');
    setUser(null);
    setScreen('login');
    setPage(null);
    setParams({});
    setSidebarOpen(false);
    Storage.remove(PAGE_KEY);
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
      case 'live-monitor':
        return <LiveMonitor user={user} onNavigate={handleNavigate} />;
      case 'create-exam':
        return <ExamForm user={user} onNavigate={handleNavigate} />;
      case 'edit-exam':
        return <ExamForm user={user} examId={pageParams.examId} onNavigate={handleNavigate} />;
      case 'student-results':
        return <StudentResults user={user} examId={pageParams.examId} onNavigate={handleNavigate} />;
      case 'question-bank':
        return <QuestionBank user={user} onNavigate={handleNavigate} />;
      case 'analytics':
        return <Analytics user={user} onNavigate={handleNavigate} />;

      // Student pages
      case 'available-exams':
        return <AvailableExams user={user} onNavigate={handleNavigate} />;
      case 'take-exam':
        return <TakeExam user={user} examId={pageParams.examId} onNavigate={handleNavigate} />;
      case 'my-results':
        return <MyResults user={user} onNavigate={handleNavigate} />;

      // Admin pages
      case 'admin-panel':
        return <AdminPanel user={user} onNavigate={handleNavigate} />;

      default:
        return <ComingSoon title="Page not found" />;
    }
  };

  // ── Authenticated layout ──────────────────────────────────────────────────
  return (
    <div className="app-root d-flex flex-column w-100 overflow-hidden">
      <NotifyToast />
      <NavBar
        user={user}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen(s => !s)}
        sidebarOpen={sidebarOpen}
      />

      <div className="app-body d-flex flex-grow-1 overflow-hidden position-relative">
        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}
        <SideMenu
          role={user.role}
          activePage={activePage}
          onNavigate={handleNavigate}
          isOpen={sidebarOpen}
        />
        <main className="app-main flex-grow-1 overflow-auto animate-fade-in">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
