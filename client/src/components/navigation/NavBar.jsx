const NavBar = ({ user, onLogout }) => (
  <nav className="navbar navbar-dark bg-dark px-4 py-2" style={{ height: 56 }}>
    <span className="navbar-brand fw-bold fs-5">E-Test System</span>
    <div className="d-flex align-items-center gap-3">
      <span className="text-white-50 small">Logged in as</span>
      <span className="text-white fw-semibold">{user.name}</span>
      <span className={`badge ${user.role === 'teacher' ? 'bg-primary' : 'bg-info text-dark'}`}>
        {user.role}
      </span>
      <button className="btn btn-outline-light btn-sm" onClick={onLogout}>
        Logout
      </button>
    </div>
  </nav>
);

export default NavBar;
