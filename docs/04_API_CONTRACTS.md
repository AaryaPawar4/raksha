# RakshaSphere — API Contracts (Initial Draft)
Base path: `/api/v1`. Protected routes must verify authentication and ownership.

| Method | Endpoint | Purpose | Phase |
|---|---|---|---|
| GET | `/health` | Service health | 0 |
| POST | `/api/v1/incidents` | Create incident | 1 |
| GET | `/api/v1/incidents` | List own incidents | 1 |
| GET | `/api/v1/incidents/:id` | Get owned incident | 1 |
| PATCH | `/api/v1/incidents/:id` | Update allowed fields | 1 |
| POST | `/api/v1/incidents/:id/analyze` | Rules + consented AI analysis | 3 |
| GET | `/api/v1/incidents/:id/links` | Explainable ThreatLink edges | 2 |
| POST | `/api/v1/threat-links/:id/feedback` | Dismiss/confirm relevance | 2 |
| POST | `/api/v1/vault/items` | Store encrypted evidence | 4 |
| POST | `/api/v1/vault/items/:id/verify` | Verify file hash | 4 |
| GET | `/api/v1/incidents/:id/report-draft` | Generate/return draft | 5 |
| POST | `/api/v1/cases` | Create tracked case | 5 |
| GET | `/api/v1/cases` | List tracked cases | 5 |
| GET | `/api/v1/cases/:id` | Get single tracked case | 5 |
| PATCH | `/api/v1/cases/:id` | Update tracked case | 5 |
| DELETE | `/api/v1/cases/:id` | Delete tracked case | 5 |
| POST | `/api/v1/contacts` | Create trusted contact (pending consent) | 6 |
| GET | `/api/v1/contacts` | List user's trusted contacts | 6 |
| GET | `/api/v1/contacts/:id` | Get trusted contact by ID | 6 |
| PATCH | `/api/v1/contacts/:id` | Update trusted contact details | 6 |
| PATCH | `/api/v1/contacts/:id/consent` | Update consent status (CONSENTED/DECLINED) | 6 |
| DELETE | `/api/v1/contacts/:id` | Delete trusted contact | 6 |
| POST | `/api/v1/check-ins` | Start/create check-in with optional snapshot coordinates | 6 |
| GET | `/api/v1/check-ins` | List user's check-ins | 6 |
| GET | `/api/v1/check-ins/:id` | Get single check-in | 6 |
| POST | `/api/v1/check-ins/:id/complete` | Mark safe arrival | 6 |
| POST | `/api/v1/check-ins/:id/cancel` | Cancel check-in | 6 |
| POST | `/api/v1/check-ins/:id/acknowledge-delivery` | Acknowledge opened in external app | 6 |
| POST | `/api/v1/auth/register` | Register new user account with bcrypt password | 7 |
| POST | `/api/v1/auth/login` | Authenticate user, return JWT and refresh cookie | 7 |
| POST | `/api/v1/auth/refresh` | Rotate refresh token with reuse detection | 7 |
| POST | `/api/v1/auth/logout` | Revoke refresh tokens and clear cookie | 7 |
| GET | `/api/v1/auth/me` | Get authenticated user profile | 7 |
| GET | `/health/ready` | Readiness check with MongoDB ping and diagnostics | 7 |

### Phase 6 API Contracts — Consent-Based Physical Safety Check-In

#### 1. Trusted Contacts (`/api/v1/contacts`)
- **`POST /api/v1/contacts`**: Body: `{ name: string, phone?: string, email?: string }`. Returns `TrustedContact` with `consentStatus: 'PENDING'`. Does NOT send any automated messages to the contact.
- **`GET /api/v1/contacts`**: Returns array of own `TrustedContact` items.
- **`GET /api/v1/contacts/:id`**: Returns single owned `TrustedContact` (or 404).
- **`PATCH /api/v1/contacts/:id`**: Body: `{ name?: string, phone?: string, email?: string }`.
- **`PATCH /api/v1/contacts/:id/consent`**: Body: `{ consentStatus: 'CONSENTED' | 'DECLINED' }`. Setting `CONSENTED` records `consentGivenAt: ISO string`. Setting `DECLINED` clears `consentGivenAt`.
- **`DELETE /api/v1/contacts/:id`**: Soft/hard removes contact record for owner.

#### 2. Check-Ins (`/api/v1/check-ins`)
- **`POST /api/v1/check-ins`**: Body: `{ contactId: string, message: string, locationSharingEnabled: boolean, latitudeSnapshot?: number, longitudeSnapshot?: number, dueAt?: string }`.
  - If `locationSharingEnabled` is false: backend strips/omits coordinates completely.
  - If `locationSharingEnabled` is true: requires valid `latitudeSnapshot` (-90..90) and `longitudeSnapshot` (-180..180).
  - Initializes `deliveryState: 'PREPARED'` and `deliveryDisclaimer`.
- **`GET /api/v1/check-ins`**: Lists user's check-in history.
- **`GET /api/v1/check-ins/:id`**: Retrieves check-in by ID.
- **`POST /api/v1/check-ins/:id/complete`**: Updates status to `COMPLETED` and sets `completedAt`.
- **`POST /api/v1/check-ins/:id/cancel`**: Updates status to `CANCELLED` and sets `cancelledAt`.
- **`POST /api/v1/check-ins/:id/acknowledge-delivery`**: Transitions `deliveryState` to `OPENED_IN_APP`. Delivery is not confirmed until verified by an external provider or contact acknowledgement.

### Phase 7 API Contracts — Integration & Security Hardening

#### 1. Authentication & Session Management (`/api/v1/auth`)
- **`POST /api/v1/auth/register`**: Body: `{ email: string, password: string, name: string }`. Password requires min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character. Returns `{ user, accessToken, refreshToken? }` (refreshToken only returned in response body in non-production environments) and sets `raksha_refresh_token` HttpOnly cookie.
- **`POST /api/v1/auth/login`**: Body: `{ email: string, password: string }`. Returns `{ user, accessToken, refreshToken? }` and sets `raksha_refresh_token` HttpOnly cookie.
- **`POST /api/v1/auth/refresh`**: Body: `{ refreshToken?: string }` or relies on `raksha_refresh_token` cookie. Rotates refresh token within token family; detects replay/reuse attempts and revokes entire family on detection.
- **`POST /api/v1/auth/logout`**: Authenticated (or provides token). Revokes refresh token / all active sessions, clears cookie.
- **`GET /api/v1/auth/me`**: Authenticated with `Authorization: Bearer <accessToken>`. Returns `User` profile.

#### 2. Health & Readiness Probes (`/health`, `/health/ready`)
- **`GET /health`**: Liveness probe returning service status.
- **`GET /health/ready`**: Readiness probe checking MongoDB connection pool, ping round-trip latency, and Atlas connectivity indicator. Returns HTTP 200 `{ status: 'ready', database: { connected: true, pingLatencyMs: number, isAtlas: boolean } }` or HTTP 503 `{ status: 'not_ready', ... }`.

ThreatLink link fields: `linkId`, `relatedIncidentId`, `matchType`, `matchedEvidence`, `strength`, `explanation`, `warning`. Match types must distinguish exact identifier matches from weaker text similarity. Feedback decisions should be enumerated (e.g. `RELEVANT`, `NOT_RELATED`, `UNSURE`).

Suggested error codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `AI_PROVIDER_UNAVAILABLE`, `CONFLICT`, `INTERNAL_ERROR`.

If contracts change, update this file and tests in the same phase.
