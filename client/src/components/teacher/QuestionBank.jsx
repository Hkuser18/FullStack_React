// QuestionBank - teacher page for browsing and managing reusable questions
// Questions can be imported into any exam via ExamForm's "Import from Bank" panel.
import { useState, useEffect } from 'react';
import Api from '../../api';
import Notify from '../../services/NotifyService';
import Logger from '../../services/LoggerService';

const EMPTY_FORM = {
  text:          '',
  type:          'multiple-choice',
  options:       ['', '', '', ''],
  correctOption: 0,
  keywords:      '',
  topic:         '',
};

const QuestionBank = ({ user }) => {
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [editId,    setEditId]    = useState(null);

  const load = () => {
    setLoading(true);
    Api.getQuestionsByTeacher(user.id)
      .then(qs => { setQuestions(qs); setLoading(false); })
      .catch(err => { Notify.error('Could not load questions.'); Logger.error('QuestionBank.load', err.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  // ── Form helpers ──────────────────────────────────────────────────────────

  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const setOption = (idx, value) =>
    setForm(f => ({ ...f, options: f.options.map((o, i) => i === idx ? value : o) }));

  const resetForm = () => { setForm(EMPTY_FORM); setShowForm(false); setEditId(null); };

  const handleEdit = (q) => {
    setForm({
      text: q.text,
      type: q.type,
      options: q.options || ['', '', '', ''],
      correctOption: q.correctOption || 0,
      keywords: q.keywords ? q.keywords.join(', ') : '',
      topic: q.topic || ''
    });
    setEditId(q.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validate = () => {
    if (!form.text.trim()) { Notify.warning('Question text is required.'); return false; }
    if (form.type === 'multiple-choice') {
      if (form.options.some(o => !o.trim())) { Notify.warning('All 4 options must be filled.'); return false; }
    } else {
      const kws = form.keywords.split(',').map(k => k.trim()).filter(Boolean);
      if (!kws.length) { Notify.warning('At least one keyword is required.'); return false; }
    }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
    setSaving(true);
    const data = {
      text:          form.text.trim(),
      type:          form.type,
      topic:         form.topic.trim(),
      createdBy:     user.id,
      ...(form.type === 'multiple-choice'
        ? { options: form.options, correctOption: form.correctOption }
        : { keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean) }),
    };
    if (editId) {
      Api.updateQuestion(editId, data)
        .then(updatedQ => {
          setQuestions(prev => prev.map(q => q.id === editId ? updatedQ : q));
          Notify.success('Question updated!');
          Logger.info('QuestionBank: updated', { id: editId });
          resetForm();
          setSaving(false);
        })
        .catch(err => {
          Notify.error(err.message);
          setSaving(false);
        });
    } else {
      Api.addQuestion(data)
        .then(q => {
          setQuestions(prev => [q, ...prev]);
          Notify.success('Question added to bank!');
          Logger.info('QuestionBank: added', { id: q.id });
          resetForm();
          setSaving(false);
        })
        .catch(err => {
          Notify.error(err.message);
          setSaving(false);
        });
    }
  };

  const handleDelete = (id) => {
    Api.deleteQuestion(id)
      .then(() => {
        setQuestions(prev => prev.filter(q => q.id !== id));
        Notify.success('Question removed from bank.');
        Logger.info('QuestionBank: deleted', { id });
      })
      .catch(err => Notify.error(err.message));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h4 className="mb-0">🗂️ Question Bank</h4>
        <button className="btn btn-primary" onClick={() => {
          if (showForm) resetForm();
          else setShowForm(true);
        }}>
          {showForm ? '✕ Cancel' : '+ Add Question'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card mb-4 shadow-sm border-primary">
          <div className="card-header bg-primary text-white fw-semibold">
            {editId ? 'Edit Bank Question' : 'New Bank Question'}
          </div>
          <div className="card-body d-flex flex-column gap-3">

            <div>
              <label className="form-label fw-semibold">Question Text *</label>
              <input className="form-control" value={form.text} onChange={e => setField('text', e.target.value)} placeholder="Question text" />
            </div>

            <div className="d-flex gap-4">
              <div className="form-check">
                <input className="form-check-input" type="radio" id="type-mc" checked={form.type === 'multiple-choice'} onChange={() => setField('type', 'multiple-choice')} />
                <label className="form-check-label" htmlFor="type-mc">Multiple Choice</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" id="type-open" checked={form.type === 'open'} onChange={() => setField('type', 'open')} />
                <label className="form-check-label" htmlFor="type-open">Open (keyword scored)</label>
              </div>
            </div>

            {form.type === 'multiple-choice' ? (
              <div>
                <label className="form-label fw-semibold">Options (select correct)</label>
                <div className="d-flex flex-column gap-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="input-group">
                      <span className="input-group-text">
                        <input type="radio" name="qb-correct" checked={form.correctOption === i} onChange={() => setField('correctOption', i)} title="Correct" />
                      </span>
                      <input
                        type="text"
                        className={`form-control ${form.correctOption === i ? 'border-success' : ''}`}
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={e => setOption(i, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="form-label fw-semibold">Keywords (comma-separated)</label>
                <input
                  className="form-control"
                  placeholder="e.g. closure, scope, lexical"
                  value={form.keywords}
                  onChange={e => setField('keywords', e.target.value)}
                />
                <small className="text-muted">Student answer scores if it contains any keyword.</small>
              </div>
            )}

            <div>
              <label className="form-label fw-semibold">Topic (optional)</label>
              <input className="form-control" placeholder="e.g. JavaScript, React" value={form.topic} onChange={e => setField('topic', e.target.value)} />
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Save Question'}
              </button>
              <button className="btn btn-outline-secondary" onClick={resetForm}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Question list */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" role="status" /></div>
      ) : questions.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <div style={{ fontSize: '2.5rem' }}>🗂️</div>
          <p className="mt-2">Your question bank is empty. Add reusable questions above.</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {questions.map(q => (
            <div key={q.id} className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1 me-3">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className={`badge ${q.type === 'open' ? 'bg-info' : 'bg-secondary'}`}>
                        {q.type === 'open' ? 'Open' : 'Multiple Choice'}
                      </span>
                      {q.topic && <span className="badge bg-light text-dark border">{q.topic}</span>}
                    </div>
                    <p className="mb-1 fw-semibold">{q.text}</p>
                    {q.type === 'multiple-choice' && q.options && (
                      <ul className="mb-0 small text-muted ps-3">
                        {q.options.map((opt, i) => (
                          <li key={i} className={i === q.correctOption ? 'text-success fw-semibold' : ''}>
                            {opt}{i === q.correctOption ? ' ✓' : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.type === 'open' && q.keywords && (
                      <p className="mb-0 small text-muted">Keywords: {q.keywords.join(', ')}</p>
                    )}
                  </div>
                  <div className="d-flex gap-2 flex-shrink-0">
                    <button className="btn btn-outline-primary btn-sm" onClick={() => handleEdit(q)}>
                      Edit
                    </button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(q.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
