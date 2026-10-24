# RakshaSphere

> Privacy-conscious women's safety response platform designed to understand digital threats, correlate repeated incidents, preserve tamper-evident evidence, prepare verified reporting drafts, and coordinate safety check-ins.

---

## 1. Prerequisites

- **Node.js**: v18.0.0 or higher (Tested on `v25.2.1`)
- **npm**: v9.0.0 or higher (Tested on `11.6.2`)
- **Git**

---

## 2. Monorepo Structure

```text
raksha/
├── client/             # Frontend (React, Vite, TypeScript, Tailwind CSS)
│   └── src/
│       ├── app/        # Main App component
│       ├── services/   # Centralized API client (apiClient.ts)
│       └── ...
├── server/             # Backend (Node.js, Express, TypeScript)
│   └── src/
│       ├── config/     # Environment variable validation (Zod)
│       ├── controllers/# MVC Controllers (thin HTTP handlers)
│       ├── middleware/ # Centralized error & 404 handlers
│       ├── models/     # MVC Models (reserved for Phase 1+)
│       ├── repositories/# Data access abstraction (reserved for Phase 1+)
│       ├── routes/     # Route definitions
│       ├── services/   # Business logic (e.g., HealthService)
│       ├── utils/      # Standard API response envelopes
│       ├── validators/ # Request schema validators (reserved for Phase 1+)
│       ├── app.ts      # Express application setup
│       └── server.ts   # Server startup & lifecycle
├── shared/             # Shared TypeScript types and API contracts
│   └── src/
│       └── types/      # Standard envelope and health contracts
├── docs/               # System specifications and phase plan
├── .env.example        # Environment variable template
├── .gitignore          # Git exclusion rules
├── package.json        # Root npm workspaces script runner
└── README.md
```

---

## 3. Environment Setup

1. Copy `.env.example` to create `.env` in the root directory:

```bash
cp .env.example .env
```

2. Review the variables in `.env`:
   - `PORT`: Backend server port (default: `5000`)
   - `NODE_ENV`: Application environment (`development`, `test`, `production`)
   - `CLIENT_URL`: Allowed frontend origin for CORS (default: `http://localhost:5173`)
   - `VITE_API_BASE_URL`: Base URL used by the client API client (default: `http://localhost:5000`)

---

## 4. Installation & Running

### Install All Dependencies
From the repository root:
```bash
npm install
```

### Build Shared Package
Before running type checks or builds, build the shared package:
```bash
npm run build --workspace=shared
```

### Start Development Mode
You can start both frontend and backend concurrently, or run them in separate terminals:

```bash
# Terminal 1: Start Backend (http://localhost:5000)
npm run dev:server

# Terminal 2: Start Frontend (http://localhost:5173)
npm run dev:client
```

---

## 5. Verification & Testing

### 1. Backend Health Check
Verify the backend is functioning and producing the standard envelope:
```bash
curl http://localhost:5000/health
```
Expected response:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "rakshasphere-api",
    "timestamp": "2026-10-24T...",
    "version": "0.1.0",
    "environment": "development"
  }
}
```

### 2. Run Test Suite
Runs unit and integration tests (using Vitest and Supertest):
```bash
npm test
# Or specifically for server:
npm run test:server
```

### 3. Type Checks
Validates TypeScript compilation across all workspaces without emitting files:
```bash
npm run typecheck
```

### 4. Production Build
Builds shared types, backend bundle, and frontend production assets:
```bash
npm run build
```

---

## 6. Architecture & Security Policies

- **MVC Separation**: Backend follows `Route → Middleware → Controller → Service → Repository/Model`. Routes contain no business logic.
- **Direct Database Isolation**: React UI never accesses databases directly; all operations pass through documented backend APIs.
- **Standardized Response Envelope**:
  - Success: `{"success": true, "data": ...}`
  - Error: `{"success": false, "error": {"code": "...", "message": "..."}}`
- **Zero Raw Secret / Log Leakage**: Secrets must be in `.env` (never committed). Stack traces are hidden from API responses.
