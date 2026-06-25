const ComingSoon = ({ title }) => (
  <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
    <div className="display-1 mb-3" style={{ opacity: 0.15 }}>&#9998;</div>
    <h4>{title}</h4>
    <p className="mb-0">This page is under construction.</p>
  </div>
);

export default ComingSoon;
