# Gemini Project Context

## Project Overview
E-Test System — a full client-side React SPA for exam management with no backend server.
All data is stored in the browser's localStorage via a mock API service.

## Tech Stack
- React 19 + Vite 8
- Bootstrap 5.3
- TypeScript config (tsconfig)
- localStorage for persistence (no server/database)

## Project Structure
```
client/
  src/
    api/
      mockDb.js           # Seed data (Users, Exams, Attempts)
      MockApiService.js   # OOP singleton — full CRUD for all entities
      examService.js      # Thin facade for backward compatibility
    services/
      ConfigService.js    # App-wide configuration (Singleton)
      LoggerService.js    # Leveled logging: DEBUG/INFO/WARN/ERROR (Singleton)
      StorageService.js   # Namespaced localStorage CRUD (Singleton)
      NotifyService.js    # Pub/Sub toast notification system (Singleton)
    components/
      navigation/
        NavBar.jsx        # Top bar: app name, user info, logout
        SideMenu.jsx      # Role-based sidebar menu
      teacher/
        ExamList.jsx      # Teacher exam list with status management + View Questions
        ExamForm.jsx      # Create/Edit exam form with dynamic question builder
        StudentResults.jsx# Per-exam results table with stats
      student/
        AvailableExams.jsx# Published exams list with attempt status
        TakeExam.jsx      # Exam runner: timer, questions, submit, result review
        MyResults.jsx     # Student attempt history with stats
      shared/
        NotifyToast.jsx   # Toast renderer (subscribes to NotifyService)
        ComingSoon.jsx    # Placeholder component
      QuestionViewer.jsx  # Displays a question with correct answer highlighted
      LoginPage.jsx       # Auth: login form with role selector
      RegisterPage.jsx    # Auth: register form with validation
    App.jsx               # Root: auth state, page routing, layout
  diagrams/               # Architecture diagrams (txt format)
  project_description.txt # Plain-text project documentation
```

## Key Concepts

### Navigation (no React Router)
`App.jsx` holds `activePage` + `pageParams` state.
All pages receive `onNavigate(page, params)` as a prop to switch views.

### Roles
- **teacher**: My Exams, Create Exam, Edit Exam, Student Results
- **student**: Available Exams, Take Exam, My Results

### Exam Status Flow
`draft` → `published` → `closed` (can reopen to published)

### Services Pattern
All services are OOP Singletons exported as a single instance:
```js
class MyService {
  constructor() {
    if (MyService._instance) return MyService._instance;
    MyService._instance = this;
  }
}
export default new MyService();
```

### Data Persistence
`MockApiService` holds data in memory and syncs every mutation to `StorageService` (localStorage).
On init it loads from localStorage, falling back to seed data from `mockDb.js`.

## Dev Commands
```bash
cd client
npm install
npm run dev     # starts at http://localhost:5173 (or next available port)
npm run build
```

## Demo Accounts (password: pass123)
| Username  | Role    |
|-----------|---------|
| teacher1  | teacher |
| teacher2  | teacher |
| student1  | student |
| student2  | student |

## Git Branches
- `main` — stable/published
- `dev` — integration branch
- `feature/project2-react` — all project 2 work (branched from dev)
