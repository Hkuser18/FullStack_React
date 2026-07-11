import { render, screen } from '@testing-library/react';
import ScoreChart from './ScoreChart';

describe('ScoreChart', () => {
  test('renders all five bucket labels', () => {
    render(<ScoreChart attempts={[]} />);
    ['0–59', '60–69', '70–79', '80–89', '90–100'].forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  test('renders correct counts per bucket, in order', () => {
    // scores -> buckets: 10->0-59, 65->60-69, 65->60-69, 75->70-79, 95->90-100
    const attempts = [{ score: 10 }, { score: 65 }, { score: 65 }, { score: 75 }, { score: 95 }];
    const { container } = render(<ScoreChart attempts={attempts} />);
    const counts = Array.from(container.querySelectorAll('.small.text-muted.mb-1')).map(el => el.textContent);
    expect(counts).toEqual(['1', '2', '1', '0', '1']);
  });

  test('does not throw with an empty attempts array', () => {
    expect(() => render(<ScoreChart attempts={[]} />)).not.toThrow();
  });
});
