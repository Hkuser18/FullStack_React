const TEACHER_ITEMS = [
  { key: 'my-exams',        label: 'My Exams',        icon: '📋' },
  { key: 'create-exam',     label: 'Create Exam',     icon: '✏️'  },
  { key: 'question-bank',   label: 'Question Bank',   icon: '🗂️'  },
  { key: 'student-results', label: 'Student Results', icon: '📊' },
];

const STUDENT_ITEMS = [
  { key: 'available-exams', label: 'Available Exams', icon: '📚' },
  { key: 'my-results',      label: 'My Results',      icon: '🏆' },
];

const ADMIN_ITEMS = [
  { key: 'admin-panel', label: 'Teacher Approvals', icon: '🛡️' },
];

const ROLE_LABELS = { teacher: 'Teacher Panel', student: 'Student Panel', admin: 'Admin Panel' };

const SideMenu = ({ role, activePage, onNavigate, isOpen }) => {
  const items = role === 'teacher' ? TEACHER_ITEMS
              : role === 'admin'   ? ADMIN_ITEMS
              : STUDENT_ITEMS;

  return (
    <aside className={`app-sidebar${isOpen ? ' open' : ''}`}>
      <div className="sidebar-header">
        <span>{ROLE_LABELS[role] ?? 'Panel'}</span>
      </div>

      <nav className="sidebar-nav">
        {items.map(item => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`sidebar-item${activePage === item.key ? ' active' : ''}`}
          >
            <span className="item-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default SideMenu;
