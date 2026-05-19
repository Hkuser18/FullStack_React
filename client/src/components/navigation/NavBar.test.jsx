import { render, screen, fireEvent } from '@testing-library/react';
import NavBar from './NavBar';

const teacher = { name: 'Prof. Smith', role: 'teacher' };
const student = { name: 'Alice', role: 'student' };

describe('NavBar', () => {
  test('renders E-Test System brand', () => {
    render(<NavBar user={teacher} onLogout={vi.fn()} />);
    expect(screen.getByText('E-Test System')).toBeInTheDocument();
  });

  test('renders logged-in user name', () => {
    render(<NavBar user={teacher} onLogout={vi.fn()} />);
    expect(screen.getByText('Prof. Smith')).toBeInTheDocument();
  });

  test('renders role badge', () => {
    render(<NavBar user={teacher} onLogout={vi.fn()} />);
    expect(screen.getByText('teacher')).toBeInTheDocument();
  });

  test('calls onLogout when Logout button is clicked', () => {
    const onLogout = vi.fn();
    render(<NavBar user={teacher} onLogout={onLogout} />);
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(onLogout).toHaveBeenCalled();
  });

  test('renders student name and role', () => {
    render(<NavBar user={student} onLogout={vi.fn()} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('student')).toBeInTheDocument();
  });
});
