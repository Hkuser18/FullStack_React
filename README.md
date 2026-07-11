# ExamsApp

**GitHub Repository:** [Insert Link Here]
**Live Deployment:** [Insert Link Here]

A full-stack online exam management system built for the Tel-Hai College FullStack course. Teachers create and publish exams, students take them and get auto-graded results, and an admin approves new teacher accounts.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for diagrams (ER diagram, use cases, component hierarchy, auth sequence, OOP UML).

## Features

- **Auth** — JWT login/register, bcrypt-hashed passwords, role-based access (admin / teacher / student)
- **Admin** — approve or reject pending teacher registrations
- **Teacher** — create/edit/delete exams, build a reusable question bank (multiple-choice + open-ended), publish/close/reopen exams, optional exam scheduling window, view student results with per-exam stats
- **Student** — browse published exams, take an exam under a countdown timer, auto-graded submission (exact match for multiple-choice, keyword match for open-ended), view score history and answer review
- **Dual API layer** — the client can run against a real Express/PostgreSQL backend or a localStorage-backed mock, toggled by an env var (useful for frontend-only development)
- **CSV question import/export** — bulk-load or export question bank entries; see [`docs/QUESTION_IMPORT_FORMAT.md`](docs/QUESTION_IMPORT_FORMAT.md)
- **AI-generated questions** — teachers can generate multiple-choice/open questions from a topic prompt (Gemini API), review a preview, and add selected ones to the question bank. Optional — set `GEMINI_API_KEY` to enable; the rest of the app works without it

## Tech Stack & Packages

### Client
- **Architecture**: Component-based UI (React) with an OOP Service layer (Singletons for auth, logging, storage, notifications) and an abstracted API layer.
- **Packages**: React 19 + Vite, Bootstrap 5, React-Bootstrap, Vitest + Testing Library for unit tests.

### Server
- **Architecture**: MVC-inspired Express app with router middleware, controller logic, and a data access layer using PostgreSQL.
- **Packages**: Express (ESM), `jsonwebtoken` for stateless JWT auth, `bcryptjs` for password hashing, `cors` for cross-origin requests, `pg` for PostgreSQL database connection.

### Other Technologies
| Layer | Technology |
|---|---|
| Database | PostgreSQL (`pg`) |
| AI | Google Gemini API (`@google/genai`) — optional, free-tier key |
| CI | GitHub Actions |
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

## Milestones & Git Branches

During the development of the project, we worked with the following structure:
- **`main`**: The stable branch, representing the finished/published state of the application.
- **`dev`**: The integration branch used for ongoing development, feature additions, and testing before merging into `main`.

## Work Processes & Deploy

### Configurations
Environment variables are used to configure both client and server behaviors.
- **Server**: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`
- **Client**: `VITE_USE_SERVER` (to toggle between Mock and Server API), `VITE_API_URL`

### Unit Testing
Vitest is configured for the client to test components and services in isolation.
```bash
cd client && npm test    # Vitest component/service tests
```

### Logging
A custom `LoggerService` (Singleton) is used on the client for leveled logging (`DEBUG`, `INFO`, `WARN`, `ERROR`), which aids in debugging and tracking application state over time.

## Deployment

`render.yaml` defines a Render Blueprint with three resources: the Express API, the static client build, and a managed PostgreSQL database. Push to the connected branch and Render provisions/updates all three; set `CLIENT_ORIGIN` (server) and `VITE_API_URL` (client) to each other's deployed URLs after the first deploy.
