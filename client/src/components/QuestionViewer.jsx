import React from 'react';

/**
 * A simple component to display a single question and its options.
 * @param {Object} props - The component props.
 * @param {Object} props.question - The question object to display.
 * @returns {JSX.Element|null} - The rendered question or null if no question is provided.
 */
const QuestionViewer = ({ question }) => {
  if (!question) return null;

  return (
    <div className="card mb-3 border-light shadow-sm">
      <div className="card-body">
        <h5 className="card-title">{question.text}</h5>
        <div className="list-group mt-3">
          {question.options.map((option, index) => (
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
      </div>
    </div>
  );
};

export default QuestionViewer;
