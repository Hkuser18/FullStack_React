import { useState } from 'react';
import Api from '../../api';
import Notify from '../../services/NotifyService';
import Logger from '../../services/LoggerService';

const AIQuestionGenerator = ({ user, onAdd, onClose }) => {
  const [topic,     setTopic]     = useState('');
  const [count,     setCount]     = useState(5);
  const [type,      setType]      = useState('mixed');
  const [generating, setGenerating] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [questions, setQuestions] = useState(null); // preview, before saving to the bank
  const [selected,  setSelected]  = useState({});   // id -> boolean

  const handleGenerate = () => {
    if (!topic.trim()) { Notify.warning('Enter a topic first.'); return; }
    setGenerating(true);
    setQuestions(null);
    Api.generateQuestions({ topic: topic.trim(), count: Number(count), type })
      .then(qs => {
        setQuestions(qs);
        setSelected(Object.fromEntries(qs.map(q => [q.id, true])));
        setGenerating(false);
      })
      .catch(err => {
        Notify.error(err.message || 'Failed to generate questions.');
        Logger.error('AIQuestionGenerator.generate', err.message);
        setGenerating(false);
      });
  };

  const toggle = (id) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));

  const handleAddSelected = () => {
    const toAdd = questions.filter(q => selected[q.id]);
    if (!toAdd.length) { Notify.warning('Select at least one question to add.'); return; }
    setSaving(true);
    Promise.all(toAdd.map(q => Api.addQuestion({
      text: q.text,
      type: q.type,
      topic: q.topic,
      createdBy: user.id,
      ...(q.type === 'multiple-choice'
        ? { options: q.options, correctOption: q.correctOption }
        : { keywords: q.keywords }),
    })))
      .then(addedQs => {
        onAdd(addedQs);
        Notify.success(`Added ${addedQs.length} question${addedQs.length > 1 ? 's' : ''} to the bank.`);
        setSaving(false);
        onClose();
      })
      .catch(err => {
        Notify.error('Some questions failed to save.');
        Logger.error('AIQuestionGenerator.save', err.message);
        setSaving(false);
      });
  };

  const selectedCount = questions ? questions.filter(q => selected[q.id]).length : 0;

  return (
    <div className="card mb-3 shadow-sm border-primary">
      <div className="card-header bg-primary text-white fw-semibold d-flex justify-content-between align-items-center">
        <span>✨ Generate Questions with AI</span>
        <button className="btn-close btn-close-white" onClick={onClose} aria-label="Close" />
      </div>
      <div className="card-body d-flex flex-column gap-3">
        <div className="row g-2">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Topic *</label>
            <input
              className="form-control"
              placeholder="e.g. JavaScript closures, the French Revolution"
              value={topic}
              onChange={e => setTopic(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-semibold">How many?</label>
            <input
              type="number" min="1" max="10"
              className="form-control"
              value={count}
              onChange={e => setCount(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-semibold">Type</label>
            <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
              <option value="mixed">Mixed</option>
              <option value="multiple-choice">Multiple Choice</option>
              <option value="open">Open</option>
            </select>
          </div>
        </div>

        <button className="btn btn-primary align-self-start" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating…' : 'Generate'}
        </button>

        {questions && (
          <div className="d-flex flex-column gap-2">
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Review generated questions ({selectedCount} selected)</span>
            </div>
            {questions.length === 0 ? (
              <div className="alert alert-warning mb-0">No questions were generated. Try a different topic.</div>
            ) : (
              questions.map(q => (
                <div key={q.id} className="border rounded p-2 d-flex gap-2">
                  <input
                    type="checkbox"
                    className="form-check-input mt-1"
                    checked={!!selected[q.id]}
                    onChange={() => toggle(q.id)}
                  />
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className={`badge ${q.type === 'open' ? 'bg-info' : 'bg-secondary'}`}>
                        {q.type === 'open' ? 'Open' : 'Multiple Choice'}
                      </span>
                      {q.topic && <span className="badge bg-light text-dark border">{q.topic}</span>}
                    </div>
                    <p className="mb-1 small fw-semibold">{q.text}</p>
                    {q.type === 'multiple-choice' ? (
                      <ul className="mb-0 small text-muted ps-3">
                        {q.options.map((opt, i) => (
                          <li key={i} className={i === q.correctOption ? 'text-success fw-semibold' : ''}>
                            {opt}{i === q.correctOption ? ' ✓' : ''}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mb-0 small text-muted">Keywords: {q.keywords.join(', ')}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            {questions.length > 0 && (
              <button className="btn btn-success align-self-start" onClick={handleAddSelected} disabled={saving}>
                {saving ? 'Adding…' : `Add ${selectedCount} Selected to Bank`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIQuestionGenerator;
