# RakshaSphere — Phase Implementation Tracker

| Phase | Name | Status | Completion Date | Approver |
|---|---|---|---|---|
| Phase 0 | Alignment and Project Setup | Approved | 2026-10-24 | User |
| Phase 1 | UI Foundation and Incident Intake | Approved | 2026-10-24 | User |
| Phase 2 | ThreatLink Correlation | Approved | 2026-10-24 | User |
| Phase 3 | AI Analysis and Playbooks | Approved | 2026-10-24 | User |
| Phase 4 | Evidence Vault | Approved | 2026-10-24 | User |
| Phase 5 | Action Center & Case Tracking | Approved | 2026-10-24 | User |
| Phase 6 | Physical Safety Check-in | Approved with Limitations | 2026-10-24 | Verified (93/93 tests) |
| Phase 7 | Security and Evaluation | Complete & Verified (Pass with Limitations) | 2026-10-24 | Verified (121/121 tests) |
| Phase 8A | Deployment Prerequisites & Demo Readiness | Complete & Verified | 2026-10-24 | Verified (121/121 tests) |
| Phase 8B | Live Deployment & Demo Execution | Pending User Authorization | — | — |

---

## Phase 0: Alignment and Project Setup Summary
- **Status**: Complete & Verified
- **Scope**:
  - Monorepo folder structure (`client/`, `server/`, `shared/`, `docs/`)
  - Express MVC backend with `Route → Middleware → Controller → Service` architecture
  - `GET /health` endpoint with standard response envelope (`{ success: true, data: ... }`)
  - Centralized error handler and 404 handler
  - Startup environment variable validation with Zod (`PORT`, `NODE_ENV`, `CLIENT_URL`)
  - React + Vite + TypeScript + Tailwind CSS frontend with API client (`apiClient.ts`)
  - Local verification tests passing (Vitest + Supertest)
  - No real secrets committed; `.env.example` provided
- **Verification**:
  - `GET /health` returns status 200 with JSON envelope
  - Production builds pass for `shared`, `server`, and `client`
  - Automated tests pass (2 passing)

---

## Phase 1: UI Foundation and Incident Intake Summary
- **Status**: Complete & Verified
- **Scope**:
  - Mongoose Incident model adhering to `docs/05_DATA_MODELS.md`
  - Repository pattern `IncidentRepository` with database-level tenant isolation
  - Zod request validators for intake and list queries
  - Express routes `POST /api/v1/incidents`, `GET /api/v1/incidents`, and `GET /api/v1/incidents/:id`
  - Auth middleware providing tenant isolation via headers in development and rejecting invalid access
  - Safe error handling: non-existent/cross-user requests return 404, invalid schemas return 400
  - React frontend with full responsive UI: New Incident form, Incident List with pagination, and Incident Detail view
  - Loading, empty, and error feedback states
- **Verification**:
  - 26 Vitest integration and security tests passing using `mongodb-memory-server`
  - Strict production auth boundary tested (rejects unverified requests with 401)
  - Database unavailability 503 fallback tested without internal information leakage
  - TypeScript type checking clean across all workspaces
  - Production builds passing for `shared`, `server`, and `client`

---

## Phase 2: ThreatLink Correlation Summary
- **Status**: Complete & Verified
- **Scope**:
  - `NormalizationService` for 5 identifier types (`USERNAME`, `PHONE`, `EMAIL`, `URL`, `OTHER`) preserving raw data
  - Exact-match correlation service strictly bounded to current user (`req.user.id`)
  - Canonical pair deduplication (`incidentA:incidentB` sorted) preventing redundant edges
  - Safe identifier masking in explanations (`@th******23`, `+91******210`, `t***r@example.com`)
  - Disclaimer: clear warnings that correlations are investigative leads, not legal proof
  - API endpoints: `GET /api/v1/incidents/:id/links` and `POST /api/v1/threat-links/:id/feedback`
  - Feedback dispositions: `RELEVANT`, `NOT_RELATED`, `UNSURE` with database persistence
  - Interactive React UI in `IncidentDetailPage` with lead assessment controls and live state feedback
- **Verification**:
  - 50 Vitest unit and integration tests passing (17 normalization tests + 7 ThreatLink tests + 26 existing tests)
  - Cross-user tenant isolation tested: shared identifier across two users never correlates
  - Self-matching excluded: incident never links to itself
  - TypeScript type checks clean across all workspaces (0 errors)
  - Production builds passing for `shared`, `server`, and `client`

---

## Phase 3: AI Analysis and Playbooks Summary
- **Status**: Complete & Verified
- **Scope**:
  - Deterministic `RuleAnalysisService` identifying 6 core threat indicators with signal attribution and uncertainty notes
  - `PlaybookService` with curated safety playbooks for all 7 incident categories and verified reporting channels
  - Optional AI analysis (`POST /api/v1/incidents/:id/analyze`) with explicit pre-submission disclosure and checkbox consent
  - Data minimization: only category, platform, date, and description summary are transmitted to Gemini API; no credentials or location
  - Strict Zod schema validation on AI provider response
  - Resilient offline fallback: if provider key is missing, network times out, or output is malformed, rules & playbooks serve as complete fallback
  - Interactive React UI in `IncidentDetailPage` with indicators, playbooks, consent workflow, and non-substitutability warnings
- **Verification**:
  - 61 Vitest unit and integration tests passing (11 new analysis tests)
  - Verified no provider call occurs when `consentToAiProcessing` is false
  - Verified cross-user isolation: User B cannot trigger analysis on User A incident
  - TypeScript type checks clean across all workspaces (0 errors)
  - Production builds passing for `shared`, `server`, and `client`

---

## Phase 4: Evidence Vault Summary
- **Status**: Complete & Verified
- **Scope**:
  - Zero-knowledge client-side encryption using the Web Crypto API (`CryptoVaultService`):
    - AES-GCM 256-bit encryption with fresh 12-byte IV (nonce) for every file.
    - PBKDF2 key derivation (100,000 iterations, 16-byte random salt) from user passphrase.
    - SHA-256 integrity hash calculated over plaintext bytes in-browser before encryption.
    - Zero plaintexts, encryption keys, or passphrases ever transmitted to or stored on server.
  - Server-side encrypted storage architecture adhering to MVC:
    - `EvidenceModel` with tenant isolation (`ownerId`, `incidentId`), max 10MB bounds, and schema versioning.
    - `EvidenceRepository` with projected listing queries excluding `ciphertextBase64` for high performance and reduced network overhead.
    - `VaultService` and `VaultController` handling upload, list, get, verify, and delete with strict incident ownership enforcement.
    - API endpoints: `POST /api/v1/vault/items`, `GET /api/v1/vault/items?incidentId=...`, `GET /api/v1/vault/items/:id`, `POST /api/v1/vault/items/:id/verify`, `DELETE /api/v1/vault/items/:id`.
  - Cryptographic verification endpoint:
    - Validates stored ciphertext integrity and returns intake SHA-256 digest alongside a clear legal disclaimer ("A hash does not by itself prove who created the file, when an alleged event occurred, or whether an allegation is true").
  - Frontend Evidence Vault UI (`EvidenceVaultSection.tsx`):
    - Clear loss-of-key warning banner (unrecoverable if passphrase is forgotten).
    - In-browser file hashing, key derivation, and AES-GCM encryption with live step-by-step progress indicator.
    - Evidence item list displaying filename, size, MIME type badge, date, and SHA-256 fingerprint with one-click copy.
    - "Verify Hash" action and result banner.
    - "Decrypt & Download" action: prompts for passphrase, downloads ciphertext, decrypts in browser memory, verifies against recorded intake SHA-256, and triggers download via object URL without local disk persistence.
    - Integrated into `IncidentDetailPage.tsx` and updated `HomePage.tsx`.
- **Verification**:
  - 72 Vitest unit and integration tests passing (11 new vault tests).
  - Web Crypto roundtrip verified: successful decryption with correct passphrase, failure on wrong passphrase, and tamper detection on altered ciphertext.
  - Cross-user tenant isolation verified: User B cannot upload, retrieve, verify, or delete User A's evidence.
  - Size limit verified: payloads > 10MB or malformed hashes are rejected with 400.
  - TypeScript type checks clean across all workspaces (0 errors).
  - Production builds passing for `shared`, `server`, and `client`.

---

## Phase 7: Security and Evaluation (Integration & Security Hardening)
- **Status**: Complete & Verified (116/116 tests passing)
- **Scope**:
  - **RS-015A (Production Authentication & Session Management)**:
    - User registration (`POST /api/v1/auth/register`) and login (`POST /api/v1/auth/login`) with bcrypt (12 rounds) password hashing.
    - Token generation and verification: short-lived JWT access tokens (15m expiry) and long-lived refresh tokens (7d expiry).
    - Refresh tokens stored as SHA-256 hashes in MongoDB with UUID family grouping for automatic reuse/replay detection (`POST /api/v1/auth/refresh`). On token reuse attempt, the entire token family is revoked immediately.
    - Refresh tokens transmitted via `HttpOnly`, `SameSite=Lax`, `Secure` (production) cookies (`raksha_refresh_token`).
    - `authMiddleware` verifies standard `Authorization: Bearer <jwt>` across all environments; demo user headers strictly rejected with 401 in production mode.
  - **RS-015B (Security Hardening & Rate Limiting)**:
    - Helmet HTTP security headers globally applied (X-Frame-Options: DENY, strict referrer policy, CSP in production).
    - Strict origin CORS verification with credentials support using allowlist (`CLIENT_URL` / `CORS_ORIGIN`).
    - Category-specific rate limiters: Global (300 req/15m), Auth (15 req/15m), AI Analysis (20 req/15m), Vault Upload (30 req/15m), relaxed to 1000+ during automated testing.
  - **RS-015C (MongoDB Atlas Resilience & Diagnostics)**:
    - Database connection pool settings (min 5, max 50), timeout configs, and automatic reconnection event listeners.
    - Masked connection string logging (`maskMongoUri`).
    - Dedicated readiness probe `GET /health/ready` testing live ping latency via `db.admin().ping()` and Atlas detection (`mongodb+srv://`), returning 503 on disconnection.
    - Fail-fast startup logic requiring `MONGODB_URI` in production.
  - **RS-015D (End-to-End Integration Journey)**:
    - 10-step full workflow integration test (`tests/e2e-journey.test.ts`):
      1. Register two distinct users with genuine JWT credentials.
      2. Create related incidents with shared identifiers.
      3. ThreatLink exact correlation across own incidents.
      4. Deterministic safety indicators and actionable playbooks.
      5. Zero-knowledge encrypted evidence storage and integrity verification.
      6. Formal complaint draft generation and manual case tracking.
      7. Trusted contact management and explicit consent gating.
      8. Check-in preparation, external delivery acknowledgement, and completion.
      9. Cross-tenant isolation verification (User B strictly denied access to User A resources).
      10. Consistent API envelopes across success and error responses.
  - **RS-015E (Sensitive Data Audit & Sanitization)**:
    - Structured JSON security logger (`AuditLogger`) tracking critical lifecycle events across authentication, evidence vault, and check-ins.
    - Recursive redaction utility stripping passwords, tokens, cookies, secrets, coordinates, and ciphertexts from logs.
  - **RS-015F (Frontend Reliability & Error Boundary)**:
    - React class `ErrorBoundary` component with recovery UI (Reload Page / Return Home) and safe error handling.
    - Real-time offline detection banner (`navigator.onLine`, `online`/`offline` window events).
    - Client `apiClient.ts` with automatic Bearer token injection, cookie credentials, and 401 cleanup.
- **Verification**:
  - 121 Vitest unit, API, and integration tests passing across 13 test suites (0 failures).
  - TypeScript compilation passes across `shared`, `server`, and `client` (0 errors).
  - Production builds pass for all workspaces (`npm run build`).
  - Deep security audit verified: atomic refresh token rotation under concurrency, algorithm confusion defense on HS256, issuer/audience claim enforcement, recursive log redaction of sensitive credentials, CORS 403 rejection, and reverse proxy trust configuration.
  - **Verdict**: PASS WITH LIMITATIONS (Live Atlas cluster and external AI provider key pending actual production provisioning).

---

## Phase 8A: Deployment Prerequisites & Demo Readiness
- **Status**: Complete & Verified (All deployment configurations & synthetic demo scripts prepared; zero public deployment or paid resource creation)
- **Scope**:
  - **Project & Monorepo Inspection**:
    - Monorepo package manager: standard `npm` with 3 workspaces (`shared`, `server`, `client`).
    - Build dependencies verified: `@rakshasphere/shared` builds first to `./dist/index.js`, referenced by both server and client.
    - Hosting port binding: Server reads `process.env.PORT` (defaults to 5000; binds to platform assigned port on 0.0.0.0).
    - Stateless runtime verification: Zero reliance on local filesystem; encrypted evidence stored directly as documents in MongoDB.
    - Rules-only AI verification: Works deterministically without `AI_PROVIDER_API_KEY` (Gemini call gracefully skipped, rule-based indicators and curated playbooks execute 100% reliably).
    - Cross-origin cookie hardening: Updated `auth.controller.ts` with `sameSite: 'none'` and `secure: true` in production mode to allow cross-site refresh cookie handling between Vercel (`*.vercel.app`) and Render (`*.onrender.com`).
  - **Configuration Assets Created**:
    - `client/vercel.json`: Configured with SPA route rewrites (`/(.*)` -> `/index.html`) ensuring clean deep-link routing for `/check-ins`, `/incidents/:id`, etc.
    - `render.yaml`: Infrastructure-as-code blueprint for Render Web Service specifying build command (`npm install && npm run build --workspace=shared && npm run build --workspace=server`), start command (`node server/dist/server.js`), health check path (`/health/ready`), and environment variable templates.
  - **Safe Environment Variable Checklist**: Comprehensive matrix documenting all 15 configuration variables across backend and frontend, secret classifications, and hosting configuration targets.
  - **MongoDB Atlas Setup Guide**: Beginner-friendly 10-step instructions for provisioning a free M0 cluster, configuring least-privilege database user (`raksha_app`), setting network IP allowlist, testing `/health/ready`, and index verification.
  - **Synthetic Demo Walkthrough**: 12-point synthetic scenario using isolated demo persona (`demo-asha@rakshasphere.org`) covering the entire incident response lifecycle, evidence encryption, safety playbooks, case tracking, and physical safety check-in, with a zero-risk cleanup script.
- **Verification**:
  - 121 Vitest unit, API, and integration tests passing across 13 test suites (0 failures).
  - TypeScript compilation passes across `shared`, `server`, and `client` (0 errors).
  - Production builds pass for all workspaces (`npm run build`).
  - Stop condition strictly enforced: No public deployment, cloud provisioning, or live database modifications executed.

---

## Phase 5: Action Center & Case Tracking Summary
- **Status**: Complete & Verified
- **Scope**:
  - Verified Reporting Channels directory:
    - Official Indian reporting portals: National Cyber Crime Reporting Portal (1930 / cybercrime.gov.in), NCW Cyber Cell (7827170170), Emergency Response Support System (112) with verification timestamps and categories.
    - Proactive account security recommendations (2FA with TOTP, session termination, profile hardening, evidence preservation before on-platform blocking).
  - Editable Formal Complaint Draft Generator (`GET /api/v1/incidents/:id/report-draft`):
    - Synthesizes incident narrative, timestamps, and perpetrator digital identifiers.
    - Integrates deterministic safety risk indicators and immediate relief requests.
    - Catalogs preserved digital evidence with intake SHA-256 cryptographic digests for verification.
    - Explicit anti-auto-submission disclaimer: clarifies that RakshaSphere does not automatically transmit complaints to any external body and represents a user-prepared personal statement.
    - In-browser interactive editing, clipboard copy, and `.txt` file export.
  - Manual Case Tracking Backend MVC Architecture:
    - `CaseModel` with strict tenant and incident binding (`ownerId`, `incidentId`).
    - `CaseRepository` and `CaseService` supporting CRUD with status lifecycle (`REPORTED`, `UNDER_REVIEW`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), reference/acknowledgment numbers, follow-up dates, and notes.
    - Explicit non-external verification badge (`verificationBadge: 'USER_REPORTED'`).
    - API endpoints: `POST /api/v1/cases`, `GET /api/v1/cases`, `GET /api/v1/cases/:id`, `PATCH /api/v1/cases/:id`, `DELETE /api/v1/cases/:id`.
  - Frontend Action Center UI (`ActionCenterSection.tsx`):
    - Integrated directly into `IncidentDetailPage.tsx`.
    - Tabbed layout: Directory & Security, Complaint Draft Editor & Export, Case Tracking Dashboard.
    - Active card updated on `HomePage.tsx`.
- **Verification**:
  - 79 Vitest unit and integration tests passing (7 new case tracking and report draft tests).
  - Cross-user tenant isolation tested: User B cannot generate drafts, create, view, update, or delete User A's cases.
  - TypeScript type checks clean across all workspaces (0 errors).
  - Production builds passing for `shared`, `server`, and `client`.

---

## Phase 7: Security and Evaluation (Integration & Security Hardening)
- **Status**: Complete & Verified (116/116 tests passing)
- **Scope**:
  - **RS-015A (Production Authentication & Session Management)**:
    - User registration (`POST /api/v1/auth/register`) and login (`POST /api/v1/auth/login`) with bcrypt (12 rounds) password hashing.
    - Token generation and verification: short-lived JWT access tokens (15m expiry) and long-lived refresh tokens (7d expiry).
    - Refresh tokens stored as SHA-256 hashes in MongoDB with UUID family grouping for automatic reuse/replay detection (`POST /api/v1/auth/refresh`). On token reuse attempt, the entire token family is revoked immediately.
    - Refresh tokens transmitted via `HttpOnly`, `SameSite=Lax`, `Secure` (production) cookies (`raksha_refresh_token`).
    - `authMiddleware` verifies standard `Authorization: Bearer <jwt>` across all environments; demo user headers strictly rejected with 401 in production mode.
  - **RS-015B (Security Hardening & Rate Limiting)**:
    - Helmet HTTP security headers globally applied (X-Frame-Options: DENY, strict referrer policy, CSP in production).
    - Strict origin CORS verification with credentials support using allowlist (`CLIENT_URL` / `CORS_ORIGIN`).
    - Category-specific rate limiters: Global (300 req/15m), Auth (15 req/15m), AI Analysis (20 req/15m), Vault Upload (30 req/15m), relaxed to 1000+ during automated testing.
  - **RS-015C (MongoDB Atlas Resilience & Diagnostics)**:
    - Database connection pool settings (min 5, max 50), timeout configs, and automatic reconnection event listeners.
    - Masked connection string logging (`maskMongoUri`).
    - Dedicated readiness probe `GET /health/ready` testing live ping latency via `db.admin().ping()` and Atlas detection (`mongodb+srv://`), returning 503 on disconnection.
    - Fail-fast startup logic requiring `MONGODB_URI` in production.
  - **RS-015D (End-to-End Integration Journey)**:
    - 10-step full workflow integration test (`tests/e2e-journey.test.ts`):
      1. Register two distinct users with genuine JWT credentials.
      2. Create related incidents with shared identifiers.
      3. ThreatLink exact correlation across own incidents.
      4. Deterministic safety indicators and actionable playbooks.
      5. Zero-knowledge encrypted evidence storage and integrity verification.
      6. Formal complaint draft generation and manual case tracking.
      7. Trusted contact management and explicit consent gating.
      8. Check-in preparation, external delivery acknowledgement, and completion.
      9. Cross-tenant isolation verification (User B strictly denied access to User A resources).
      10. Consistent API envelopes across success and error responses.
  - **RS-015E (Sensitive Data Audit & Sanitization)**:
    - Structured JSON security logger (`AuditLogger`) tracking critical lifecycle events across authentication, evidence vault, and check-ins.
    - Recursive redaction utility stripping passwords, tokens, cookies, secrets, coordinates, and ciphertexts from logs.
  - **RS-015F (Frontend Reliability & Error Boundary)**:
    - React class `ErrorBoundary` component with recovery UI (Reload Page / Return Home) and safe error handling.
    - Real-time offline detection banner (`navigator.onLine`, `online`/`offline` window events).
    - Client `apiClient.ts` with automatic Bearer token injection, cookie credentials, and 401 cleanup.
- **Verification**:
  - 121 Vitest unit, API, and integration tests passing across 13 test suites (0 failures).
  - TypeScript compilation passes across `shared`, `server`, and `client` (0 errors).
  - Production builds pass for all workspaces (`npm run build`).
  - Deep security audit verified: atomic refresh token rotation under concurrency, algorithm confusion defense on HS256, issuer/audience claim enforcement, recursive log redaction of sensitive credentials, CORS 403 rejection, and reverse proxy trust configuration.
  - **Verdict**: PASS WITH LIMITATIONS (Live Atlas cluster and external AI provider key pending actual production provisioning).

---

## Phase 8A: Deployment Prerequisites & Demo Readiness
- **Status**: Complete & Verified (All deployment configurations & synthetic demo scripts prepared; zero public deployment or paid resource creation)
- **Scope**:
  - **Project & Monorepo Inspection**:
    - Monorepo package manager: standard `npm` with 3 workspaces (`shared`, `server`, `client`).
    - Build dependencies verified: `@rakshasphere/shared` builds first to `./dist/index.js`, referenced by both server and client.
    - Hosting port binding: Server reads `process.env.PORT` (defaults to 5000; binds to platform assigned port on 0.0.0.0).
    - Stateless runtime verification: Zero reliance on local filesystem; encrypted evidence stored directly as documents in MongoDB.
    - Rules-only AI verification: Works deterministically without `AI_PROVIDER_API_KEY` (Gemini call gracefully skipped, rule-based indicators and curated playbooks execute 100% reliably).
    - Cross-origin cookie hardening: Updated `auth.controller.ts` with `sameSite: 'none'` and `secure: true` in production mode to allow cross-site refresh cookie handling between Vercel (`*.vercel.app`) and Render (`*.onrender.com`).
  - **Configuration Assets Created**:
    - `client/vercel.json`: Configured with SPA route rewrites (`/(.*)` -> `/index.html`) ensuring clean deep-link routing for `/check-ins`, `/incidents/:id`, etc.
    - `render.yaml`: Infrastructure-as-code blueprint for Render Web Service specifying build command (`npm install && npm run build --workspace=shared && npm run build --workspace=server`), start command (`node server/dist/server.js`), health check path (`/health/ready`), and environment variable templates.
  - **Safe Environment Variable Checklist**: Comprehensive matrix documenting all 15 configuration variables across backend and frontend, secret classifications, and hosting configuration targets.
  - **MongoDB Atlas Setup Guide**: Beginner-friendly 10-step instructions for provisioning a free M0 cluster, configuring least-privilege database user (`raksha_app`), setting network IP allowlist, testing `/health/ready`, and index verification.
  - **Synthetic Demo Walkthrough**: 12-point synthetic scenario using isolated demo persona (`demo-asha@rakshasphere.org`) covering the entire incident response lifecycle, evidence encryption, safety playbooks, case tracking, and physical safety check-in, with a zero-risk cleanup script.
- **Verification**:
  - 121 Vitest unit, API, and integration tests passing across 13 test suites (0 failures).
  - TypeScript compilation passes across `shared`, `server`, and `client` (0 errors).
  - Production builds pass for all workspaces (`npm run build`).
  - Stop condition strictly enforced: No public deployment, cloud provisioning, or live database modifications executed.

---

## Phase 6: Consent-Based Physical Safety Check-In Summary
- **Status**: Complete & Verified
- **Scope**:
  - Trusted Contacts MVC Backend (`ContactModel`, `ContactRepository`, `ContactService`, `ContactController`, `contactRoutes` at `/api/v1/contacts`):
    - Strict tenant isolation (`ownerId`).
    - Explicit consent tracking with `consentStatus` (`PENDING`, `CONSENTED`, `DECLINED`) and `consentGivenAt` timestamp tracking.
    - Zero automated message dispatch: adding a contact never triggers external messaging or contact.
  - Check-In Flow MVC Backend (`CheckInModel`, `CheckInRepository`, `CheckInService`, `CheckInController`, `checkinRoutes` at `/api/v1/check-ins`):
    - Status lifecycle: `ACTIVE`, `COMPLETED`, `CANCELLED`, `OVERDUE`.
    - Multi-state delivery tracking: `PREPARED`, `OPENED_IN_APP`, `CONFIRMED`.
    - Mandatory non-guaranteed delivery disclaimer attached to all check-ins.
    - Completion (`POST /:id/complete`) and cancellation (`POST /:id/cancel`) endpoints.
    - External app acknowledgement (`POST /:id/acknowledge-delivery`).
  - Strict Location Privacy:
    - Opt-in, foreground-only location acquisition using browser Geolocation API upon user gesture.
    - Zero background tracking, zero persistent polling, zero continuous monitoring.
    - If `locationSharingEnabled` is false, latitude and longitude snapshots are strictly discarded/cleared by the backend service.
    - Validation on coordinates: latitude (-90..90), longitude (-180..180).
  - Client UI & Navigation:
    - Tabbed `CheckInSection.tsx` component with Trusted Contacts management and Check-In launcher.
    - Message preview, location opt-in with browser permission failure fallbacks, WhatsApp/SMS intent opening, and manual copy option.
    - Prominent emergency services warning: advises users in immediate danger to call 112 (India) or local emergency services directly.
    - Dedicated `/check-ins` route, header navigation pill, and homepage feature card.
- **Verification**:
  - 92 Vitest unit and integration tests passing (13 new check-in and trusted contact tests).
  - Cross-user tenant isolation tested: Bob cannot view, update, delete, or link Alice's contacts or check-ins.
  - Location stripping tested: coordinates are never saved when location sharing is disabled.
  - TypeScript type checks clean across all workspaces (0 errors).
  - Production builds passing for `shared`, `server`, and `client`.

---

## Phase 7: Security and Evaluation (Integration & Security Hardening)
- **Status**: Complete & Verified (116/116 tests passing)
- **Scope**:
  - **RS-015A (Production Authentication & Session Management)**:
    - User registration (`POST /api/v1/auth/register`) and login (`POST /api/v1/auth/login`) with bcrypt (12 rounds) password hashing.
    - Token generation and verification: short-lived JWT access tokens (15m expiry) and long-lived refresh tokens (7d expiry).
    - Refresh tokens stored as SHA-256 hashes in MongoDB with UUID family grouping for automatic reuse/replay detection (`POST /api/v1/auth/refresh`). On token reuse attempt, the entire token family is revoked immediately.
    - Refresh tokens transmitted via `HttpOnly`, `SameSite=Lax`, `Secure` (production) cookies (`raksha_refresh_token`).
    - `authMiddleware` verifies standard `Authorization: Bearer <jwt>` across all environments; demo user headers strictly rejected with 401 in production mode.
  - **RS-015B (Security Hardening & Rate Limiting)**:
    - Helmet HTTP security headers globally applied (X-Frame-Options: DENY, strict referrer policy, CSP in production).
    - Strict origin CORS verification with credentials support using allowlist (`CLIENT_URL` / `CORS_ORIGIN`).
    - Category-specific rate limiters: Global (300 req/15m), Auth (15 req/15m), AI Analysis (20 req/15m), Vault Upload (30 req/15m), relaxed to 1000+ during automated testing.
  - **RS-015C (MongoDB Atlas Resilience & Diagnostics)**:
    - Database connection pool settings (min 5, max 50), timeout configs, and automatic reconnection event listeners.
    - Masked connection string logging (`maskMongoUri`).
    - Dedicated readiness probe `GET /health/ready` testing live ping latency via `db.admin().ping()` and Atlas detection (`mongodb+srv://`), returning 503 on disconnection.
    - Fail-fast startup logic requiring `MONGODB_URI` in production.
  - **RS-015D (End-to-End Integration Journey)**:
    - 10-step full workflow integration test (`tests/e2e-journey.test.ts`):
      1. Register two distinct users with genuine JWT credentials.
      2. Create related incidents with shared identifiers.
      3. ThreatLink exact correlation across own incidents.
      4. Deterministic safety indicators and actionable playbooks.
      5. Zero-knowledge encrypted evidence storage and integrity verification.
      6. Formal complaint draft generation and manual case tracking.
      7. Trusted contact management and explicit consent gating.
      8. Check-in preparation, external delivery acknowledgement, and completion.
      9. Cross-tenant isolation verification (User B strictly denied access to User A resources).
      10. Consistent API envelopes across success and error responses.
  - **RS-015E (Sensitive Data Audit & Sanitization)**:
    - Structured JSON security logger (`AuditLogger`) tracking critical lifecycle events across authentication, evidence vault, and check-ins.
    - Recursive redaction utility stripping passwords, tokens, cookies, secrets, coordinates, and ciphertexts from logs.
  - **RS-015F (Frontend Reliability & Error Boundary)**:
    - React class `ErrorBoundary` component with recovery UI (Reload Page / Return Home) and safe error handling.
    - Real-time offline detection banner (`navigator.onLine`, `online`/`offline` window events).
    - Client `apiClient.ts` with automatic Bearer token injection, cookie credentials, and 401 cleanup.
- **Verification**:
  - 121 Vitest unit, API, and integration tests passing across 13 test suites (0 failures).
  - TypeScript compilation passes across `shared`, `server`, and `client` (0 errors).
  - Production builds pass for all workspaces (`npm run build`).
  - Deep security audit verified: atomic refresh token rotation under concurrency, algorithm confusion defense on HS256, issuer/audience claim enforcement, recursive log redaction of sensitive credentials, CORS 403 rejection, and reverse proxy trust configuration.
  - **Verdict**: PASS WITH LIMITATIONS (Live Atlas cluster and external AI provider key pending actual production provisioning).

---

## Phase 8A: Deployment Prerequisites & Demo Readiness
- **Status**: Complete & Verified (All deployment configurations & synthetic demo scripts prepared; zero public deployment or paid resource creation)
- **Scope**:
  - **Project & Monorepo Inspection**:
    - Monorepo package manager: standard `npm` with 3 workspaces (`shared`, `server`, `client`).
    - Build dependencies verified: `@rakshasphere/shared` builds first to `./dist/index.js`, referenced by both server and client.
    - Hosting port binding: Server reads `process.env.PORT` (defaults to 5000; binds to platform assigned port on 0.0.0.0).
    - Stateless runtime verification: Zero reliance on local filesystem; encrypted evidence stored directly as documents in MongoDB.
    - Rules-only AI verification: Works deterministically without `AI_PROVIDER_API_KEY` (Gemini call gracefully skipped, rule-based indicators and curated playbooks execute 100% reliably).
    - Cross-origin cookie hardening: Updated `auth.controller.ts` with `sameSite: 'none'` and `secure: true` in production mode to allow cross-site refresh cookie handling between Vercel (`*.vercel.app`) and Render (`*.onrender.com`).
  - **Configuration Assets Created**:
    - `client/vercel.json`: Configured with SPA route rewrites (`/(.*)` -> `/index.html`) ensuring clean deep-link routing for `/check-ins`, `/incidents/:id`, etc.
    - `render.yaml`: Infrastructure-as-code blueprint for Render Web Service specifying build command (`npm install && npm run build --workspace=shared && npm run build --workspace=server`), start command (`node server/dist/server.js`), health check path (`/health/ready`), and environment variable templates.
  - **Safe Environment Variable Checklist**: Comprehensive matrix documenting all 15 configuration variables across backend and frontend, secret classifications, and hosting configuration targets.
  - **MongoDB Atlas Setup Guide**: Beginner-friendly 10-step instructions for provisioning a free M0 cluster, configuring least-privilege database user (`raksha_app`), setting network IP allowlist, testing `/health/ready`, and index verification.
  - **Synthetic Demo Walkthrough**: 12-point synthetic scenario using isolated demo persona (`demo-asha@rakshasphere.org`) covering the entire incident response lifecycle, evidence encryption, safety playbooks, case tracking, and physical safety check-in, with a zero-risk cleanup script.
- **Verification**:
  - 121 Vitest unit, API, and integration tests passing across 13 test suites (0 failures).
  - TypeScript compilation passes across `shared`, `server`, and `client` (0 errors).
  - Production builds pass for all workspaces (`npm run build`).
  - Stop condition strictly enforced: No public deployment, cloud provisioning, or live database modifications executed.


