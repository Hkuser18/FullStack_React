// SideMenu - תפריט צד מבוסס תפקיד (role-based)
// מורה ותלמיד רואים פריטי תפריט שונים לגמרי - מניעת גישה לא רלוונטית
// onNavigate מגיע מ-App.jsx - מאפשר ניווט ללא React Router
const TEACHER_ITEMS = [
  { key: 'my-exams',        label: 'My Exams'        },
  { key: 'create-exam',     label: 'Create Exam'     },
  { key: 'student-results', label: 'Student Results' },
];

const STUDENT_ITEMS = [
  { key: 'available-exams', label: 'Available Exams' },
  { key: 'my-results',      label: 'My Results'      },
];

const SideMenu = ({ role, activePage, onNavigate }) => {
  const items = role === 'teacher' ? TEACHER_ITEMS : STUDENT_ITEMS;

  return (
    <aside
      className="d-flex flex-column bg-white border-end"
      style={{ minWidth: 220, width: 220 }}
    >
      <div className="px-3 py-2 border-bottom bg-light">
        <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem', letterSpacing: 1 }}>
          {role === 'teacher' ? 'Teacher Panel' : 'Student Panel'}
        </small>
      </div>

      <nav className="nav flex-column p-2 gap-1 mt-1">
        {items.map(item => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`btn text-start px-3 py-2 border-0 ${
              activePage === item.key
                ? 'btn-primary fw-semibold'
                : 'btn-light text-secondary'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default SideMenu;
