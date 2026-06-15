import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExamForm from './ExamForm';
import Api from '../../api';
import Notify from '../../services/NotifyService';

vi.mock('../../api', () => ({
  default: { getExamById: vi.fn(), createExam: vi.fn(), updateExam: vi.fn() },
}));
vi.mock('../../services/NotifyService', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock('../../services/LoggerService', () => ({
  default: { info: vi.fn(), error: vi.fn() },
}));

const user = { id: 1, name: 'Prof. Smith', role: 'teacher' };

describe('ExamForm — Create mode', () => {
  beforeEach(() => vi.clearAllMocks());

  test('renders Create New Exam heading', () => {
    render(<ExamForm user={user} onNavigate={vi.fn()} />);
    expect(screen.getByText('Create New Exam')).toBeInTheDocument();
  });

  test('starts with one empty question', () => {
    render(<ExamForm user={user} onNavigate={vi.fn()} />);
    expect(screen.getByText('Questions (1)')).toBeInTheDocument();
  });

  test('shows validation warning when title is empty on submit', () => {
    render(<ExamForm user={user} onNavigate={vi.fn()} />);
    fireEvent.submit(screen.getByRole('button', { name: /create exam/i }).closest('form'));
    expect(Notify.warning).toHaveBeenCalledWith('Title is required.');
  });

  test('adds a new question when Add Question is clicked', () => {
    render(<ExamForm user={user} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByText('+ Add Question'));
    expect(screen.getByText('Questions (2)')).toBeInTheDocument();
  });

  test('removes a question when Remove is clicked', () => {
    render(<ExamForm user={user} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByText('+ Add Question'));
    expect(screen.getByText('Questions (2)')).toBeInTheDocument();
    fireEvent.click(screen.getAllByText('Remove')[0]);
    expect(screen.getByText('Questions (1)')).toBeInTheDocument();
  });

  test('calls Api.createExam on a valid submit', async () => {
    Api.createExam.mockResolvedValue({ id: 'e1' });
    const onNavigate = vi.fn();
    render(<ExamForm user={user} onNavigate={onNavigate} />);

    fireEvent.change(screen.getByPlaceholderText('Exam title'), { target: { value: 'My Exam' } });
    fireEvent.change(screen.getByPlaceholderText('Question text'), { target: { value: 'Q1?' } });
    screen.getAllByPlaceholderText(/Option \d/).forEach((input, i) =>
      fireEvent.change(input, { target: { value: `Opt${i + 1}` } })
    );
    fireEvent.submit(screen.getByRole('button', { name: /create exam/i }).closest('form'));
    await waitFor(() => expect(Api.createExam).toHaveBeenCalled());
  });
});

describe('ExamForm — Edit mode', () => {
  const editExam = {
    title: 'Existing Exam',
    description: 'Desc',
    duration: 45,
    passingScore: 70,
    questions: [{ id: 'q1', text: 'Old Q?', options: ['A', 'B', 'C', 'D'], correctOption: 0 }],
  };

  beforeEach(() => vi.clearAllMocks());

  test('shows loading spinner before exam data arrives', () => {
    Api.getExamById.mockReturnValue(new Promise(() => {}));
    render(<ExamForm user={user} examId="e1" onNavigate={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('renders Edit Exam heading after loading', async () => {
    Api.getExamById.mockResolvedValue(editExam);
    render(<ExamForm user={user} examId="e1" onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Edit Exam')).toBeInTheDocument());
  });

  test('pre-fills form fields from loaded exam data', async () => {
    Api.getExamById.mockResolvedValue(editExam);
    render(<ExamForm user={user} examId="e1" onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByDisplayValue('Existing Exam')).toBeInTheDocument());
    expect(screen.getByDisplayValue('Old Q?')).toBeInTheDocument();
  });
});
