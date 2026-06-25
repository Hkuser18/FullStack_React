import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TakeExam from './TakeExam';
import Api from '../../api';

vi.mock('../../api', () => ({
  default: { getExamById: vi.fn(), submitAttempt: vi.fn() },
}));
vi.mock('../../services/NotifyService', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock('../../services/LoggerService', () => ({
  default: { info: vi.fn(), error: vi.fn() },
}));

const user = { id: 1, name: 'Alice', role: 'student' };
const exam = {
  id: 'e1',
  title: 'Math Quiz',
  duration: 30,
  passingScore: 60,
  questions: [
    { id: 'q1', text: 'What is 2+2?', options: ['3', '4', '5', '6'], correctOption: 1 },
    { id: 'q2', text: 'What is 3+3?', options: ['5', '6', '7', '8'], correctOption: 1 },
  ],
};

describe('TakeExam', () => {
  beforeEach(() => vi.clearAllMocks());

  test('shows loading spinner while exam loads', () => {
    Api.getExamById.mockReturnValue(new Promise(() => {}));
    render(<TakeExam user={user} examId="e1" onNavigate={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('renders exam title and questions after loading', async () => {
    Api.getExamById.mockResolvedValue(exam);
    render(<TakeExam user={user} examId="e1" onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Math Quiz')).toBeInTheDocument());
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    expect(screen.getByText('What is 3+3?')).toBeInTheDocument();
  });

  test('all questions start as Unanswered', async () => {
    Api.getExamById.mockResolvedValue(exam);
    render(<TakeExam user={user} examId="e1" onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText('What is 2+2?'));
    expect(screen.getAllByText('Unanswered')).toHaveLength(2);
  });

  test('selecting an answer marks the question as Answered', async () => {
    Api.getExamById.mockResolvedValue(exam);
    render(<TakeExam user={user} examId="e1" onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText('What is 2+2?'));
    fireEvent.click(screen.getByText('4'));
    expect(screen.getAllByText('Answered')).toHaveLength(1);
    expect(screen.getAllByText('Unanswered')).toHaveLength(1);
  });

  test('shows result screen with score after submission', async () => {
    Api.getExamById.mockResolvedValue(exam);
    Api.submitAttempt.mockResolvedValue({ score: 100, passed: true });
    render(<TakeExam user={user} examId="e1" onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText('Math Quiz'));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() =>
      expect(screen.getByText(/you passed/i)).toBeInTheDocument()
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('navigates away when exam fails to load', async () => {
    Api.getExamById.mockRejectedValue(new Error('Not found'));
    const onNavigate = vi.fn();
    render(<TakeExam user={user} examId="e1" onNavigate={onNavigate} />);
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('available-exams'));
  });

  test('shows fail screen when exam is not passed', async () => {
    Api.getExamById.mockResolvedValue(exam);
    Api.submitAttempt.mockResolvedValue({ score: 20, passed: false });
    render(<TakeExam user={user} examId="e1" onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText('Math Quiz'));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() =>
      expect(screen.getByText(/not passed/i)).toBeInTheDocument()
    );
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  test('Back to Exams and View All My Results buttons appear on result screen', async () => {
    Api.getExamById.mockResolvedValue(exam);
    Api.submitAttempt.mockResolvedValue({ score: 100, passed: true });
    render(<TakeExam user={user} examId="e1" onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText('Math Quiz'));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => screen.getByText(/you passed/i));
    expect(screen.getAllByRole('button', { name: /back to exams/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /view my results/i }).length).toBeGreaterThan(0);
  });

  test('Abandon button calls onNavigate to available-exams', async () => {
    Api.getExamById.mockResolvedValue(exam);
    const onNavigate = vi.fn();
    render(<TakeExam user={user} examId="e1" onNavigate={onNavigate} />);
    await waitFor(() => screen.getByText('Math Quiz'));
    fireEvent.click(screen.getByRole('button', { name: /abandon/i }));
    expect(onNavigate).toHaveBeenCalledWith('available-exams');
  });
});
