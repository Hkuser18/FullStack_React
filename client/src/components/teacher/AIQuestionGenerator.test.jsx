import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AIQuestionGenerator from './AIQuestionGenerator';
import Api from '../../api';

vi.mock('../../api', () => ({
  default: { generateQuestions: vi.fn(), addQuestion: vi.fn() },
}));
vi.mock('../../services/NotifyService', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock('../../services/LoggerService', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const user = { id: 'u1', name: 'Dr. Smith', role: 'teacher' };
const mcQuestion = {
  id: 'ai_1', type: 'multiple-choice', topic: 'JavaScript', text: 'What is a closure?',
  options: ['A function with lexical scope', 'A loop', 'A CSS rule', 'A database'], correctOption: 0,
};
const openQuestion = {
  id: 'ai_2', type: 'open', topic: 'JavaScript', text: 'Explain hoisting.',
  keywords: ['hoisting', 'declaration'],
};

describe('AIQuestionGenerator', () => {
  beforeEach(() => vi.clearAllMocks());

  test('warns instead of calling the API when topic is empty', () => {
    render(<AIQuestionGenerator user={user} onAdd={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }));
    expect(Api.generateQuestions).not.toHaveBeenCalled();
  });

  test('generates and previews questions with both selected by default', async () => {
    Api.generateQuestions.mockResolvedValue([mcQuestion, openQuestion]);
    render(<AIQuestionGenerator user={user} onAdd={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/e.g. javascript closures/i), { target: { value: 'JavaScript' } });
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }));

    await waitFor(() => expect(screen.getByText('What is a closure?')).toBeInTheDocument());
    expect(screen.getByText('Explain hoisting.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add 2 selected to bank/i })).toBeInTheDocument();
    expect(Api.generateQuestions).toHaveBeenCalledWith({ topic: 'JavaScript', count: 5, type: 'mixed' });
  });

  test('deselecting a question excludes it from the add count', async () => {
    Api.generateQuestions.mockResolvedValue([mcQuestion, openQuestion]);
    render(<AIQuestionGenerator user={user} onAdd={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/e.g. javascript closures/i), { target: { value: 'JavaScript' } });
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }));
    await waitFor(() => screen.getByText('What is a closure?'));

    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.getByRole('button', { name: /add 1 selected to bank/i })).toBeInTheDocument();
  });

  test('adding selected questions saves each one and calls onAdd/onClose', async () => {
    Api.generateQuestions.mockResolvedValue([mcQuestion, openQuestion]);
    Api.addQuestion.mockImplementation(data => Promise.resolve({ ...data, id: `qb_${data.text.length}` }));
    const onAdd = vi.fn();
    const onClose = vi.fn();
    render(<AIQuestionGenerator user={user} onAdd={onAdd} onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText(/e.g. javascript closures/i), { target: { value: 'JavaScript' } });
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }));
    await waitFor(() => screen.getByText('What is a closure?'));

    fireEvent.click(screen.getByRole('button', { name: /add 2 selected to bank/i }));
    await waitFor(() => expect(onAdd).toHaveBeenCalled());
    expect(Api.addQuestion).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalled();
  });

  test('shows an error notification when generation fails', async () => {
    const Notify = (await import('../../services/NotifyService')).default;
    Api.generateQuestions.mockRejectedValue(new Error('AI declined'));
    render(<AIQuestionGenerator user={user} onAdd={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/e.g. javascript closures/i), { target: { value: 'JavaScript' } });
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }));

    await waitFor(() => expect(Notify.error).toHaveBeenCalledWith('AI declined'));
  });

  test('close button calls onClose', () => {
    const onClose = vi.fn();
    render(<AIQuestionGenerator user={user} onAdd={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
