# Gemini Project Context

## Project Overview
ExamsApp — a full-stack exam management system: React client + Express/PostgreSQL backend.
The client can also run standalone against a localStorage mock (no server) via an env flag — see below.

See [README.md](README.md) for setup and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for diagrams.

## Tech Stack
- **Client:** React 19 + Vite, Bootstrap 5.3, Vitest for tests
- **Server:** Express (ESM), PostgreSQL (`pg`), JWT auth (`jsonwebtoken`), `bcryptjs` password hashing, `cors`, `dotenv`
- **Deployment:** Render (`render.yaml` — API + static client + managed Postgres)

## Project Structure
```
client/
  src/
    api/
      index.js            # Switches Mock↔Server via VITE_USE_SERVER env var
      MockApiService.js   # localStorage-based (no server)
      ServerApiService.js # fetch → Express, sends JWT Bearer token
    services/
      AuthService.js      # login/logout/register; stores JWT + session
      ConfigService.js    # App-wide configuration (Singleton)
      LoggerService.js    # Leveled logging: DEBUG/INFO/WARN/ERROR (Singleton)
      StorageService.js   # Namespaced localStorage CRUD (Singleton)
      NotifyService.js    # Pub/Sub toast notification system (Singleton)
    components/
      navigation/
        NavBar.jsx         # Top bar: app name, user info, logout
        SideMenu.jsx       # Role-based sidebar menu
      admin/
        AdminPanel.jsx     # Approve/reject pending teacher registrations
      teacher/
        ExamList.jsx       # Teacher exam list with status management
        ExamForm.jsx       # Create/Edit exam form with dynamic question builder
        QuestionBank.jsx   # Reusable question bank (multiple-choice + open)
        StudentResults.jsx # Per-exam results table with stats
      student/
        AvailableExams.jsx # Published exams list with attempt status
        TakeExam.jsx       # Exam runner: timer, questions, submit, result review
        MyResults.jsx      # Student attempt history with stats
      shared/
        NotifyToast.jsx           # Toast renderer (subscribes to NotifyService)
        ComingSoon.jsx            # Placeholder component
        QuestionImportExport.jsx  # CSV bulk import/export for question bank
      QuestionViewer.jsx   # Displays a question with correct answer highlighted
      LoginPage.jsx        # Auth: login form with role selector
      RegisterPage.jsx     # Auth: register form with validation
    App.jsx                # Root: auth state, page routing, layout
server/
  server.js      # Single file: all Express routes + JWT middleware + migrate()
  db.js          # pg Pool + seed data exports (SEED_USERS, SEED_EXAMS, etc.)
  schema.sql     # Base table definitions (run once against a fresh DB)
  seed.js
docs/            # Architecture diagrams, CSV import format spec
```

## Key Concepts

### Navigation (no React Router)
`App.jsx` holds `activePage` + `pageParams` state.
All pages receive `onNavigate(page, params)` as a prop to switch views.

### Roles
- **admin**: Admin Panel — approve/reject pending teacher registrations
- **teacher**: My Exams, Create Exam, Edit Exam, Question Bank, Student Results
- **student**: Available Exams, Take Exam, My Results

Teacher accounts start as `status: pending` on registration and cannot log in until an admin approves them.

### Exam Status Flow
`draft` → `published` → `closed` (can reopen to published)

### Services Pattern
All client services are OOP Singletons exported as a single instance:
```js
class MyService {
  constructor() {
    if (MyService._instance) return MyService._instance;
    MyService._instance = this;
  }
}
export default new MyService();
```

### API Layer
`client/src/api/index.js` picks the backend at build time:
- `VITE_USE_SERVER=false` → `MockApiService` (in-memory + localStorage, no server needed)
- `VITE_USE_SERVER=true` → `ServerApiService` (fetch → Express, JWT bearer token from `AuthService`)

### Data Persistence (server mode)
Express (`server/server.js`) talks to PostgreSQL via `pg`. Passwords are hashed with `bcryptjs`.
Auth uses signed JWTs (`{ id, role }`, 24h expiry) verified by middleware on every protected route,
with an additional `requireRole(...)` guard for role-restricted endpoints.

### Data Persistence (mock mode)
`MockApiService` holds data in memory and syncs every mutation to `StorageService` (localStorage).
On init it loads from localStorage, falling back to seed data.

## Dev Commands
```bash
# Server
cd server
npm install
npm run dev      # starts on http://localhost:3002

# Client
cd client
npm install
npm run dev       # starts at http://localhost:5173 (or next available port)
npm run build
npm test           # Vitest
```

## Demo Accounts (password: pass123)
| Username  | Role    |
|-----------|---------|
| admin     | admin   |
| teacher1  | teacher |
| teacher2  | teacher |
| student1  | student |
| student2  | student |

## Git Branches
- `main` — stable/published
- `dev` — integration branch
