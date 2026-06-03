import { render, screen, fireEvent, act } from '@testing-library/react';
import NotifyToast from './NotifyToast';
import NotifyService from '../../services/NotifyService';

vi.mock('../../services/LoggerService', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('NotifyToast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('renders nothing when no toasts are active', () => {
    const { container } = render(<NotifyToast />);
    expect(container.firstChild).toBeNull();
  });

  test('shows a toast when NotifyService emits a message', () => {
    render(<NotifyToast />);
    act(() => { NotifyService.success('Hello World'); });
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  test('shows an error toast', () => {
    render(<NotifyToast />);
    act(() => { NotifyService.error('Something went wrong'); });
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  test('dismisses a toast when the close button is clicked', () => {
    render(<NotifyToast />);
    act(() => { NotifyService.success('Dismiss me'); });
    expect(screen.getByText('Dismiss me')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument();
  });

  test('auto-dismisses toast after its duration', () => {
    render(<NotifyToast />);
    act(() => { NotifyService.success('Auto dismiss'); });
    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
  });
});
