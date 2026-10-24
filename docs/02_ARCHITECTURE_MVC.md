# RakshaSphere — Architecture and MVC Structure

## Architecture
Use a frontend/backend split. Backend MVC-style separation:
- Model: schema and persistence.
- View: HTTP JSON response representation; React UI is a separate frontend.
- Controller: request/response handling, calling services.
- Routes: map endpoints to controllers.
- Services: business logic and integrations.
- Repositories (recommended): database access isolated from services.
- Middleware: authentication, authorization, validation, rate limits, errors.

## Proposed repository structure
```text
RakshaSphere/
├── client/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── features/{auth,incidents,threatlink,vault,action-center,safety}/
│       ├── services/       # API client
│       ├── hooks/
│       ├── types/
│       └── utils/
├── server/
│   └── src/
│       ├── config/
│       ├── models/         # MVC Model
│       ├── repositories/
│       ├── controllers/    # MVC Controller
│       ├── routes/
│       ├── services/{analysis,threatlink,playbooks,vault,reports,safety}/
│       ├── middleware/
│       ├── validators/
│       ├── utils/
│       ├── jobs/
│       ├── app.ts
│       └── server.ts
├── shared/
├── docs/
├── .env.example
├── .gitignore
└── README.md
```

## Request flow
`HTTP request → Route → Middleware → Controller → Service → Repository/Model → Controller → JSON response → React UI`

Routes should not contain business logic. Controllers should remain thin. React components must not access MongoDB directly. Frontend calls documented backend APIs.

## Stack
React + Vite + TypeScript + Tailwind; Node.js + Express + TypeScript; MongoDB Atlas + Mongoose; AI provider behind a service interface; Web Crypto API for client-side encryption/hash if implemented.

## Response envelope
Success: `{"success":true,"data":{}}`
Error: `{"success":false,"error":{"code":"VALIDATION_ERROR","message":"Safe user-readable message"}}`
Never expose stack traces or secrets.
