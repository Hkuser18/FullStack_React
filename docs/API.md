# API Reference

Base URL: `<server>/api` (e.g. `http://localhost:3002/api` locally, `https://examsapp-server.onrender.com/api` in production).
All routes except `/auth/*` require `Authorization: Bearer <JWT>`. "Role" = additionally requires `requireRole(...)`.

## Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | — (rate-limited) | `{ username, password, role }` → `{ user, token }`. 24h JWT. |
| POST | `/auth/register` | — (rate-limited) | `{ username, password, name, role }`. Teacher accounts start `status: pending`. |

## Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/teachers/pending` | admin | List teacher accounts awaiting approval. |
| PATCH | `/admin/teachers/:id/approve` | admin | Sets `status: active`. |
| PATCH | `/admin/teachers/:id/reject` | admin | Deletes the pending account. |

## Users

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users` | teacher/admin | All users (id/username/role/name only). |
| GET | `/users/:id` | any | Single user (id/username/role/name only). |

## Exams

*Specific routes (`/published`, `/teacher/:id`) are registered before `/:id` so Express doesn't swallow them.*

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/exams` | any | All exams. `questions[].correctOption/keywords` stripped for students. |
| GET | `/exams/published` | any | Published exams only. Same stripping for students — this is what students browse *before* taking an exam. |
| GET | `/exams/teacher/:teacherId` | any | All exams created by that teacher (draft/published/closed). |
| GET | `/exams/:id` | any | Single exam. Stripped for students. |
| POST | `/exams` | teacher/admin | Create (`status: draft`). |
| PUT | `/exams/:id` | teacher/admin | Update. Rejects (`409`) a `questions` change once ≥1 attempt exists. |
| DELETE | `/exams/:id` | teacher/admin | Delete. |
| PATCH | `/exams/:id/status` | teacher/admin | `{ status }` — one of `draft \| published \| closed`. |

## Attempts

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/attempts` | student | Submit + auto-grade. Response includes `answerKey` (response-only, never persisted). Triggers `monitor:submitted`. |
| GET | `/attempts/student/:studentId` | self or admin | A student's own attempt history. |
| GET | `/attempts/exam/:examId` | teacher (owner) / admin | All attempts for one exam. |
| GET | `/attempts/check/:studentId/:examId` | any | `{ attempted: boolean }` — has this student already submitted this exam? |
| PATCH | `/attempts/:id` | teacher/admin | Manual grade override: `{ score, feedback }`, recomputes `passed`. |

## Question Bank

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/questions` | any | All bank questions. |
| GET | `/questions/teacher/:teacherId` | any | Bank questions authored by that teacher. |
| POST | `/questions` | teacher/admin | Create a bank question (multiple-choice or open). |
| PUT | `/questions/:id` | teacher/admin | Update. |
| DELETE | `/questions/:id` | teacher/admin | Delete. |
| POST | `/questions/generate` | teacher/admin (rate-limited, paid API) | `{ topic, count, type }` → AI-generated, server-validated questions (not auto-saved — teacher picks which to keep). Returns `503` if `GEMINI_API_KEY` isn't configured. |

## Utility

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/db/reset` | any authenticated user | Truncates and re-seeds all tables with demo data. |

---

## Socket.IO Events

Connection requires `{ auth: { token: <JWT> } }` on the handshake (same JWT as the REST API). Powers the **Live Monitor** feature (`server/socket.js` ↔ `client/src/services/SocketService.js`).

### Client → Server

| Event | Sent by | Payload | Effect |
|---|---|---|---|
| `exam:join` | student, on opening an exam | `{ examId, totalQuestions }` | Creates/refreshes that student's live session; joins the exam's room. |
| `exam:progress` | student, on every answer change | `{ examId, answeredCount }` | Updates the session; broadcasts `monitor:update`. |
| `exam:tab-blur` | student, on window blur | `{ examId }` | Increments `tabSwitchCount`; broadcasts `monitor:violation`. |
| `monitor:subscribe` | teacher, opening Live Monitor | `{ examId }` | Verifies exam ownership, joins the room, replies with `monitor:snapshot`. |
| `monitor:unsubscribe` | teacher, leaving Live Monitor | `{ examId }` | Leaves the room. |

### Server → Client

| Event | Sent to | Payload | Meaning |
|---|---|---|---|
| `monitor:snapshot` | the subscribing teacher only | `{ examId, sessions: Session[] }` | Full current state, sent once on subscribe. |
| `monitor:update` | the exam's room | `Session` | A student's progress/connection state changed. |
| `monitor:violation` | the exam's room | `{ examId, studentId, tabSwitchCount }` | A student switched tabs/blurred the window. |
| `monitor:submitted` | the exam's room | `{ examId, studentId, score, passed }` | A student finished; their live session is removed. |
| `monitor:left` | the exam's room | `{ examId, studentId }` | A student's disconnect grace period (30s) expired without a reconnect. |
