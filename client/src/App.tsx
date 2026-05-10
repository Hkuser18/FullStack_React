
import { useState } from 'react';
// @ts-ignore - JSX imports in TSX
import TeacherDashboard from './components/TeacherDashboard';
// @ts-ignore - JSX imports in TSX
import StudentPortal from './components/StudentPortal';
import './App.css';

/**
 * הרכיב המרכזי של האפליקציה, מאפשר מעבר בין תלמיד למורה עם כפתוק.
 * יודע לקרוא לרכיב המתאים לפי המצב שנבחר.
 * הממשק פשוט, ומכיל בעיקר רכיבים זמניים שיממושו מאוחר יותר.
 * @returns - אלמנט JSX שמכיל את התצוגה המתאימה למצב הנבחר (תלמיד או מורה).
 */
function App() {
  const [role, setRole] = useState<'teacher' | 'student'>('teacher');

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
        <div className="container">
          <span className="navbar-brand">E-Test System</span>
          <div className="d-flex">
            <button
              className={`btn ${role === 'teacher' ? 'btn-primary' : 'btn-outline-primary'} me-2`}
              onClick={() => setRole('teacher')}
            >
              Teacher View
            </button>
            <button
              className={`btn ${role === 'student' ? 'btn-info' : 'btn-outline-info'} text-white`}
              onClick={() => setRole('student')}
            >
              Student View
            </button>
          </div>
        </div>
      </nav>

      <main className="container pb-5">
        <div className="text-center mb-5">
          <h1 className="display-4">Welcome to E-Test</h1>
          <p className="lead">Current Role: <span className="badge bg-secondary text-capitalize">{role}</span></p>
        </div>

        {role === 'teacher' ? (
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
