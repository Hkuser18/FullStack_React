const SCORE_BUCKETS = [
  { label: '0–59',  min: 0,  max: 59  },
  { label: '60–69', min: 60, max: 69  },
  { label: '70–79', min: 70, max: 79  },
  { label: '80–89', min: 80, max: 89  },
  { label: '90–100',min: 90, max: 100 },
];

function ScoreChart({ attempts }) {
  const counts = SCORE_BUCKETS.map(b =>
    attempts.filter(a => a.score >= b.min && a.score <= b.max).length
  );
  const max = Math.max(...counts, 1);
  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-light fw-semibold">Score Distribution</div>
      <div className="card-body">
        <div className="d-flex align-items-flex-end gap-2" style={{ height: 120, alignItems: 'flex-end' }}>
          {SCORE_BUCKETS.map((b, i) => (
            <div key={b.label} className="d-flex flex-column align-items-center flex-grow-1">
              <span className="small text-muted mb-1">{counts[i]}</span>
              <div
                style={{
                  width: '100%',
                  height: `${Math.round((counts[i] / max) * 80) + 4}px`,
                  background: i === 0 ? 'var(--danger)' : 'var(--primary)',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s',
                }}
              />
              <span className="small text-muted mt-1" style={{ fontSize: '0.7rem' }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ScoreChart;
