import { render, screen } from '@testing-library/react';
import ComingSoon from './ComingSoon';

describe('ComingSoon', () => {
  test('renders the title prop', () => {
    render(<ComingSoon title="Analytics" />);
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  test('shows under construction message', () => {
    render(<ComingSoon title="Stats" />);
    expect(screen.getByText('This page is under construction.')).toBeInTheDocument();
  });

  test('renders different title when prop changes', () => {
    const { rerender } = render(<ComingSoon title="Reports" />);
    expect(screen.getByText('Reports')).toBeInTheDocument();
    rerender(<ComingSoon title="Settings" />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
