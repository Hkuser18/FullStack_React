import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from './RegisterPage';
import Auth from '../services/AuthService';

vi.mock('../services/AuthService', () => ({ default: { register: vi.fn() } }));
vi.mock('../services/NotifyService', () => ({ default: { success: vi.fn() } }));
vi.mock('../services/LoggerService', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const setup = (props = {}) => {
  const onRegister = vi.fn();
  const onGoToLogin = vi.fn();
  render(<RegisterPage onRegister={onRegister} onGoToLogin={onGoToLogin} {...props} />);
  return { onRegister, onGoToLogin };
};

describe('RegisterPage', () => {
  beforeEach(() => vi.clearAllMocks());

  test('renders all form inputs', () => {
    setup();
    expect(screen.getByPlaceholderText('Choose a username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Choose a password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Repeat your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  test('shows error when passwords do not match', () => {
    setup();
    fireEvent.change(screen.getByPlaceholderText('Choose a username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByPlaceholderText('Choose a password'), { target: { value: '1234' } });
    fireEvent.change(screen.getByPlaceholderText('Repeat your password'), { target: { value: '5678' } });
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form'));
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
  });

  test('shows error when password is too short', () => {
    setup();
    fireEvent.change(screen.getByPlaceholderText('Choose a password'), { target: { value: 'ab' } });
    fireEvent.change(screen.getByPlaceholderText('Repeat your password'), { target: { value: 'ab' } });
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form'));
    expect(screen.getByText('Password must be at least 4 characters.')).toBeInTheDocument();
  });

  test('calls onRegister on successful registration', async () => {
    Auth.register.mockResolvedValue({ id: 1, name: 'alice' });
    const { onRegister } = setup();
    fireEvent.change(screen.getByPlaceholderText('Choose a username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByPlaceholderText('Choose a password'), { target: { value: '1234' } });
    fireEvent.change(screen.getByPlaceholderText('Repeat your password'), { target: { value: '1234' } });
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form'));
    await waitFor(() => expect(onRegister).toHaveBeenCalled());
  });

  test('shows server error message on registration failure', async () => {
    Auth.register.mockRejectedValue(new Error('Username already taken'));
    setup();
    fireEvent.change(screen.getByPlaceholderText('Choose a username'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByPlaceholderText('Choose a password'), { target: { value: '1234' } });
    fireEvent.change(screen.getByPlaceholderText('Repeat your password'), { target: { value: '1234' } });
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form'));
    await waitFor(() => expect(screen.getByText('Username already taken')).toBeInTheDocument());
  });

  test('calls onGoToLogin when login link is clicked', () => {
    const { onGoToLogin } = setup();
    fireEvent.click(screen.getByRole('button', { name: /already have an account/i }));
    expect(onGoToLogin).toHaveBeenCalled();
  });
});
