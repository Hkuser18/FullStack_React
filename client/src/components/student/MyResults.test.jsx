import { render, screen, waitFor } from '@testing-library/react';
import MyResults from './MyResults';
import Api from '../../api/MockApiService';

vi.mock('../../api/MockApiService', () => ({
  default: { getAttemptsByStudent: vi.fn(), getExams: vi.fn() },
}));
vi.mock('../../services/NotifyService', () => ({ default: { error: vi.fn() } }));
vi.mock('../../services/LoggerService', () => ({ default: { error: vi.fn() } }));

const user = { id: 1, name: 'Alice', role: 'student' };
const exams = [{ id: 'e1', title: 'Math Quiz' }];
const attempts = [
  { id: 'a1', examId: 'e1', score: 80, passed: true, submittedAt: new Date().toISOString() },
];

describe('MyResults', () => {
  beforeEach(() => vi.clearAllMocks());

  test('shows loading spinner initially', () => {
    Api.getAttemptsByStudent.mockReturnValue(new Promise(() => {}));
    Api.getExams.mockReturnValue(new Promise(() => {}));
    render(<MyResults user={user} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('shows empty state when student has no attempts', async () => {
    Api.getAttemptsByStudent.mockResolvedValue([]);
    Api.getExams.mockResolvedValue([]);
    render(<MyResults user={user} />);
    await waitFor(() =>
      expect(screen.getByText(/you have not taken any exams yet/i)).toBeInTheDocument()
    );
  });

  test('renders the exam history table with attempt data', async () => {
    Api.getAttemptsByStudent.mockResolvedValue(attempts);
    Api.getExams.mockResolvedValue(exams);
    render(<MyResults user={user} />);
    await waitFor(() => expect(screen.getByText('Math Quiz')).toBeInTheDocument());
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
  });

  test('shows Passed badge for a passing attempt', async () => {
    Api.getAttemptsByStudent.mockResolvedValue(attempts);
    Api.getExams.mockResolvedValue(exams);
    render(<MyResults user={user} />);
    await waitFor(() => screen.getByText('Exam History'));
    const badges = screen.getAllByText('Passed');
    expect(badges.length).toBeGreaterThan(0);
  });

  test('shows summary stat cards when attempts exist', async () => {
    Api.getAttemptsByStudent.mockResolvedValue(attempts);
    Api.getExams.mockResolvedValue(exams);
    render(<MyResults user={user} />);
    await waitFor(() => expect(screen.getByText('Exams Taken')).toBeInTheDocument());
    expect(screen.getByText('Avg Score')).toBeInTheDocument();
  });
});
