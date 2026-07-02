// TakeExam - active exam with timer, supports multiple-choice and open questions
// answers[i] is: number|null for MC questions, string|null for open questions
// useCallback on submit is required — it's used inside the timer useEffect
import { useState, useEffect, useRef, useCallback } from 'react';
import Api from '../../api';
import Notify from '../../services/NotifyService';
import Logger from '../../services/LoggerService';
import Storage from '../../services/StorageService';

const fmt = (secs) =>
  `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

const isAnswered = (q, a) =>
  q.type === 'open' ? (typeof a === 'string' && a.trim().length > 0) : a !== null;

const openMatches = (q, a) => {
  const text = String(a ?? '').toLowerCase();
  return (q.keywords ?? []).some(kw => text.includes(kw.toLowerCase()));
};

const TakeExam = ({ user, examId, onNavigate }) => {
  const [exam,       setExam]       = useState(null);
  const [answers,    setAnswers]    = useState([]);
  const [timeLeft,   setTimeLeft]   = useState(0);
  const [phase,      setPhase]      = useState('loading'); // loading | taking | result
  const [result,     setResult]     = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt,  setStartedAt]  = useState(null);
  const timerRef = useRef(null);

  const autosaveKey = `autosave_${examId}_${user.id}`;

  // ── Load exam ─────────────────────────────────────────────────────────────
  useEffect(() => {
    Api.getExamById(examId)
      .then(data => {
        setExam(data);

        const saved = Storage.get(autosaveKey);
        const now = Date.now();
        const remaining = saved
          ? data.duration * 60 - Math.floor((now - saved.startedAt) / 1000)
          : null;

        if (saved && Array.isArray(saved.answers) && saved.answers.length === data.questions.length && remaining > 0) {
          setAnswers(saved.answers);
          setStartedAt(saved.startedAt);
          setTimeLeft(remaining);
          Notify.info('Restored your in-progress answers.');
        } else {
          if (saved) Storage.remove(autosaveKey); // stale/expired autosave
          setAnswers(new Array(data.questions.length).fill(null));
          setStartedAt(now);
          setTimeLeft(data.duration * 60);
        }
        setPhase('taking');
      })
      .catch(err => {
        Notify.error('Could not load exam.');
        Logger.error('TakeExam.load', err.message);
        onNavigate('available-exams');
      });
  }, [examId]);

  // ── Auto-save ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'taking' || !startedAt) return;
    Storage.set(autosaveKey, { answers, startedAt });
  }, [answers, phase, startedAt]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = useCallback((auto = false) => {
    clearInterval(timerRef.current);
    setSubmitting(true);

    const finalAnswers = answers.map((a, i) => {
      const q = exam?.questions[i];
      if (q?.type === 'open') return a ?? '';
      return a ?? -1; // -1 = unanswered MC → always wrong
    });

    Api.submitAttempt({ examId, studentId: user.id, answers: finalAnswers, startedAt: new Date(startedAt).toISOString() })
      .then(attempt => {
        Storage.remove(autosaveKey);
        setResult(attempt);
        setPhase('result');
        setSubmitting(false);
        if (auto) Notify.warning('Time is up! Exam auto-submitted.');
        else      Notify.success(`Submitted! Score: ${attempt.score}%`);
        Logger.info('TakeExam: submitted', { score: attempt.score, passed: attempt.passed });
      })
      .catch(err => {
        Notify.error('Failed to submit.');
        Logger.error('TakeExam.submit', err.message);
        setSubmitting(false);
      });
  }, [answers, exam, examId, user.id, startedAt, autosaveKey]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'taking') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); submit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, submit]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const selectAnswer = (qIdx, oIdx) =>
    setAnswers(prev => prev.map((a, i) => i === qIdx ? oIdx : a));

  const setOpenAnswer = (qIdx, text) =>
    setAnswers(prev => prev.map((a, i) => i === qIdx ? text : a));

  const handleSubmitClick = () => {
    const unanswered = exam.questions.filter((q, i) => !isAnswered(q, answers[i])).length;
    if (unanswered > 0) {
      Notify.warning(`${unanswered} question${unanswered > 1 ? 's' : ''} still unanswered. Submit anyway?`);
    }
    submit(false);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div className="text-center py-5">
      <div className="spinner-border text-info" role="status" />
    </div>
  );

  // ── Result ────────────────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const passed = result.passed;
    return (
      <div style={{ maxWidth: 860, margin: '0 auto' }} className="animate-fade-in">
        <div className="result-card">
          <div className={`score-circle ${passed ? 'pass' : 'fail'}`}>{result.score}%</div>
          <h3 className="fw-bold mb-1" style={{ color: passed ? 'var(--success)' : 'var(--danger)' }}>
            {passed ? '🎉 You Passed!' : '❌ Not Passed'}
          </h3>
          <p className="text-muted-app">Passing score: {exam.passingScore}%</p>
          <div className="d-flex gap-3 justify-content-center mt-3">
            <button className="btn-ghost" onClick={() => onNavigate('available-exams')}>Back to Exams</button>
            <button className="btn-primary-app" onClick={() => onNavigate('my-results')}>View My Results</button>
          </div>
        </div>

        <h5 className="mb-3">Answer Review</h5>
        <div className="d-flex flex-column gap-3">
          {exam.questions.map((q, i) => {
            const ans = answers[i];

            if (q.type === 'open') {
              const correct = openMatches(q, ans);
              return (
                <div key={q.id} className={`card border-${correct ? 'success' : 'danger'}`}>
                  <div className={`card-header bg-${correct ? 'success' : 'danger'} bg-opacity-10 d-flex justify-content-between`}>
                    <span className="fw-semibold">Q{i + 1}. {q.text}</span>
                    <span className={`badge bg-${correct ? 'success' : 'danger'}`}>{correct ? 'Correct' : 'Wrong'}</span>
                  </div>
                  <div className="card-body small">
                    <p className="mb-1"><strong>Your answer:</strong> {ans || <em className="text-muted">no answer</em>}</p>
                    <p className="mb-0 text-muted">Keywords: {(q.keywords ?? []).join(', ')}</p>
                  </div>
                </div>
              );
            }

            // multiple-choice
            const selected = typeof ans === 'number' ? ans : -1;
            const correct  = q.correctOption;
            const isRight  = selected === correct;
            return (
              <div key={q.id} className={`card border-${isRight ? 'success' : 'danger'}`}>
                <div className={`card-header bg-${isRight ? 'success' : 'danger'} bg-opacity-10 d-flex justify-content-between`}>
                  <span className="fw-semibold">Q{i + 1}. {q.text}</span>
                  <span className={`badge bg-${isRight ? 'success' : 'danger'}`}>{isRight ? 'Correct' : 'Wrong'}</span>
                </div>
                <ul className="list-group list-group-flush">
                  {q.options.map((opt, j) => {
                    const isCorrect  = j === correct;
                    const isSelected = j === selected;
                    let cls = '';
                    if (isCorrect)                   cls = 'list-group-item-success';
                    else if (isSelected && !isRight) cls = 'list-group-item-danger';
                    return (
                      <li key={j} className={`list-group-item ${cls} d-flex gap-2`}>
                        {isSelected && !isRight    && <strong>[Your answer]</strong>}
                        {isCorrect  && !isSelected && <strong>[Correct answer]</strong>}
                        {isSelected && isRight     && <strong>[Your answer — Correct]</strong>}
                        <span>{opt}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="d-flex gap-3 mt-4">
          <button className="btn-ghost" onClick={() => onNavigate('available-exams')}>← Back to Exams</button>
          <button className="btn-primary-app" onClick={() => onNavigate('my-results')}>View All My Results</button>
        </div>
      </div>
    );
  }

  // ── Taking ────────────────────────────────────────────────────────────────
  const answered = exam.questions.filter((q, i) => isAnswered(q, answers[i])).length;
  const urgent   = timeLeft <= 60;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Sticky header */}
      <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-white rounded shadow-sm sticky-top">
        <div>
          <h5 className="mb-0">{exam.title}</h5>
          <small className="text-muted">{answered} / {exam.questions.length} answered</small>
        </div>
        <div className={`exam-timer${urgent ? ' urgent' : ''}`}>
          ⏱ {fmt(timeLeft)}
        </div>
      </div>

      {/* Low-time warning */}
      {urgent && (
        <div className="alert alert-danger py-2 mb-3 fw-semibold text-center animate-fade-in" role="alert">
          ⚠️ Less than 1 minute remaining! The exam will auto-submit when time runs out.
        </div>
      )}

      {/* Progress */}
      <div className="progress mb-4" style={{ height: 6 }}>
        <div
          className="progress-bar bg-info"
          style={{ width: `${(answered / exam.questions.length) * 100}%`, transition: 'width 0.3s' }}
        />
      </div>

      {/* Questions */}
      <div className="d-flex flex-column gap-4">
        {exam.questions.map((q, qIdx) => {
          const ans = answers[qIdx];
          const done = isAnswered(q, ans);
          return (
            <div key={q.id} className="card shadow-sm">
              <div className="card-header bg-light d-flex justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-semibold">Question {qIdx + 1} of {exam.questions.length}</span>
                  <span className={`badge ${q.type === 'open' ? 'bg-info' : 'bg-secondary'} bg-opacity-75`}>
                    {q.type === 'open' ? 'Open' : 'MC'}
                  </span>
                </div>
                {done
                  ? <span className="badge bg-success">Answered</span>
                  : <span className="badge bg-warning text-dark">Unanswered</span>
                }
              </div>
              <div className="card-body">
                <p className="mb-3 fw-semibold">{q.text}</p>

                {q.type === 'open' ? (
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Type your answer here…"
                    value={typeof ans === 'string' ? ans : ''}
                    onChange={e => setOpenAnswer(qIdx, e.target.value)}
                  />
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {q.options.map((opt, oIdx) => {
                      const selected = ans === oIdx;
                      return (
                        <div
                          key={oIdx}
                          className={`p-3 rounded border d-flex align-items-center gap-2 ${
                            selected ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary border-opacity-25'
                          }`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => selectAnswer(qIdx, oIdx)}
                        >
                          <input
                            type="radio"
                            name={`q-${qIdx}`}
                            checked={selected}
                            onChange={() => selectAnswer(qIdx, oIdx)}
                          />
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
        <button className="btn btn-outline-secondary" onClick={() => onNavigate('available-exams')}>
          Abandon
        </button>
        <button
          className="btn btn-success btn-lg"
          onClick={handleSubmitClick}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : `Submit (${answered}/${exam.questions.length})`}
        </button>
      </div>
    </div>
  );
};

export default TakeExam;
