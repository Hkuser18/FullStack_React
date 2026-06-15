const QuestionViewer = ({ question }) => {
  if (!question) return null;

  return (
    <div className="card mb-3 border-light shadow-sm">
      <div className="card-body">
        <div className="d-flex align-items-center gap-2 mb-2">
          <h5 className="card-title mb-0">{question.text}</h5>
          {question.type === 'open' && (
            <span className="badge bg-info">Open</span>
          )}
        </div>

        {question.type === 'open' ? (
          <p className="text-muted small mb-0">
            Keywords: {(question.keywords ?? []).join(', ') || '—'}
          </p>
        ) : (
          <div className="list-group mt-3">
            {(question.options ?? []).map((option, index) => (
              <div
                key={index}
                className={`list-group-item d-flex justify-content-between align-items-center ${index === question.correctOption ? 'list-group-item-success' : ''}`}
              >
                {option}
                {index === question.correctOption && (
                  <span className="badge bg-success rounded-pill">Correct Answer</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionViewer;
