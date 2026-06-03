import { render, screen } from '@testing-library/react';
import QuestionViewer from './QuestionViewer';

const question = {
  text: 'What is 2+2?',
  options: ['3', '4', '5', '6'],
  correctOption: 1,
};

describe('QuestionViewer', () => {
  test('renders nothing when question is null', () => {
    const { container } = render(<QuestionViewer question={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders question text', () => {
    render(<QuestionViewer question={question} />);
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
  });

  test('renders all answer options', () => {
    render(<QuestionViewer question={question} />);
    ['3', '4', '5', '6'].forEach(opt =>
      expect(screen.getByText(opt)).toBeInTheDocument()
    );
  });

  test('shows Correct Answer badge on the correct option only', () => {
    render(<QuestionViewer question={question} />);
    expect(screen.getAllByText('Correct Answer')).toHaveLength(1);
  });

  test('correct option is the one at correctOption index', () => {
    render(<QuestionViewer question={question} />);
    const badge = screen.getByText('Correct Answer');
    expect(badge.closest('.list-group-item')).toHaveTextContent('4');
  });
});
