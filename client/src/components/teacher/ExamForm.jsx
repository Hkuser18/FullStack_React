// ExamForm - creates or edits an exam (single component, two modes)
// examId present → edit mode; absent → create mode
// Supports multiple-choice and open-ended questions.
// "Import from Bank" panel lets teachers reuse bank questions.
import { useState, useEffect } from 'react';
import Api from '../../api';
import Notify from '../../services/NotifyService';
import Logger from '../../services/LoggerService';

const newMcQuestion = () => ({
  id:            `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  text:          '',
  type:          'multiple-choice',
  options:       ['', '', '', ''],
  correctOption: 0,
});

const newOpenQuestion = () => ({
  id:       `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  text:     '',
  type:     'open',
  keywords: [],
  rawKeywords: '',
});

const ExamForm = ({ user, examId, onNavigate }) => {
  const isEdit = !!examId;

  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [duration,     setDuration]     = useState(30);
  const [passingScore, setPassingScore] = useState(60);
  const [questions,    setQuestions]    = useState([newMcQuestion()]);
  const [loading,      setLoading]      = useState(isEdit);
  const [saving,       setSaving]       = useState(false);

  // Bank import panel state
  const [showBank,      setShowBank]      = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankLoading,   setBankLoading]   = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    Api.getExamById(examId)
      .then(exam => {
        setTitle(exam.title);
        setDescription(exam.description);
        setDuration(exam.duration);
        setPassingScore(exam.passingScore);
        setQuestions(exam.questions);
        setLoading(false);
      })
      .catch(err => {
        Notify.error('Could not load exam.');
        Logger.error('ExamForm.load', err.message);
        onNavigate('my-exams');
      });
  }, [examId]);

  // ── Question mutation helpers ─────────────────────────────────────────────

  const addMcQuestion   = () => setQuestions(p => [...p, newMcQuestion()]);
  const addOpenQuestion = () => setQuestions(p => [...p, newOpenQuestion()]);
  const removeQuestion  = (i) => setQuestions(p => p.filter((_, idx) => idx !== i));

  const updateQuestion = (i, field, value) =>
    setQuestions(p => p.map((q, idx) => idx === i ? { ...q, [field]: value } : q));

  const updateOption = (qIdx, oIdx, value) =>
    setQuestions(p => p.map((q, i) =>
      i === qIdx ? { ...q, options: q.options.map((o, j) => j === oIdx ? value : o) } : q
    ));

  // keywords stored as array; edited as comma-separated string
  const updateKeywords = (qIdx, raw) =>
    setQuestions(p => p.map((q, idx) => idx === qIdx ? { ...q, rawKeywords: raw, keywords: raw.split(',').map(k => k.trim()).filter(Boolean) } : q));

  // ── Bank import ───────────────────────────────────────────────────────────

  const openBank = () => {
    setShowBank(true);
    if (bankQuestions.length > 0) return;
    setBankLoading(true);
    Api.getQuestionsByTeacher(user.id)
      .then(qs => { setBankQuestions(qs); setBankLoading(false); })
      .catch(() => { Notify.error('Could not load question bank.'); setBankLoading(false); });
  };

  const importFromBank = (bq) => {
    const imported = {
      id:            `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text:          bq.text,
      type:          bq.type,
      options:       bq.options ?? [],
      correctOption: bq.correctOption ?? 0,
      keywords:      bq.keywords ?? [],
    };
    setQuestions(p => [...p, imported]);
    Notify.success(`Imported: "${bq.text.slice(0, 40)}…"`);
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = () => {
    if (!title.trim())          { Notify.warning('Title is required.');          return false; }
    if (questions.length === 0) { Notify.warning('Add at least one question.');  return false; }
    for (const [i, q] of questions.entries()) {
      if (!q.text.trim()) { Notify.warning(`Question ${i + 1} needs text.`); return false; }
      if (q.type === 'open') {
        if (!q.keywords?.length) {
          Notify.warning(`Question ${i + 1} (open) needs at least one keyword.`);
          return false;
        }
      } else {
        if (q.options.some(o => !o.trim())) {
          Notify.warning(`All options in question ${i + 1} must be filled.`);
          return false;
        }
      }
    }
    return true;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const payload = {
      title, description,
      duration:     Number(duration),
      passingScore: Number(passingScore),
      questions,
      createdBy: user.id,
    };

    const op = isEdit ? Api.updateExam(examId, payload) : Api.createExam(payload);
    op.then(() => {
      Notify.success(isEdit ? 'Exam updated!' : 'Exam created as draft!');
      Logger.info(isEdit ? 'ExamForm: updated' : 'ExamForm: created', { title });
      onNavigate('my-exams');
    }).catch(err => {
      Notify.error(err.message);
      setSaving(false);
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status" />
    </div>
  );

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => onNavigate('my-exams')}>
          &larr; Back
        </button>
        <h4 className="mb-0">{isEdit ? 'Edit Exam' : 'Create New Exam'}</h4>
      </div>

      <form onSubmit={handleSubmit}>

        {/* General info */}
        <div className="card mb-4 shadow-sm">
          <div className="card-header bg-primary text-white fw-semibold">General Info</div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label fw-semibold">Title *</label>
              <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} placeholder="Exam title" required />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Description</label>
              <textarea className="form-control" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description (optional)" />
            </div>
            <div className="row g-3">
              <div className="col-sm-6">
                <label className="form-label fw-semibold">Duration (minutes)</label>
                <input type="number" className="form-control" min={1} max={180} value={duration} onChange={e => setDuration(e.target.value)} required />
              </div>
              <div className="col-sm-6">
                <label className="form-label fw-semibold">Passing Score (%)</label>
                <input type="number" className="form-control" min={1} max={100} value={passingScore} onChange={e => setPassingScore(e.target.value)} required />
              </div>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="card mb-4 shadow-sm">
          <div className="card-header bg-secondary text-white">
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Questions ({questions.length})</span>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-light btn-sm" onClick={addMcQuestion}>+ Multiple Choice</button>
                <button type="button" className="btn btn-light btn-sm" onClick={addOpenQuestion}>+ Open</button>
                <button type="button" className="btn btn-warning btn-sm" onClick={openBank}>📥 Import from Bank</button>
              </div>
            </div>
          </div>

          {/* Bank import panel */}
          {showBank && (
            <div className="border-bottom bg-light p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <strong className="text-secondary">Your Question Bank</strong>
                <button type="button" className="btn-close btn-sm" onClick={() => setShowBank(false)} />
              </div>
              {bankLoading && <div className="text-center py-2"><div className="spinner-border spinner-border-sm" /></div>}
              {!bankLoading && bankQuestions.length === 0 && (
                <p className="text-muted small mb-0">No bank questions yet. Add some in the Question Bank page.</p>
              )}
              <div className="d-flex flex-column gap-2">
                {bankQuestions.map(bq => (
                  <div key={bq.id} className="d-flex justify-content-between align-items-start border rounded p-2 bg-white">
                    <div>
                      <span className={`badge me-2 ${bq.type === 'open' ? 'bg-info' : 'bg-secondary'}`}>
                        {bq.type === 'open' ? 'Open' : 'MC'}
                      </span>
                      <span className="small">{bq.text}</span>
                      {bq.topic && <span className="ms-2 text-muted small">({bq.topic})</span>}
                    </div>
                    <button type="button" className="btn btn-outline-primary btn-sm ms-2 flex-shrink-0" onClick={() => importFromBank(bq)}>
                      Import
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card-body d-flex flex-column gap-4">
            {questions.map((q, qIdx) => (
              <div key={q.id} className="border rounded p-3 bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-semibold text-secondary small">Q{qIdx + 1}</span>
                    <span className={`badge ${q.type === 'open' ? 'bg-info' : 'bg-secondary'}`}>
                      {q.type === 'open' ? 'Open' : 'Multiple Choice'}
                    </span>
                  </div>
                  {questions.length > 1 && (
                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeQuestion(qIdx)}>Remove</button>
                  )}
                </div>

                <div className="mb-3">
                  <input
                    className="form-control"
                    placeholder="Question text"
                    value={q.text}
                    onChange={e => updateQuestion(qIdx, 'text', e.target.value)}
                    required
                  />
                </div>

                {q.type === 'multiple-choice' ? (
                  <>
                    <div className="d-flex flex-column gap-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="input-group">
                          <span className="input-group-text">
                            <input
                              type="radio"
                              name={`correct-${q.id}`}
                              checked={q.correctOption === oIdx}
                              onChange={() => updateQuestion(qIdx, 'correctOption', oIdx)}
                              title="Correct answer"
                            />
                          </span>
                          <input
                            type="text"
                            className={`form-control ${q.correctOption === oIdx ? 'border-success' : ''}`}
                            placeholder={`Option ${oIdx + 1}`}
                            value={opt}
                            onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                            required
                          />
                        </div>
                      ))}
                    </div>
                    <small className="text-muted d-block mt-1">Select the radio button next to the correct answer.</small>
                  </>
                ) : (
                  <>
                    <div className="mb-1">
                      <label className="form-label small text-secondary mb-1">Scoring Keywords (comma-separated)</label>
                      <input
                        className="form-control"
                        placeholder="e.g. closure, scope, lexical"
                        value={q.rawKeywords !== undefined ? q.rawKeywords : (q.keywords ?? []).join(', ')}
                        onChange={e => updateKeywords(qIdx, e.target.value)}
                      />
                    </div>
                    <small className="text-muted">Student answer scores if it contains any keyword (case-insensitive).</small>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="d-flex gap-3">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Exam (Draft)'}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => onNavigate('my-exams')}>
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
};

export default ExamForm;
