import { render, screen, fireEvent } from '@testing-library/react';
import SideMenu from './SideMenu';

describe('SideMenu', () => {
  test('shows teacher menu items for teacher role', () => {
    render(<SideMenu role="teacher" activePage="" onNavigate={vi.fn()} />);
    expect(screen.getByText('My Exams')).toBeInTheDocument();
    expect(screen.getByText('Create Exam')).toBeInTheDocument();
    expect(screen.getByText('Student Results')).toBeInTheDocument();
  });

  test('shows student menu items for student role', () => {
    render(<SideMenu role="student" activePage="" onNavigate={vi.fn()} />);
    expect(screen.getByText('Available Exams')).toBeInTheDocument();
    expect(screen.getByText('My Results')).toBeInTheDocument();
  });

  test('does not show teacher items to a student', () => {
    render(<SideMenu role="student" activePage="" onNavigate={vi.fn()} />);
    expect(screen.queryByText('Create Exam')).not.toBeInTheDocument();
    expect(screen.queryByText('Student Results')).not.toBeInTheDocument();
  });

  test('calls onNavigate with the correct key when a menu item is clicked', () => {
    const onNavigate = vi.fn();
    render(<SideMenu role="teacher" activePage="" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('My Exams'));
    expect(onNavigate).toHaveBeenCalledWith('my-exams');
  });

  test('shows Teacher Panel label for teacher role', () => {
    render(<SideMenu role="teacher" activePage="" onNavigate={vi.fn()} />);
    expect(screen.getByText('Teacher Panel')).toBeInTheDocument();
  });

  test('shows Student Panel label for student role', () => {
    render(<SideMenu role="student" activePage="" onNavigate={vi.fn()} />);
    expect(screen.getByText('Student Panel')).toBeInTheDocument();
  });

  test('active page item has primary button style', () => {
    render(<SideMenu role="teacher" activePage="my-exams" onNavigate={vi.fn()} />);
    const activeBtn = screen.getByText('My Exams');
    expect(activeBtn.closest('button')).toHaveClass('active');
  });
});
