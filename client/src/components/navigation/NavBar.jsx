const NavBar = ({ user, onLogout }) => (
  <nav className="app-navbar">
    <div className="brand">
      <div className="brand-icon">📝</div>
      E-Test System
    </div>

    <div className="user-area">
      <span className="user-name">{user.name}</span>
      <span className={`role-badge ${user.role}`}>{user.role}</span>
      <button className="btn-logout" onClick={onLogout}>Logout</button>
    </div>
  </nav>
);

export default NavBar;
