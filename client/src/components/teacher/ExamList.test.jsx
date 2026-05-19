import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExamList from './ExamList';
import Api from '../../api/MockApiService';

vi.mock('../../api/MockApiService', () => ({
  default: {
    getExamsByTeacher: vi.fn(),
    getAttemptsByExam: vi.fn(),
    setExamStatus: vi.fn(),
    deleteExam: vi.fn(),
  },
  ExamStatus: { DRAFT: 'draft', PUBLISHED: 'published', CLOSED: 'closed' },
}));
vi.mock('../../services/NotifyService', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../services/LoggerService', () => ({ default: { info: vi.fn(), error: vi.fn() } }));

const user = { id: 1, name: 'Prof. Smith', role: 'teacher' };
const draftExam = {
  id: 'e1', title: 'Draft Exam', description: 'A test',
  status: 'draft',
  questions: [{ id: 'q1', text: 'Q?', options: ['A', 'B', 'C', 'D'], correctOption: 0 }],
  duration: 30, passingScore: 60,
};

describe('ExamList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Api.getAttemptsByExam.mockResolvedValue([]);
  });

  test('shows loading spinner initially', () => {
    Api.getExamsByTeacher.mockReturnValue(new Promise(() => {}));
    render(<ExamList user={user} onNavigate={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('shows empty state when teacher has no exams', async () => {
    Api.getExamsByTeacher.mockResolvedValue([]);
    render(<ExamList user={user} onNavigate={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(/no exams yet/i)).toBeInTheDocument()
    );
  });

  test('renders exam title and Draft badge', async () => {
    Api.getExamsByTeacher.mockResolvedValue([draftExam]);
    render(<ExamList user={user} onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Draft Exam')).toBeInTheDocument());
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  test('calls onNavigate to create-exam when + Create button clicked', async () => {
    Api.getExamsByTeacher.mockResolvedValue([]);
    const onNavigate = vi.fn();
    render(<ExamList user={user} onNavigate={onNavigate} />);
    await waitFor(() => screen.getByText('+ Create New Exam'));
    fireEvent.click(screen.getByText('+ Create New Exam'));
    expect(onNavigate).toHaveBeenCalledWith('create-exam');
  });

  test('toggles question viewer when View Questions / Hide Questions clicked', async () => {
    Api.getExamsByTeacher.mockResolvedValue([draftExam]);
    render(<ExamList user={user} onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText('View Questions'));
    fireEvent.click(screen.getByText('View Questions'));
    expect(screen.getByText('Hide Questions')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Hide Questions'));
    expect(screen.getByText('View Questions')).toBeInTheDocument();
  });

  test('shows Publish and Edit buttons for a draft exam', async () => {
    Api.getExamsByTeacher.mockResolvedValue([draftExam]);
    render(<ExamList user={user} onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText('Draft Exam'));
    expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
  });
});
