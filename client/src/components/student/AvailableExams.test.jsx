import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AvailableExams from './AvailableExams';
import Api from '../../api/MockApiService';

vi.mock('../../api/MockApiService', () => ({
  default: { getPublishedExams: vi.fn(), hasAttempted: vi.fn() },
}));
vi.mock('../../services/NotifyService', () => ({ default: { error: vi.fn() } }));
vi.mock('../../services/LoggerService', () => ({ default: { error: vi.fn() } }));

const user = { id: 1, name: 'Alice', role: 'student' };
const exam = {
  id: 'e1', title: 'Math Quiz', description: 'Basic math',
  questions: [{}], duration: 30, passingScore: 60,
};

describe('AvailableExams', () => {
  beforeEach(() => vi.clearAllMocks());

  test('shows loading spinner initially', () => {
    Api.getPublishedExams.mockReturnValue(new Promise(() => {}));
    render(<AvailableExams user={user} onNavigate={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('shows exam list after loading', async () => {
    Api.getPublishedExams.mockResolvedValue([exam]);
    Api.hasAttempted.mockResolvedValue(false);
    render(<AvailableExams user={user} onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Math Quiz')).toBeInTheDocument());
  });

  test('shows empty state when no exams are available', async () => {
    Api.getPublishedExams.mockResolvedValue([]);
    render(<AvailableExams user={user} onNavigate={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(/no exams are currently available/i)).toBeInTheDocument()
    );
  });

  test('shows Already Submitted button for a completed exam', async () => {
    Api.getPublishedExams.mockResolvedValue([exam]);
    Api.hasAttempted.mockResolvedValue(true);
    render(<AvailableExams user={user} onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Already Submitted')).toBeInTheDocument());
    expect(screen.getByText('Already Submitted')).toBeDisabled();
  });

  test('calls onNavigate with take-exam when Take Exam is clicked', async () => {
    const onNavigate = vi.fn();
    Api.getPublishedExams.mockResolvedValue([exam]);
    Api.hasAttempted.mockResolvedValue(false);
    render(<AvailableExams user={user} onNavigate={onNavigate} />);
    await waitFor(() => screen.getByText('Take Exam'));
    fireEvent.click(screen.getByText('Take Exam'));
    expect(onNavigate).toHaveBeenCalledWith('take-exam', { examId: 'e1' });
  });
});
