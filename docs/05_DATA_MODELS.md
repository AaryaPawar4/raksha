# RakshaSphere — Proposed Data Models

These are starting domain definitions; finalize types and validators during implementation.

- **User:** id, email, passwordHash (bcrypt 12 rounds), name, refreshTokens array, createdAt, updatedAt.
  - Model Schema:
    - `email`: String, required, unique, lowercase, trim, max 254
    - `passwordHash`: String, required (never plaintext password)
    - `name`: String, required, trim, max 100
    - `refreshTokens`: Array of subdocuments:
      - `tokenHash`: String, required (SHA-256 digest of refresh token)
      - `family`: String, required (UUID for token rotation family)
      - `expiresAt`: Date, required
      - `isRevoked`: Boolean, default false
      - `createdAt`: Date
    - Indexes: `{ email: 1 }` (unique), `{ 'refreshTokens.tokenHash': 1 }`
- **Incident:** id, ownerId, type, status, user-confirmed metadata, createdAt, updatedAt. Avoid saving raw content by default.
- **ThreatAnalysis:** incidentId, incidentType, severity, indicators, uncertainties, immediateSteps, nextSteps, playbookVersion, safe provider/model metadata, createdAt.
- **ThreatLink:** id, ownerId, incidentAId, incidentBId, matchType, matchedEvidenceRef, strength, explanation, userDisposition, createdAt.
- **EvidenceItem:** id, ownerId, incidentId, encryptedBlobRef, sha256, mimeType, size, userEnteredCaptureTime, serverReceivedAt, encryption version and IV/nonce metadata.
- **Case:** id, ownerId, incidentId, reportingChannel, referenceNumber, status, followUpAt, notes, timestamps.
- **TrustedContact:** id, ownerId, name, phone, email, consentStatus (`PENDING` | `CONSENTED` | `DECLINED`), consentGivenAt, createdAt, updatedAt.
  - Model Schema:
    - `ownerId`: String, required, indexed
    - `name`: String, required, trim, max 100
    - `phone`: String, optional, trim, max 30
    - `email`: String, optional, trim, max 200
    - `consentStatus`: String enum (`PENDING`, `CONSENTED`, `DECLINED`), default `PENDING`
    - `consentGivenAt`: Date, optional (populated on `CONSENTED`, cleared on `DECLINED`)
    - Compound Index: `{ ownerId: 1, createdAt: -1 }`
- **CheckIn:** id, ownerId, contactId, contactName, message, locationSharingEnabled, latitudeSnapshot, longitudeSnapshot, status (`ACTIVE` | `COMPLETED` | `CANCELLED` | `OVERDUE`), dueAt, completedAt, cancelledAt, deliveryState (`PREPARED` | `OPENED_IN_APP` | `CONFIRMED`), deliveryDisclaimer, createdAt, updatedAt.
  - Model Schema:
    - `ownerId`: String, required, indexed
    - `contactId`: String, required, indexed
    - `contactName`: String, required
    - `message`: String, required, max 2000
    - `locationSharingEnabled`: Boolean, default false
    - `latitudeSnapshot`: Number, optional (-90..90) — stored only if `locationSharingEnabled` is true
    - `longitudeSnapshot`: Number, optional (-180..180) — stored only if `locationSharingEnabled` is true
    - `status`: String enum (`ACTIVE`, `COMPLETED`, `CANCELLED`, `OVERDUE`), default `ACTIVE`
    - `dueAt`: Date, optional
    - `completedAt`: Date, optional
    - `cancelledAt`: Date, optional
    - `deliveryState`: String enum (`PREPARED`, `OPENED_IN_APP`, `CONFIRMED`), default `PREPARED`
    - `deliveryDisclaimer`: String, mandatory notice on non-guaranteed delivery
    - Compound Index: `{ ownerId: 1, createdAt: -1 }`
- **AuditEvent:** ownerId, action, timestamp; no incident body, evidence, secrets, or precise location.

ThreatLink must compare only the current user's authorized incidents. Never store plaintext evidence by default.
