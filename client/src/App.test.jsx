import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import Auth from './services/AuthService';

vi.mock('./components/teacher/ExamList',       () => ({ default: () => <div>ExamList</div> }));
vi.mock('./components/teacher/ExamForm',       () => ({ default: () => <div>ExamForm</div> }));
vi.mock('./components/teacher/StudentResults', () => ({ default: () => <div>StudentResults</div> }));
vi.mock('./components/student/AvailableExams', () => ({ default: () => <div>AvailableExams</div> }));
vi.mock('./components/student/TakeExam',       () => ({ default: () => <div>TakeExam</div> }));
vi.mock('./components/student/MyResults',      () => ({ default: () => <div>MyResults</div> }));

vi.mock('./services/AuthService', () => ({
  default: { getCurrentUser: vi.fn(), logout: vi.fn(), login: vi.fn() },
}));
vi.mock('./services/LoggerService', () => ({
  default: { info: vi.fn() },
}));
vi.mock('./services/NotifyService', () => ({
  default: {
    info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  },
}));

const teacher = { id: 'u1', name: 'Dr. Smith', role: 'teacher' };
const student = { id: 'u3', name: 'Alice',    role: 'student' };

describe('App', () => {
  beforeEach(() => vi.clearAllMocks());

  test('shows LoginPage when no user is logged in', () => {
    Auth.getCurrentUser.mockReturnValue(null);
    render(<App />);
    expect(screen.getByRole('button', { name: /login as student/i })).toBeInTheDocument();
  });

  test('clicking Register link switches to RegisterPage', () => {
    Auth.getCurrentUser.mockReturnValue(null);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /register here/i }));
    expect(screen.getByRole('heading', { name: /register/i })).toBeInTheDocument();
  });

  test('clicking Login link on RegisterPage returns to LoginPage', () => {
    Auth.getCurrentUser.mockReturnValue(null);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /register here/i }));
    fireEvent.click(screen.getByRole('button', { name: /already have an account/i }));
    expect(screen.getByRole('button', { name: /login as student/i })).toBeInTheDocument();
  });

  test('shows teacher layout with NavBar and SideMenu after login', () => {
    Auth.getCurrentUser.mockReturnValue(teacher);
    render(<App />);
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    expect(screen.getByText('Teacher Panel')).toBeInTheDocument();
    expect(screen.getByText('ExamList')).toBeInTheDocument();
  });

  test('shows student layout with AvailableExams as default page', () => {
    Auth.getCurrentUser.mockReturnValue(student);
    render(<App />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Student Panel')).toBeInTheDocument();
    expect(screen.getByText('AvailableExams')).toBeInTheDocument();
  });

  test('teacher can navigate to Create Exam via SideMenu', () => {
    Auth.getCurrentUser.mockReturnValue(teacher);
    render(<App />);
    fireEvent.click(screen.getByText('Create Exam'));
    expect(screen.getByText('ExamForm')).toBeInTheDocument();
  });

  test('student can navigate to My Results via SideMenu', () => {
    Auth.getCurrentUser.mockReturnValue(student);
    render(<App />);
    fireEvent.click(screen.getByText('My Results'));
    expect(screen.getByText('MyResults')).toBeInTheDocument();
  });

  test('logout button calls Auth.logout and returns to LoginPage', () => {
    Auth.getCurrentUser.mockReturnValue(teacher);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(Auth.logout).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /login as student/i })).toBeInTheDocument();
  });

  test('logging in via LoginPage form shows authenticated layout', async () => {
    Auth.getCurrentUser.mockReturnValue(null);
    Auth.login.mockResolvedValue(teacher);
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter username'), { target: { value: 'teacher1' } });
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: /^teacher$/i }));
    fireEvent.submit(screen.getByRole('button', { name: /login as teacher/i }).closest('form'));
    await waitFor(() => expect(screen.getByText('Dr. Smith')).toBeInTheDocument());
    expect(screen.getByText('ExamList')).toBeInTheDocument();
  });
});
