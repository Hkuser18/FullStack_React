
import { useState } from 'react';
// @ts-ignore - JSX imports in TSX
import TeacherDashboard from './components/TeacherDashboard';
// @ts-ignore - JSX imports in TSX
import StudentPortal from './components/StudentPortal';
// @ts-ignore - JSX imports in TSX
import LoginPage from './components/LoginPage';
import './App.css';

type Role = 'teacher' | 'student';
interface User { id: string; name: string; role: Role; }

function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (loggedInUser: User) => setUser(loggedInUser);
  const handleLogout = () => setUser(null);

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
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
