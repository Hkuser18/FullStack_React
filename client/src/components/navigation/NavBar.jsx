const NavBar = ({ user, onLogout, onToggleSidebar, sidebarOpen }) => (
  <nav className="app-navbar">
    <div className="navbar-left">
      <button
        className="hamburger-btn"
        onClick={onToggleSidebar}
        aria-label="Toggle menu"
        aria-expanded={sidebarOpen}
      >
        <span className={`hamburger-line${sidebarOpen ? ' open' : ''}`} />
        <span className={`hamburger-line${sidebarOpen ? ' open' : ''}`} />
        <span className={`hamburger-line${sidebarOpen ? ' open' : ''}`} />
      </button>
      <div className="brand">
        <div className="brand-icon">📝</div>
        <span className="brand-text">E-Test System</span>
      </div>
    </div>

    <div className="user-area">
      <span className="user-name">{user.name}</span>
      <span className={`role-badge ${user.role}`}>{user.role}</span>
      <button className="btn-logout" onClick={onLogout}>Logout</button>
    </div>
  </nav>
);

export default NavBar;
