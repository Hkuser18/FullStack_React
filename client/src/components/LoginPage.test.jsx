import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from './LoginPage';
import Auth from '../services/AuthService';

vi.mock('../services/AuthService', () => ({
  default: { login: vi.fn() },
}));
vi.mock('../services/NotifyService', () => ({
  default: { success: vi.fn() },
}));
vi.mock('../services/LoggerService', () => ({
  default: { warn: vi.fn(), info: vi.fn() },
}));

const setup = (props = {}) => {
  const onLogin = vi.fn();
  const onGoToRegister = vi.fn();
  render(<LoginPage onLogin={onLogin} onGoToRegister={onGoToRegister} {...props} />);
  return { onLogin, onGoToRegister };
};

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks());

  test('renders username, password inputs and login button', () => {
    setup();
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login as student/i })).toBeInTheDocument();
  });

  test('default role is student', () => {
    setup();
    expect(screen.getByRole('button', { name: /login as student/i })).toBeInTheDocument();
  });

  test('switching to Teacher role updates submit button text', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /^teacher$/i }));
    expect(screen.getByRole('button', { name: /login as teacher/i })).toBeInTheDocument();
  });

  test('shows error message on failed login', () => {
    Auth.login.mockReturnValue(null);
    setup();
    fireEvent.change(screen.getByPlaceholderText('Enter username'), { target: { value: 'bad' } });
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'bad' } });
    fireEvent.submit(screen.getByRole('button', { name: /login as student/i }).closest('form'));
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid username, password, or role.');
  });

  test('calls onLogin with user on successful login', () => {
    const fakeUser = { id: 1, name: 'Alice', role: 'student' };
    Auth.login.mockReturnValue(fakeUser);
    const { onLogin } = setup();
    fireEvent.change(screen.getByPlaceholderText('Enter username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: '1234' } });
    fireEvent.submit(screen.getByRole('button', { name: /login as student/i }).closest('form'));
    expect(onLogin).toHaveBeenCalledWith(fakeUser);
  });

  test('clicking Register link calls onGoToRegister', () => {
    const { onGoToRegister } = setup();
    fireEvent.click(screen.getByRole('button', { name: /register here/i }));
    expect(onGoToRegister).toHaveBeenCalled();
  });
});
