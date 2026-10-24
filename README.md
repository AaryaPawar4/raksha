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
   - `MONGODB_URI`: Connection string for MongoDB Atlas or local MongoDB (e.g. `mongodb://localhost:27017/rakshasphere`)

> **Note on MongoDB**:
> - If `MONGODB_URI` is omitted, the backend server still starts cleanly and health checks succeed. Database-backed operations return a safe `503 Service Unavailable` message without exposing credentials.
> - The automated test suite uses `mongodb-memory-server` and runs without requiring an external MongoDB instance.

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

### 2. Incident Intake APIs (Phase 1)

#### Create Incident
```bash
POST /api/v1/incidents
Headers:
  Content-Type: application/json
  x-demo-user-id: user-alice  # Development/demo mode tenant identifier

Payload:
{
  "title": "Harassing direct messages",
  "incidentType": "HARASSMENT",
  "description": "Received threatening messages on Instagram.",
  "platform": "INSTAGRAM",
  "occurredAt": "2026-10-24T12:00:00.000Z",
  "identifiers": [
    { "type": "USERNAME", "value": "@badactor123" }
  ]
}
```

#### List Incidents (Authenticated User Only)
```bash
GET /api/v1/incidents?page=1&limit=10&status=OPEN
Headers:
  x-demo-user-id: user-alice
```

#### Get Incident By ID
```bash
GET /api/v1/incidents/:id
Headers:
  x-demo-user-id: user-alice
```

### 3. ThreatLink Correlation APIs (Phase 2)

#### Get ThreatLink Correlated Edges for Incident
```bash
GET /api/v1/incidents/:id/links
Headers:
  x-demo-user-id: user-alice
```
Sample response:
```json
{
  "success": true,
  "data": [
    {
      "id": "671a100f1d43a53e3cb83900",
      "ownerId": "user-alice",
      "sourceIncidentId": "671a073f1d43a53e3cb8371a",
      "relatedIncidentId": "671a082b1d43a53e3cb8372b",
      "relatedIncident": {
        "id": "671a082b1d43a53e3cb8372b",
        "title": "Harassment via Twitter",
        "incidentType": "STALKING",
        "platform": "TWITTER_X",
        "occurredAt": "2026-10-24T12:00:00.000Z",
        "status": "OPEN"
      },
      "matchType": "EXACT_IDENTIFIER",
      "matchedIdentifierType": "USERNAME",
      "matchedValueMasked": "@ba******99",
      "strength": "STRONG",
      "explanation": "Exact match on USERNAME (@ba******99) between this incident and \"Harassment via Twitter\".",
      "warning": "A correlation does not prove common ownership, perpetrator identity, or culpability. Treat this as an investigative lead only.",
      "userDisposition": "PENDING",
      "createdAt": "2026-10-24T13:20:00.000Z",
      "updatedAt": "2026-10-24T13:20:00.000Z"
    }
  ]
}
```

#### Submit ThreatLink Disposition Feedback
```bash
POST /api/v1/threat-links/:id/feedback
Headers:
  Content-Type: application/json
  x-demo-user-id: user-alice

Payload:
{
  "disposition": "RELEVANT"  # "RELEVANT" | "NOT_RELATED" | "UNSURE"
}
```

### 4. Safety Indicators & Curated Playbook Analysis (Phase 3)

#### Analyze Incident (Deterministic Rules + Optional Consented AI)
```bash
POST /api/v1/incidents/:id/analyze
Headers:
  Content-Type: application/json
  x-demo-user-id: user-alice

Payload:
{
  "consentToAiProcessing": true,  # set to false for offline deterministic rules only
  "consentTimestamp": "2026-10-24T13:30:00.000Z"
}
```
Sample response:
```json
{
  "success": true,
  "data": {
    "incidentId": "671a073f1d43a53e3cb8371a",
    "incidentType": "BLACKMAIL",
    "platform": "WHATSAPP",
    "analysisMode": "AI_ASSISTED",
    "providerStatus": "COMPLETED",
    "overallSeverity": "HIGH",
    "ruleIndicators": [
      {
        "id": "THREATS_OR_BLACKMAIL",
        "name": "Threats or Blackmail / Extortion",
        "severity": "HIGH",
        "confidence": "HIGH",
        "explanation": "Detected high-risk extortion or threatening language signals: [\"pay or else\", \"leak your\"].",
        "uncertaintyNotes": "Keyword detection indicates threatening language but cannot establish intent without human review."
      }
    ],
    "playbook": {
      "category": "BLACKMAIL",
      "title": "Extortion and Blackmail Response Playbook",
      "version": "2026.1",
      "immediateSafetySteps": [
        "Do not pay or send any money or requested items.",
        "Do not delete messages or sender profiles."
      ],
      "officialReportingChannels": [
        {
          "name": "National Cyber Crime Reporting Portal (India)",
          "url": "https://cybercrime.gov.in",
          "verifiedDate": "2026-10-01"
        }
      ]
    },
    "aiAnalysis": { ... },
    "consentGiven": true,
    "disclaimer": "RakshaSphere analysis provides safety indicators and evidence preservation steps. It is not legal advice, police representation, or a definitive verdict on guilt."
  }
}
```

### 5. Evidence Vault APIs (Phase 4)

Zero-knowledge client-side encryption. User passphrases and raw plaintexts are never sent to or stored on the server.

#### Upload Encrypted Evidence
```bash
POST /api/v1/vault/items
Headers:
  Content-Type: application/json
  x-demo-user-id: user-alice

Payload:
{
  "incidentId": "671a073f1d43a53e3cb8371a",
  "filename": "harassment_chat.png",
  "mimeType": "image/png",
  "size": 154200,
  "sha256": "4a5e1e...64_hex_chars_of_original_plaintext",
  "ciphertextBase64": "U2FsdGVkX1+...",
  "encryptionMetadata": {
    "algorithm": "AES-GCM",
    "keyDerivation": "PBKDF2",
    "pbkdf2Iterations": 100000,
    "ivHex": "12_bytes_in_hex",
    "saltHex": "16_bytes_in_hex",
    "version": "1.0"
  }
}
```

#### List Evidence for Incident (Excludes Heavy Ciphertext)
```bash
GET /api/v1/vault/items?incidentId=671a073f1d43a53e3cb8371a
Headers:
  x-demo-user-id: user-alice
```

#### Retrieve Evidence for Decryption (Includes Ciphertext)
```bash
GET /api/v1/vault/items/:id
Headers:
  x-demo-user-id: user-alice
```

#### Verify Ciphertext Integrity Hash
```bash
POST /api/v1/vault/items/:id/verify
Headers:
  x-demo-user-id: user-alice
```
Sample response:
```json
{
  "success": true,
  "data": {
    "evidenceId": "671a2a4b1d43a53e3cb84012",
    "storedSha256": "4a5e1e...64_hex_chars",
    "ciphertextSha256": "8f3b2c...64_hex_chars",
    "integrityStatus": "VERIFIED",
    "verifiedAt": "2026-10-24T14:00:00.000Z",
    "disclaimer": "Cryptographic verification confirms that the stored ciphertext is intact and matches the recorded digest. Important limitation: A cryptographic hash does not by itself prove who created the file, when an alleged offline event occurred, or whether an allegation is true. It demonstrates data integrity from the moment of intake only."
  }
}
```

#### Delete Evidence Item
```bash
DELETE /api/v1/vault/items/:id
Headers:
  x-demo-user-id: user-alice
```

### 6. Action Center & Case Tracking APIs (Phase 5)

#### Generate Formal Complaint Draft
```bash
GET /api/v1/incidents/:id/report-draft
Headers:
  x-demo-user-id: user-alice
```
Returns structured narrative, perpetrator digital identifiers, catalog of preserved vault evidence with SHA-256 integrity digests, safety indicators, requested relief, and legal disclaimers.

#### Create Tracked Case (User-Reported)
```bash
POST /api/v1/cases
Headers:
  Content-Type: application/json
  x-demo-user-id: user-alice

Payload:
{
  "incidentId": "671a073f1d43a53e3cb8371a",
  "reportingChannel": "National Cyber Crime Reporting Portal (cybercrime.gov.in)",
  "referenceNumber": "NCCR-2026-981245",
  "status": "REPORTED",
  "notes": "Filed online. Awaiting IO assignment."
}
```

#### List Tracked Cases
```bash
GET /api/v1/cases?incidentId=671a073f1d43a53e3cb8371a
Headers:
  x-demo-user-id: user-alice
```

#### Update Tracked Case
```bash
PATCH /api/v1/cases/:id
Headers:
  Content-Type: application/json
  x-demo-user-id: user-alice

Payload:
{
  "status": "UNDER_REVIEW",
  "notes": "Spoke with investigating officer."
}
```

#### Delete Tracked Case
```bash
DELETE /api/v1/cases/:id
Headers:
  x-demo-user-id: user-alice
```

### 7. Run Test Suite
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
