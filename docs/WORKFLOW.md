# Development Process, Milestones & Deployment Workflow

## Milestones

97 commits across ~9 weeks (2026-05-05 → 2026-07-08), built as a sequence of feature branches merged into `dev` via pull request.

| # | Milestone | Key PRs / commits |
|---|---|---|
| 1 | **Foundations** — React scaffold, spec doc, login page (role selection), first question-display UI | `#2 setup-react-app`, `#3 specs`, `#5 3-initreact`, `#9 login`, `#10 7-showquestion` |
| 2 | **Testing infrastructure** — Vitest + Testing Library set up; suite grown to 155 tests across 20 files before the backend even existed | `#12 unittest` |
| 3 | **Backend & database** — Express server, PostgreSQL schema, seed data, `MockApiService` OOP class (so the frontend could keep developing without waiting on the backend), core services (`Config`/`Logger`/`Storage`/`Notify`) | `#13 initialserver`, `bc09a84`, `01f7658` |
| 4 | **Question bank** — reusable multiple-choice/open question authoring, separate from exams; CSV import/export | `#14 question-bank`, `#15 bugfix/open-question`, `#16 question-import-export` |
| 5 | **Auth & authorization** — JWT on every protected route, admin panel + teacher-approval workflow, bcrypt password hashing | `#17 jwt-auth-merge`, `384a601 admin panel`, `#20 password-hashing` |
| 6 | **Hardening & DevOps** (the single busiest day, 2026-07-02: 11 PRs merged) — GitHub Actions CI, rate limiting + Helmet, architecture diagrams, manual grading + exam auto-save, Docker, AI-generated questions (started on Claude, switched to Gemini for a free tier) | `#19 ci/github-actions-tests`, `#22 docs/architecture-diagrams-ci`, `#23 security/auth-rate-limiting`, `#24 manual-grading-and-autosave`, `#26 feat/docker`, `#27 feat/ai-question-generation`, `#29 feat/switch-to-gemini` |
| 7 | **Advanced features & final hardening** (post-CI, direct-to-`dev` commits with local verification per change rather than PRs) — fullscreen/Bootstrap responsive redesign, real-time exam monitoring (Socket.IO), cross-exam analytics dashboard, a structured multi-angle code review pass (fixed a real authorization gap, race conditions, and a cross-tab auth bug), an answer-key exposure fix, final documentation + presentation | `3757ff9`, `9482f61 Live Monitor`, `1def6d7 Analytics`, `898abd9`/`10fc36c`/`c82228b` fixes |

## Branch Strategy

- `main` — stale since the very start of the project (last real commit `c03b0b4`, early milestone 1); **not what's deployed**.
- `dev` — the actual trunk. Every feature/fix branch merges here; Render deploys from this branch.
- Short-lived topic branches, named by intent: `feature/*` and `feat/*` (new functionality), `fix/*` and `bugfix/*` (bug fixes), `security/*` (hardening), `ci/*` (pipeline), `docs/*` (documentation). Merged via GitHub pull request (29 PRs total) for the first ~6 milestones; the final push before submission (milestone 7) moved to direct, verified commits on `dev` for faster iteration under time pressure, with GitHub Actions still gating every push.

## CI/CD — GitHub Actions (`.github/workflows/ci.yml`)

Runs on every push and PR, two independent jobs:

- **`client-tests`** — `npm ci` → `npx vitest run` (full unit/component suite) → `npm run build` (catches build-time errors like bad imports that tests alone wouldn't).
- **`server-tests`** — spins up a real ephemeral **PostgreSQL 16** service container, seeds it (`npm run seed`, applying `schema.sql`), boots the actual `server.js`, waits for it to respond, then runs `npm run test:api` — an end-to-end smoke test against a real running server and real database, not mocks.

## Docker

`docker-compose.yml` — three services for a one-command local stack:

- `db` — `postgres:16-alpine`, schema auto-applied on first boot via a mounted init script, healthchecked before dependents start.
- `server` — the Express API, `DATABASE_SSL=false` (local Postgres doesn't support SSL, unlike Render's).
- `client` — built and served via nginx, proxying `/api` to the server container (no CORS configuration needed for local Docker use).

Separate per-service `Dockerfile`s also back the Render production deployment (`render.yaml`), which provisions the API (web service), the client (static site), and a managed PostgreSQL instance from one Blueprint file.

## Testing Strategy

- **189 automated tests** (Vitest + React Testing Library), one `*.test.jsx`/`*.test.js` file per component/service, covering rendering, user interaction, and the mock API's business logic (grading, validation, ownership rules).
- **No dedicated backend unit-test suite** — the server is instead covered by the CI smoke test (`server/test-api.js`) against a real database, plus manual verification (curl / real Postgres) during development for security-sensitive changes. Documented as a known gap, not an oversight.
- **Code review process**: a structured, multi-angle pass (correctness, security, reuse, simplification, efficiency) run before submission, which found and fixed real issues — a REST authorization gap, a couple of real-time race conditions, an unhandled promise rejection behind a confusing cross-tab auth bug, and a pre-submission answer-key exposure fix — each verified against real running code (Postgres, live HTTP/Socket.IO servers), not just read for correctness.

## Logging

`LoggerService` (client) — a leveled logger (`debug`/`info`/`warn`/`error`) that writes to the console and keeps an in-memory ring buffer (`getHistory()`), gated by `ConfigService`'s configured log level. Server-side, unhandled route errors are caught centrally (the `wrap()` helper forwards them to a single Express error-handling middleware) and logged to stdout — visible directly in Render's log viewer in production.
