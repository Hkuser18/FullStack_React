import { useState, useEffect } from 'react';
import Api from '../../api';
import Notify from '../../services/NotifyService';
import Logger from '../../services/LoggerService';
import QuestionImportExport from '../shared/QuestionImportExport';

const EMPTY_FORM = {
  text: '', type: 'multiple-choice',
  options: ['', '', '', ''], correctOption: 0,
  keywords: '', topic: '',
  text: '', type: 'multiple-choice',
  options: ['', '', '', ''], correctOption: 0,
  keywords: '', topic: '',
};

const formFromQuestion = (q) => ({
  text:          q.text,
  type:          q.type,
  options:       q.options ?? ['', '', '', ''],
  correctOption: q.correctOption ?? 0,
  keywords:      (q.keywords ?? []).join(', '),
  topic:         q.topic ?? '',
});

const buildPayload = (form, userId) => ({
  text:    form.text.trim(),
  type:    form.type,
  topic:   form.topic.trim(),
  createdBy: userId,
  ...(form.type === 'multiple-choice'
    ? { options: form.options, correctOption: form.correctOption }
    : { keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean) }),
});

function QuestionForm({ form, setField, setOption, onSave, onCancel, saving, title }) {
  return (
    <div className="card mb-3 shadow-sm border-primary">
      <div className="card-header bg-primary text-white fw-semibold">{title}</div>
      <div className="card-body d-flex flex-column gap-3">
        <div>
          <label className="form-label fw-semibold">Question Text *</label>
          <input className="form-control" value={form.text} onChange={e => setField('text', e.target.value)} placeholder="Question text" />
        </div>

        <div className="d-flex gap-4">
          <div className="form-check">
            <input className="form-check-input" type="radio" checked={form.type === 'multiple-choice'} onChange={() => setField('type', 'multiple-choice')} />
            <label className="form-check-label">Multiple Choice</label>
          </div>
          <div className="form-check">
            <input className="form-check-input" type="radio" checked={form.type === 'open'} onChange={() => setField('type', 'open')} />
            <label className="form-check-label">Open (keyword scored)</label>
          </div>
        </div>

        {form.type === 'multiple-choice' ? (
          <div>
            <label className="form-label fw-semibold">Options (select correct)</label>
            <div className="d-flex flex-column gap-2">
              {form.options.map((opt, i) => (
                <div key={i} className="input-group">
                  <span className="input-group-text">
                    <input type="radio" checked={form.correctOption === i} onChange={() => setField('correctOption', i)} title="Correct" />
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
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn btn-outline-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const QuestionBank = ({ user }) => {
  const [questions,  setQuestions]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showAdd,    setShowAdd]    = useState(false);
  const [addForm,    setAddForm]    = useState(EMPTY_FORM);
  const [editingId,  setEditingId]  = useState(null);
  const [editForm,   setEditForm]   = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  const load = () => {
    setLoading(true);
    Api.getQuestionsByTeacher(user.id)
      .then(qs => { setQuestions(qs); setLoading(false); })
      .catch(err => { Notify.error('Could not load questions.'); Logger.error('QuestionBank.load', err.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const makeSetField = (setter) => (field, value) => setter(f => ({ ...f, [field]: value }));
  const makeSetOption = (setter) => (idx, value) =>
    setter(f => ({ ...f, options: f.options.map((o, i) => i === idx ? value : o) }));

  const validate = (form) => {
    if (!form.text.trim()) { Notify.warning('Question text is required.'); return false; }
    if (form.type === 'multiple-choice') {
      if (form.options.some(o => !o.trim())) { Notify.warning('All 4 options must be filled.'); return false; }
    } else {
      if (!form.keywords.split(',').some(k => k.trim())) { Notify.warning('At least one keyword is required.'); return false; }
    }
    return true;
  };

  const handleAdd = () => {
    if (!validate(addForm)) return;
    setSaving(true);
    Api.addQuestion(buildPayload(addForm, user.id))
      .then(q => {
        setQuestions(prev => [q, ...prev]);
        Notify.success('Question added!');
        setAddForm(EMPTY_FORM);
        setShowAdd(false);
        setSaving(false);
      })
      .catch(err => { Notify.error(err.message); setSaving(false); });
  };

  const startEdit = (q) => {
    setEditingId(q.id);
    setEditForm(formFromQuestion(q));
    setShowAdd(false);
  };

  const handleUpdate = () => {
    if (!validate(editForm)) return;
    setSaving(true);
    Api.updateQuestion(editingId, buildPayload(editForm, user.id))
      .then(updated => {
        setQuestions(prev => prev.map(q => q.id === editingId ? updated : q));
        Notify.success('Question updated!');
        setEditingId(null);
        setSaving(false);
      })
      .catch(err => { Notify.error(err.message); setSaving(false); });
  };

  const handleDelete = (id) => {
    Api.deleteQuestion(id)
      .then(() => {
        setQuestions(prev => prev.filter(q => q.id !== id));
        Notify.success('Question removed from bank.');
      })
      .catch(err => Notify.error(err.message));
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h4 className="mb-0">🗂️ Question Bank</h4>
        <button className="btn btn-primary" onClick={() => { setShowAdd(s => !s); setEditingId(null); }}>
          {showAdd ? '✕ Cancel' : '+ Add Question'}
        </button>
      </div>

      {showAdd && (
        <QuestionForm
          form={addForm}
          setField={makeSetField(setAddForm)}
          setOption={makeSetOption(setAddForm)}
          onSave={handleAdd}
          onCancel={() => { setAddForm(EMPTY_FORM); setShowAdd(false); }}
          saving={saving}
          title="New Bank Question"
        />
      )}

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
            <div key={q.id}>
              {editingId === q.id ? (
                <QuestionForm
                  form={editForm}
                  setField={makeSetField(setEditForm)}
                  setOption={makeSetOption(setEditForm)}
                  onSave={handleUpdate}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                  title="Edit Question"
                />
              ) : (
                <div className="card shadow-sm">
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
                        <button className="btn btn-outline-primary btn-sm" onClick={() => startEdit(q)}>Edit</button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(q.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
