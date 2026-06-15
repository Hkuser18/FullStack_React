// ExamForm - טופס יצירה ועריכה של מבחן (רכיב אחד לשני מצבים)
// כאשר examId מועבר - מצב עריכה, ללא examId - מצב יצירה
// שיתוף הרכיב בין שני מצבים חוסך כפילות קוד ומבטיח אחידות בטופס
import { useState, useEffect } from 'react';
import Api from '../../api';
import Notify from '../../services/NotifyService';
import Logger from '../../services/LoggerService';

// יוצר שאלה חדשה ריקה עם id ייחודי מבוסס זמן + אקראיות
const newQuestion = () => ({
  id:            `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  text:          '',
  options:       ['', '', '', ''],
  correctOption: 0,
});

// Used for both Create (no examId) and Edit (examId provided)
const ExamForm = ({ user, examId, onNavigate }) => {
  const isEdit = !!examId;

  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [duration,     setDuration]     = useState(30);
  const [passingScore, setPassingScore] = useState(60);
  const [questions,    setQuestions]    = useState([newQuestion()]);
  const [loading,      setLoading]      = useState(isEdit);
  const [saving,       setSaving]       = useState(false);

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

  const addQuestion    = () => setQuestions(p => [...p, newQuestion()]);
  const removeQuestion = (i) => setQuestions(p => p.filter((_, idx) => idx !== i));

  const updateQuestion = (i, field, value) =>
    setQuestions(p => p.map((q, idx) => idx === i ? { ...q, [field]: value } : q));

  const updateOption = (qIdx, oIdx, value) =>
    setQuestions(p => p.map((q, i) =>
      i === qIdx ? { ...q, options: q.options.map((o, j) => j === oIdx ? value : o) } : q
    ));

  const validate = () => {
    if (!title.trim())          { Notify.warning('Title is required.');                     return false; }
    if (questions.length === 0) { Notify.warning('Add at least one question.');             return false; }
    for (const [i, q] of questions.entries()) {
      if (!q.text.trim())               { Notify.warning(`Question ${i + 1} needs text.`);              return false; }
      if (q.options.some(o => !o.trim())){ Notify.warning(`All options in question ${i + 1} must be filled.`); return false; }
    }
    return true;
  };

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
          <div className="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
            <span className="fw-semibold">Questions ({questions.length})</span>
            <button type="button" className="btn btn-light btn-sm" onClick={addQuestion}>+ Add Question</button>
          </div>
          <div className="card-body d-flex flex-column gap-4">
            {questions.map((q, qIdx) => (
              <div key={q.id} className="border rounded p-3 bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-semibold text-secondary small">Question {qIdx + 1}</span>
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
