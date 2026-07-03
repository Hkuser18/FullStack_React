import { render, screen, waitFor } from '@testing-library/react';
import Analytics from './Analytics';
import Api from '../../api';

vi.mock('../../api', () => ({
  default: {
    getExamsByTeacher: vi.fn(),
    getAttemptsByExam: vi.fn(),
  },
}));
vi.mock('../../services/NotifyService', () => ({ default: { error: vi.fn() } }));
vi.mock('../../services/LoggerService', () => ({ default: { error: vi.fn() } }));

const user = { id: 1, name: 'Prof. Smith', role: 'teacher' };

const exams = [
  {
    id: 'e1', title: 'Math Quiz', status: 'published',
    questions: [
      { id: 'q1', type: 'multiple-choice', text: 'What is 2+2?', options: ['3', '4', '5', '6'], correctOption: 1 },
      { id: 'q2', type: 'open', text: 'Explain gravity', keywords: ['force', 'mass'] },
    ],
  },
  { id: 'e2', title: 'Science Quiz', status: 'draft', questions: [] },
];

// Both attempts get q1 (multiple-choice) right, both get q2 (open, keyword match) wrong —
// gives unambiguous, distinct per-question percentages for the sort-order test.
const e1Attempts = [
  { id: 'a1', studentId: 's1', answers: [1, 'no clue'],  score: 50, passed: false, submittedAt: new Date().toISOString() },
  { id: 'a2', studentId: 's2', answers: [1, 'dunno'],    score: 50, passed: false, submittedAt: new Date().toISOString() },
];

describe('Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Api.getExamsByTeacher.mockResolvedValue(exams);
    Api.getAttemptsByExam.mockImplementation(examId =>
      Promise.resolve(examId === 'e1' ? e1Attempts : [])
    );
  });

  test('shows a loading spinner before data resolves', () => {
    render(<Analytics user={user} onNavigate={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('renders the Analytics heading', async () => {
    render(<Analytics user={user} onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Analytics')).toBeInTheDocument());
  });

  test('shows correct cross-exam summary aggregates', async () => {
    render(<Analytics user={user} onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Total Exams')).toBeInTheDocument());
    // "2" also appears in the breakdown table's Attempts column, so scope to the stat card itself.
    expect(screen.getByText('Total Exams').previousSibling).toHaveTextContent('2');
    expect(screen.getByText('Total Submissions').previousSibling).toHaveTextContent('2');
    expect(screen.getByText('Overall Avg Score').previousSibling).toHaveTextContent('50%');
    expect(screen.getByText('Overall Pass Rate').previousSibling).toHaveTextContent('0%');
  });

  test('per-exam breakdown table shows both exams with correct stats', async () => {
    render(<Analytics user={user} onNavigate={vi.fn()} />);
    // "Math Quiz"/"Science Quiz" also appear as <option>s in the two exam selectors, so use AllBy.
    await waitFor(() => expect(screen.getAllByText('Math Quiz').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Science Quiz').length).toBeGreaterThan(0);
    const row = screen.getByText('Math Quiz', { selector: 'td' }).closest('tr');
    expect(row).toHaveTextContent('Published');
    expect(row).toHaveTextContent('2'); // attempts
    expect(row).toHaveTextContent('50%'); // avg score
    expect(row).toHaveTextContent('0%'); // pass rate
    // Science Quiz has zero attempts -> dash placeholders, not "NaN%"
    const scienceRow = screen.getByText('Science Quiz', { selector: 'td' }).closest('tr');
    expect(scienceRow).toHaveTextContent('—');
  });

  test('per-question difficulty is sorted ascending by % correct', async () => {
    render(<Analytics user={user} onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Explain gravity/)).toBeInTheDocument());
    const text = document.body.textContent;
    // q2 (0% correct) must appear before q1 (100% correct) in the DOM
    expect(text.indexOf('Explain gravity')).toBeLessThan(text.indexOf('What is 2+2?'));
    expect(screen.getByText('0% correct')).toBeInTheDocument();
    expect(screen.getByText('100% correct')).toBeInTheDocument();
  });

  test('shows empty state when teacher has zero exams', async () => {
    Api.getExamsByTeacher.mockResolvedValue([]);
    render(<Analytics user={user} onNavigate={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(/no exams yet/i)).toBeInTheDocument()
    );
  });
});
