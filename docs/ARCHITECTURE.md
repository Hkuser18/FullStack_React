# Architecture & Diagrams

## System Overview (Client / Server / DB / Services)

The system is split into three main layers: **Client**, **Server**, and **Database**.
- **Data Flow**: The user interacts with the **React Client** components. These components delegate business logic and data fetching to the **Client Services** and **API Layer**. The API layer sends HTTP/JSON requests to the **Express Server**. The Server routes requests, checks JWT authorization via middleware, performs business logic, and executes SQL queries against the **PostgreSQL Database**. The data is then serialized to JSON and sent back to the Client.
- **Data Storage**: User credentials, exams, questions, and attempts are persisted securely in the PostgreSQL database.
- **Interface**: The Client talks to the Server via a RESTful API (JSON over HTTPS).

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

## OOP UML Diagram (Client Services)

The client uses several Singleton services to manage state, configuration, and API communication in an Object-Oriented manner.

```mermaid
classDiagram
    class AuthService {
        -_instance: AuthService
        +login(username, password, role)
        +logout()
        +register(data)
        +getToken()
        +getUser()
    }
    class ConfigService {
        -_instance: ConfigService
        +get(key)
        +set(key, val)
    }
    class LoggerService {
        -_instance: LoggerService
        +debug(msg)
        +info(msg)
        +warn(msg)
        +error(msg)
    }
    class StorageService {
        -_instance: StorageService
        +getItem(key)
        +setItem(key, val)
        +removeItem(key)
    }
    class NotifyService {
        -_instance: NotifyService
        +subscribe(callback)
        +toast(message, type)
    }
    class MockApiService {
        -_instance: MockApiService
        +getExams()
        +submitAttempt()
    }
    class ServerApiService {
        -_instance: ServerApiService
        +getExams()
        +submitAttempt()
    }

    AuthService ..> ServerApiService : uses for auth calls
```

## Sequence Diagrams (Main Scenarios)

### 1. Authentication (Login) Sequence

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

### 2. Teacher Creates Exam Sequence

```mermaid
sequenceDiagram
    participant T as Teacher (Client)
    participant API as API Layer
    participant S as Express Server
    participant DB as PostgreSQL

    T->>API: POST /api/exams (title, description, duration)
    API->>S: HTTP POST (Bearer JWT)
    S->>S: Validate Token & requireRole('teacher')
    S->>DB: INSERT INTO exams (status='draft')
    DB-->>S: Returns new exam ID
    S-->>API: 201 Created (exam)
    API-->>T: Updates UI (ExamForm)
    
    T->>API: PUT /api/exams/:id (add questions)
    API->>S: HTTP PUT (Bearer JWT)
    S->>DB: UPDATE exams SET questions = [...]
    DB-->>S: Success
    S-->>API: 200 OK
    API-->>T: Exam saved as Draft
```

### 3. Student Takes Exam Sequence

```mermaid
sequenceDiagram
    participant St as Student (Client)
    participant API as API Layer
    participant S as Express Server
    participant DB as PostgreSQL

    St->>API: GET /api/exams/:id
    API->>S: HTTP GET (Bearer JWT)
    S->>S: Validate Token & requireRole('student')
    S->>DB: SELECT exam WHERE id AND status='published'
    DB-->>S: Returns exam data (without correct answers)
    S-->>API: 200 OK (exam)
    API-->>St: Renders TakeExam component with Timer
    
    St->>API: POST /api/attempts (exam_id, answers array)
    API->>S: HTTP POST (Bearer JWT)
    S->>DB: SELECT exam (with correct answers)
    DB-->>S: Exam data
    S->>S: Auto-grade answers (calculate score)
    S->>DB: INSERT INTO attempts (student_id, answers, score)
    DB-->>S: Returns attempt ID
    S-->>API: 201 Created (score, results)
    API-->>St: Renders MyResults with feedback
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
