# Architecture & Diagrams

## System Overview

```mermaid
flowchart LR
    subgraph Client["React Client (Vite)"]
        UI[Components] --> API[api/index.js]
        API -->|VITE_USE_SERVER=false| Mock[MockApiService\nlocalStorage]
        API -->|VITE_USE_SERVER=true| Server[ServerApiService\nfetch + JWT]
    end

    Server -->|HTTPS / JSON| Express[Express API\nserver.js]
    Express --> Auth[JWT middleware\n+ role guard]
    Express --> DB[(PostgreSQL)]
```

- **No React Router** — `App.jsx` holds `activePage`/`pageParams` state; components navigate via an `onNavigate(page, params)` prop.
- **Dual API layer** — `client/src/api/index.js` swaps between `MockApiService` (localStorage, no backend) and `ServerApiService` (real Express calls with a JWT bearer token) based on `VITE_USE_SERVER`.
- **Stateless auth** — the server issues a signed JWT (`{ id, role }`, 24h expiry) on login; every protected route runs it through `auth` then an optional `requireRole(...)` guard.

## Entity-Relationship Diagram

Reflects the live schema (`users`, `exams`, `attempts`, `question_bank`) as created/maintained by `server/schema.sql` + `migrate()` in `server/server.js`.

```mermaid
erDiagram
    USERS ||--o{ EXAMS : creates
    USERS ||--o{ ATTEMPTS : submits
    USERS ||--o{ QUESTION_BANK : authors
    EXAMS ||--o{ ATTEMPTS : receives

    USERS {
        text id PK
        text username UK
        text password "bcrypt hash"
        text role "admin | teacher | student"
        text name
        text status "active | pending"
    }
    EXAMS {
        text id PK
        text title
        text description
        text status "draft | published | closed"
        text created_by FK
        int duration "minutes"
        int passing_score "percent"
        jsonb questions "embedded Question[]"
        timestamptz start_date "nullable"
        timestamptz end_date "nullable"
        timestamptz created_at
    }
    ATTEMPTS {
        text id PK
        text exam_id FK
        text student_id FK
        jsonb answers
        int score "0-100"
        boolean passed
        timestamptz started_at
        timestamptz submitted_at
    }
    QUESTION_BANK {
        text id PK
        text text
        text type "multiple-choice | open"
        jsonb options "nullable, MC only"
        int correct_option "nullable, MC only"
        jsonb keywords "nullable, open only"
        text topic
        text created_by FK
        timestamptz created_at
    }
```

Notes:
- `exams.questions` embeds question snapshots (id/text/options/correctOption or keywords) rather than referencing `question_bank` rows — the bank is a reusable authoring source, not a live foreign key relationship, so editing a bank question doesn't retroactively change past/existing exams.
- `users.role` includes `admin`, used only for the teacher-approval workflow (no admin-authored exams in practice, though the API permits it).
- Auto-grading (`POST /api/attempts`) is exact-index match for `multiple-choice`, case-insensitive keyword containment for `open`.

## Use Case Diagram

```mermaid
flowchart TB
    admin((Admin))
    teacher((Teacher))
    student((Student))

    subgraph System["ExamsApp"]
        UC1[Register / Login]
        UC2[Approve or reject\npending teachers]
        UC3[Create / edit / delete exam]
        UC4[Manage question bank]
        UC5[Publish / close / reopen exam]
        UC6[View student results]
        UC7[Browse published exams]
        UC8[Take exam\nunder timer]
        UC9[View own results\n+ answer review]
    end

    admin --> UC1
    admin --> UC2

    teacher --> UC1
    teacher --> UC3
    teacher --> UC4
    teacher --> UC5
    teacher --> UC6

    student --> UC1
    student --> UC7
    student --> UC8
    student --> UC9
```

## Component Hierarchy

```mermaid
flowchart TB
    App["App.jsx\n(user, activePage, pageParams)"]
    App --> NotifyToast
    App --> LoginPage
    App --> RegisterPage
    App --> NavBar
    App --> SideMenu

    App --> AdminPanel

    App --> ExamList
    App --> ExamForm
    App --> QuestionBank
    App --> StudentResults

    App --> AvailableExams
    App --> TakeExam
    App --> MyResults

    App --> ComingSoon
```

Role → default landing page: `admin` → Admin Panel, `teacher` → My Exams, `student` → Available Exams.

## Auth Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client (ServerApiService)
    participant S as Express Server
    participant DB as PostgreSQL

    U->>C: submit login form (username, password, role)
    C->>S: POST /api/auth/login
    S->>DB: SELECT user WHERE username, role
    DB-->>S: user row (bcrypt hash, status)
    S->>S: bcrypt.compare(password, hash)
    alt invalid credentials
        S-->>C: 401
    else status = pending
        S-->>C: 403 "awaiting admin approval"
    else success
        S->>S: jwt.sign({id, role}, 24h)
        S-->>C: 200 { user, token }
        C->>C: store JWT (session)
        C->>S: subsequent requests: Authorization: Bearer <token>
        S->>S: auth middleware verifies JWT
        S->>S: requireRole(...) checks req.user.role
    end
```

## Exam Status Flow

```mermaid
stateDiagram-v2
    [*] --> draft: teacher creates exam
    draft --> published: publish
    published --> closed: close
    closed --> published: reopen
    draft --> [*]: delete (draft only)
```

- `draft` — visible only to its creator, editable/deletable.
- `published` — visible to all students, acceptable for attempts, not deletable.
- `closed` — no new attempts accepted; existing results remain visible.
