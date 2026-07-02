import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import StudentResults from './StudentResults';
import Api from '../../api';

vi.mock('../../api', () => ({
  default: {
    getExamsByTeacher: vi.fn(),
    getAttemptsByExam: vi.fn(),
    getUsers: vi.fn(),
    gradeAttempt: vi.fn(),
  },
}));
vi.mock('../../services/NotifyService', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('../../services/LoggerService', () => ({ default: { error: vi.fn() } }));

const user = { id: 1, name: 'Prof. Smith', role: 'teacher' };
const exams = [
  { id: 'e1', title: 'Math Quiz' },
  { id: 'e2', title: 'Science Quiz' },
];
const attempt = {
  id: 'a1', studentId: 's1', score: 75, passed: true,
  submittedAt: new Date().toISOString(),
};
const users = [{ id: 's1', name: 'Alice' }];

describe('StudentResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Api.getExamsByTeacher.mockResolvedValue(exams);
    Api.getAttemptsByExam.mockResolvedValue([attempt]);
    Api.getUsers.mockResolvedValue(users);
  });

  test('renders the Student Results heading', () => {
    render(<StudentResults user={user} onNavigate={vi.fn()} />);
    expect(screen.getByText('Student Results')).toBeInTheDocument();
  });

  test('populates exam select with teacher exams', async () => {
    render(<StudentResults user={user} onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Math Quiz')).toBeInTheDocument());
    expect(screen.getByText('Science Quiz')).toBeInTheDocument();
  });

  test('shows student name and score in results table', async () => {
    render(<StudentResults user={user} onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.getAllByText('75%').length).toBeGreaterThan(0);
  });

  test('shows Passed badge for a passing attempt', async () => {
    render(<StudentResults user={user} onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice'));
    expect(screen.getByText('Passed')).toBeInTheDocument();
  });

  test('shows no submissions message when exam has no attempts', async () => {
    Api.getAttemptsByExam.mockResolvedValue([]);
    render(<StudentResults user={user} onNavigate={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(/no submissions yet/i)).toBeInTheDocument()
    );
  });

  test('calls onNavigate with my-exams when Back is clicked', () => {
    const onNavigate = vi.fn();
    render(<StudentResults user={user} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onNavigate).toHaveBeenCalledWith('my-exams');
  });

  test('shows Failed badge for a failed attempt', async () => {
    const failedAttempt = { ...attempt, score: 30, passed: false };
    Api.getAttemptsByExam.mockResolvedValue([failedAttempt]);
    render(<StudentResults user={user} onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice'));
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  test('shows summary stats when attempts exist', async () => {
    render(<StudentResults user={user} onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice'));
    expect(screen.getByText('Submissions')).toBeInTheDocument();
    expect(screen.getByText('Avg Score')).toBeInTheDocument();
    expect(screen.getByText('Pass Rate')).toBeInTheDocument();
  });

  test('reloads attempts when a different exam is selected', async () => {
    render(<StudentResults user={user} onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice'));
    Api.getAttemptsByExam.mockResolvedValue([]);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e2' } });
    await waitFor(() =>
      expect(screen.getByText(/no submissions yet/i)).toBeInTheDocument()
    );
  });

  test('shows "No feedback yet" when an attempt has no feedback', async () => {
    render(<StudentResults user={user} onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice'));
    expect(screen.getByText(/no feedback yet/i)).toBeInTheDocument();
  });

  test('clicking Grade opens score/feedback inputs pre-filled with current values', async () => {
    render(<StudentResults user={user} onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice'));
    fireEvent.click(screen.getByRole('button', { name: /grade/i }));
    expect(screen.getByDisplayValue('75')).toBeInTheDocument();
  });

  test('saving a grade calls Api.gradeAttempt and updates the row', async () => {
    Api.gradeAttempt.mockResolvedValue({ ...attempt, score: 90, passed: true, feedback: 'Great work!' });
    render(<StudentResults user={user} onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice'));
    fireEvent.click(screen.getByRole('button', { name: /grade/i }));
    fireEvent.change(screen.getByDisplayValue('75'), { target: { value: '90' } });
    fireEvent.change(screen.getByPlaceholderText(/feedback for the student/i), { target: { value: 'Great work!' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(Api.gradeAttempt).toHaveBeenCalledWith('a1', { score: 90, feedback: 'Great work!' }));
    await waitFor(() => expect(screen.getByText('Great work!')).toBeInTheDocument());
  });

  test('cancelling an edit discards changes', async () => {
    render(<StudentResults user={user} onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText('Alice'));
    fireEvent.click(screen.getByRole('button', { name: /grade/i }));
    fireEvent.change(screen.getByDisplayValue('75'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByRole('button', { name: /grade/i })).toBeInTheDocument();
    expect(screen.queryByDisplayValue('10')).not.toBeInTheDocument();
    expect(Api.gradeAttempt).not.toHaveBeenCalled();
  });
});
