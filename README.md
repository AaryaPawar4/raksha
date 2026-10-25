# RakshaSphere

> **Privacy-conscious women's digital safety and incident response platform.**  
> Detect recurring digital harassment across platforms, preserve cryptographically tamper-evident evidence, generate formal complaint drafts with PDF investigation dossiers, coordinate consent-driven safety check-ins, and inspect an immutable audit activity log.

---

## 1. Core Architecture & Highlights

```text
                                 ┌────────────────────────────────────────┐
                                 │       React + Vite Frontend (SPA)      │
                                 │  Dashboard, Vault, ThreatLink, CheckIn │
                                 └───────────────────┬────────────────────┘
                                                     │ HTTPS / REST (CORS restricted)
                                                     ▼
                                 ┌────────────────────────────────────────┐
                                 │     Express + TypeScript Backend       │
                                 │  AuthMiddleware, RateLimit, Controllers│
                                 └────┬──────────────┬──────────────┬─────┘
                                      │              │              │
                    ┌─────────────────▼──┐   ┌───────▼──────┐  ┌────▼─────────────────┐
                    │  ThreatLink Engine │   │Evidence Vault│  │  Check-In & Dispatch  │
                    │ Graph Correlation  │   │ AES-256-GCM  │  │ Dual-Channel Email / │
                    │ Handle/Phone Match │   │ SHA-256 Hash │  │ WhatsApp Intent Handoff
                    └─────────────────┬──┘   └───────┬──────┘  └────┬─────────────────┘
                                      │              │              │
                                 ┌────▼──────────────▼──────────────▼─────┐
                                 │         MongoDB Atlas / Mongoose       │
                                 │ Isolated Tenant Records & Activity Log │
                                 └────────────────────────────────────────┘
```

### Key Capabilities
- **ThreatLink Correlation**: Connects handles, usernames, and phone numbers across disparate incidents (e.g. Instagram impersonation + WhatsApp extortion) without cross-user data leakage.
- **Evidence Vault**: Zero-knowledge client-side and server-side AES-256-GCM encryption with SHA-256 checksums to guarantee forensic chain of custody.
- **Formal Complaint Generation & PDF Dossiers**: Generates cybercrime complaint drafts (IT Act Sections 66E, 67, 354D) and exports investigation-ready PDF dossiers with embedded hashes.
- **Safety Check-Ins & Transactional Email**: Dual-channel architecture offering manual WhatsApp/SMS app handoffs and automated transactional email dispatch with strict recipient verification, offline consent checks, and honest delivery state reporting (`ACCEPTED_BY_PROVIDER`).
- **Privacy-Preserving Safety Map**: Obfuscates incident and check-in GPS coordinates into ~1km grid radii by default, protecting victim home/work locations.
- **Immutable User Activity Audit Log**: Comprehensive timeline of account and safety actions with zero exposure of credentials, tokens, or coordinates.

---

## 2. Prerequisites

- **Node.js**: `v18.0.0` or higher (Tested on `v25.2.1`)
- **npm**: `v9.0.0` or higher (Tested on `11.6.2`)
- **Git**
- *(Optional for Production)*: MongoDB Atlas Cluster & Transactional SMTP Provider

---

## 3. Monorepo Structure

```text
raksha/
├── client/             # Frontend (React 18, Vite, Tailwind CSS, Leaflet)
├── server/             # Backend (Node.js, Express, TypeScript, Nodemailer, PDFKit)
├── shared/             # Shared TypeScript models, contracts, and DTOs
├── scripts/            # Synthetic demo seeding & cleanup scripts
│   ├── seed-demo.ts    # Safe synthetic demo seeding
│   └── cleanup-demo.ts # Safe synthetic demo cleanup
├── docs/               # System documentation & feature audit logs
│   ├── FEATURE_AUDIT.md    # Verified feature status & security test audit
│   └── SUBMISSION_DEMO.md  # Step-by-step walkthrough & presentation script
├── .env.example        # Environment variable specification template
├── package.json        # Workspace orchestrator
└── README.md
```

---

## 4. Environment Configuration

1. Copy `.env.example` to `.env` in the repository root:
   ```bash
   cp .env.example .env
   ```

2. Review the environment variables:

| Variable | Description | Default / Example |
|----------|-------------|-------------------|
| `PORT` | Backend server listening port | `5000` |
| `NODE_ENV` | Environment mode (`development`, `test`, `production`) | `development` |
| `CLIENT_URL` | Allowed frontend origin for CORS | `http://localhost:5173` |
| `VITE_API_BASE_URL` | Frontend API target | `http://localhost:5000` |
| `JWT_SECRET` | Secret key for signing access tokens | Secure random string (min 32 chars) |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | Secure random string (min 32 chars) |
| `MONGODB_URI` | MongoDB Atlas or local connection string | `mongodb://localhost:27017/rakshasphere` |
| `EMAIL_PROVIDER` | Transactional email provider (`none`, `mock`, `smtp`) | `none` (or `mock` for local tests) |
| `EMAIL_FROM` | Outgoing sender address | `"RakshaSphere" <no-reply@yourdomain.com>` |
| `SMTP_HOST` | Transactional SMTP relay host | `smtp.sendgrid.net` (or AWS SES) |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | `apikey` |
| `SMTP_PASS` | SMTP password / API token | Placeholder |
| `SMTP_SECURE` | Use TLS directly (port 465) vs STARTTLS | `false` |

> **MongoDB Atlas Resilience**: If `MONGODB_URI` is omitted or temporarily disconnected, the server boots in graceful degraded mode. Health probes succeed while database routes return standard `503 Service Unavailable` envelopes without leaking stack traces or connection strings.
>
> **Email Safety & Provider Limitations**: When `EMAIL_PROVIDER=none`, automated email check-ins are visibly disabled in the UI. When `mock` or `smtp` is configured, acceptance by the SMTP provider is recorded as `ACCEPTED_BY_PROVIDER`. This indicates queue acceptance and **never represents proof that the recipient opened or read the email**.

---

## 5. Quick Start & Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Shared Workspace
```bash
npm run build --workspace=shared
```

### 3. Run Development Servers
```bash
# Terminal 1: Backend Server (http://localhost:5000)
npm run dev:server

# Terminal 2: Frontend Client (http://localhost:5173)
npm run dev:client
```

---

## 6. Synthetic Demo Seeding & Safe Reset

RakshaSphere includes safe, deterministic seeding scripts that operate **only on synthetic demo personas** (`demo-asha@rakshasphere.org`) and never touch production or other user records.

### Seed Demo Persona
```bash
npm run seed:demo
```
**Seed Artifacts:**
- **Credentials**: `demo-asha@rakshasphere.org` / `SecurePassword123!` (Email Verified)
- **Incident 1**: Instagram Harassment & Impersonation (`@stalker_fake_99`, `+919876543210`)
- **Incident 2**: WhatsApp Extortion (`+919876543210`)
- **ThreatLink**: Automated telephone correlation between Incidents 1 and 2
- **Trusted Contact**: Pooja (Sister) with explicit recorded consent
- **Case Record**: Case `CR/2026/89410` filed under the National Cyber Crime Reporting Portal

### Clean Demo Persona
```bash
npm run cleanup:demo
```

For the complete presentation script and feature checklist, see [docs/SUBMISSION_DEMO.md](file:///c:/Users/shita/OneDrive/Desktop/raksha/docs/SUBMISSION_DEMO.md).

---

## 7. Quality Gates: Testing & Builds

### Run Complete Automated Test Suite
The backend uses `mongodb-memory-server` and mocked email transports, running completely self-contained without live database or external network access:
```bash
npm test
# Or specifically for backend:
npm run test:server
```
*Current test suite: **17 test suites, 162 passing tests (100% pass rate)**.*

### Run Workspace Typechecks
```bash
npm run typecheck
```

### Run Production Build
```bash
npm run build
```

---

## 8. Security & Privacy Invariants

1. **Strict Multi-Tenant Isolation**: Every database query scopes incident, contact, check-in, case, and vault lookups by `ownerId: req.user.id`. Cross-user access returns HTTP 404/403.
2. **Zero-Knowledge Evidence Vault**: Passphrase-derived AES-256-GCM encryption ensures plaintext files never touch disk or database. Verification uses SHA-256 digest validation.
3. **Explicit Check-In Consent**: Contacts cannot receive safety check-ins unless marked `CONSENTED`. Users sending automated emails to themselves must verify their registered address first.
4. **CSV Formula Injection Defense**: All exported incident and case fields starting with `=`, `+`, `-`, or `@` are sanitized with leading single-quotes.
5. **Redacted Activity Logging**: Password hashes, refresh tokens, encryption keys, and GPS coordinates are stripped before audit persistence.
