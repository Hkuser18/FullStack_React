import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import QuestionImportExport, { parseCSVRow, escapeCSV } from './QuestionImportExport';
import Notify from '../../services/NotifyService';

vi.mock('../../services/LoggerService', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../services/NotifyService', () => ({
  default: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

describe('QuestionImportExport unit functions', () => {
  test('parseCSVRow correctly handles quoted strings', () => {
    const row = parseCSVRow('open,JS,"What is a ""closure""?",,,,,,"lexical, scope"');
    expect(row).toEqual(['open', 'JS', 'What is a "closure"?', '', '', '', '', '', 'lexical, scope']);
  });

  test('escapeCSV correctly escapes quotes and commas', () => {
    expect(escapeCSV('hello')).toBe('hello');
    expect(escapeCSV('hello, world')).toBe('"hello, world"');
    expect(escapeCSV('He said "Hi"')).toBe('"He said ""Hi"""');
  });
});

describe('QuestionImportExport Component', () => {
  beforeAll(() => {
    global.URL.createObjectURL = vi.fn();
    global.URL.revokeObjectURL = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders import and export buttons', () => {
    render(<QuestionImportExport onImport={() => {}} />);
    expect(screen.getByText('⬆️ Import CSV')).toBeInTheDocument();
    expect(screen.getByText('⬇️ Export CSV')).toBeInTheDocument();
  });

  test('shows warning when exporting an empty list', () => {
    render(<QuestionImportExport onImport={() => {}} questionsToExport={[]} />);
    fireEvent.click(screen.getByText('⬇️ Export CSV'));
    expect(Notify.warning).toHaveBeenCalledWith('No questions to export.');
  });

  test('exports questions correctly', () => {
    const questions = [
      { type: 'open', text: 'Hello, World', keywords: ['a', 'b'] }
    ];
    render(<QuestionImportExport onImport={() => {}} questionsToExport={questions} />);
    fireEvent.click(screen.getByText('⬇️ Export CSV'));
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });
});
