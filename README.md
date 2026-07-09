# ExamsApp

A full-stack online exam management system built for the Tel-Hai College FullStack course. Teachers create and publish exams, students take them and get auto-graded results, and an admin approves new teacher accounts.

## Live Demo

| | |
|---|---|
| **GitHub** | https://github.com/Hkuser18/FullStack_React (this repo, branch `dev`) |
| **Client (live app)** | https://examapp-client.onrender.com |
| **Server (API)** | https://examsapp-server.onrender.com |

Demo accounts — see [Demo Accounts](#demo-accounts) below.

## Documentation

| Doc | Covers |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System overview, client/server architecture, ER diagram + JSON models, OOP class diagram, component hierarchy, use cases, 3 sequence diagrams, exam status flow |
| [`docs/API.md`](docs/API.md) | Full REST endpoint reference + Socket.IO event reference |
| [`docs/WORKFLOW.md`](docs/WORKFLOW.md) | Semester milestones, branch strategy, CI/CD pipeline, Docker, testing strategy, logging |
| [`docs/QUESTION_IMPORT_FORMAT.md`](docs/QUESTION_IMPORT_FORMAT.md) | CSV format for bulk question import/export |

## Features

- **Auth** — JWT login/register, bcrypt-hashed passwords, role-based access (admin / teacher / student)
- **Admin** — approve or reject pending teacher registrations
- **Teacher** — create/edit/delete exams, build a reusable question bank (multiple-choice + open-ended), publish/close/reopen exams, optional exam scheduling window, view student results with per-exam stats and manual grade override
- **Student** — browse published exams, take an exam under a countdown timer with client-side auto-save, auto-graded submission (exact match for multiple-choice, keyword match for open-ended), view score history and answer review
- **Live Monitor** — real-time, Socket.IO-powered view of who's currently taking a published exam, their live per-question progress, a tab-switch/suspicious-activity signal, and instant submit notifications (with a 30s disconnect grace period so a page reload isn't mistaken for "left")
- **Analytics** — cross-exam teacher dashboard: aggregate stats, a per-exam breakdown table with CSV export, a score-distribution chart, and per-question difficulty ranking
- **Dual API layer** — the client can run against a real Express/PostgreSQL backend or a localStorage-backed mock, toggled by an env var (useful for frontend-only development)
- **CSV question import/export** — bulk-load or export question bank entries; see [`docs/QUESTION_IMPORT_FORMAT.md`](docs/QUESTION_IMPORT_FORMAT.md)
- **AI-generated questions** — teachers can generate multiple-choice/open questions from a topic prompt (Gemini API), review a preview, and add selected ones to the question bank. Optional — set `GEMINI_API_KEY` to enable; the rest of the app works without it

## Tech Stack

| Layer | Technology |
|---|---|
| Client | React 19 + Vite, Bootstrap 5, Vitest + Testing Library |
| Server | Express (ESM), JWT (`jsonwebtoken`), `bcryptjs`, `helmet` + `express-rate-limit`, `cors` |
| Real-time | Socket.IO (server + `socket.io-client`) — powers Live Monitor |
| Database | PostgreSQL (`pg`) |
| AI | Google Gemini API (`@google/genai`) — optional, free-tier key |
| CI | GitHub Actions (client tests+build, server smoke test against real Postgres) |
| Containerization | Docker + Docker Compose |
| Deployment | Render (web service + static site + managed Postgres) |

## Project Structure

```
client/   React app — see client/src for components, services, api layer
server/   Express API — server.js (routes + migrations), db.js (pool + seed data)
docs/     Architecture and database diagrams
```

## Getting Started

### Option A: Docker

The fastest way to run the full stack (Postgres + API + client) with nothing installed but Docker:

```bash
docker compose up --build
```

This starts Postgres (schema auto-applied on first boot), the API on `http://localhost:3002`, and the client on `http://localhost:8080` (served via nginx, which proxies `/api` to the server container — no CORS setup needed). Seed demo data once the stack is up:

```bash
docker compose exec server npm run seed
```

Then log in at `http://localhost:8080` with any of the [demo accounts](#demo-accounts) below. `docker compose down -v` tears everything down including the database volume.

### Option B: Run locally

#### Prerequisites
- Node.js 20+
- A PostgreSQL instance (local, Docker, or a hosted DB)

### 1. Server

```bash
cd server
npm install
cp .env.example .env   # set DATABASE_URL, JWT_SECRET, CLIENT_ORIGIN
npm run dev             # starts on http://localhost:3002, auto-migrates schema on boot
```

The server auto-creates any missing columns on startup via `migrate()`. The base tables (`users`, `exams`, `attempts`, `question_bank`) are provisioned from `server/schema.sql` — run it once against a fresh database:

```bash
psql "$DATABASE_URL" -f server/schema.sql
```

Seed/reset demo data at any time with `POST /api/db/reset` (requires a valid auth token) or `npm run seed`.

### 2. Client

```bash
cd client
npm install
cp .env.example .env    # set VITE_USE_SERVER=true and VITE_API_URL=http://localhost:3002
npm run dev              # starts on http://localhost:5173
```

Set `VITE_USE_SERVER=false` to run the client entirely against an in-browser mock API (no backend/DB needed) — handy for isolated frontend work.

### Demo Accounts
Password `pass123` for all:

| Username | Role |
|---|---|
| admin | admin |
| teacher1, teacher2 | teacher |
| student1, student2 | student |

## Testing

```bash
cd client && npm test    # Vitest component/service tests
```

## Deployment

`render.yaml` defines a Render Blueprint with three resources: the Express API, the static client build, and a managed PostgreSQL database. Push to the connected branch and Render provisions/updates all three; set `CLIENT_ORIGIN` (server) and `VITE_API_URL` (client) to each other's deployed URLs after the first deploy.
