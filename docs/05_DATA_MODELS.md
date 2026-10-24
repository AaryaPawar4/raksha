# RakshaSphere — Proposed Data Models

These are starting domain definitions; finalize types and validators during implementation.

- **User:** id, authentication fields (never plaintext password), language, privacy preferences, timestamps.
- **Incident:** id, ownerId, type, status, user-confirmed metadata, createdAt, updatedAt. Avoid saving raw content by default.
- **ThreatAnalysis:** incidentId, incidentType, severity, indicators, uncertainties, immediateSteps, nextSteps, playbookVersion, safe provider/model metadata, createdAt.
- **ThreatLink:** id, ownerId, incidentAId, incidentBId, matchType, matchedEvidenceRef, strength, explanation, userDisposition, createdAt.
- **EvidenceItem:** id, ownerId, incidentId, encryptedBlobRef, sha256, mimeType, size, userEnteredCaptureTime, serverReceivedAt, encryption version and IV/nonce metadata.
- **Case:** id, ownerId, incidentId, reportingChannel, referenceNumber, status, followUpAt, notes, timestamps.
- **TrustedContact:** id, ownerId, contact details, consentStatus, consent timestamps.
- **CheckIn:** id, ownerId, dueAt, status, locationSharingEnabled, optional last location only when explicitly consented, escalation state.
- **AuditEvent:** ownerId, action, timestamp; no incident body, evidence, secrets, or precise location.

ThreatLink must compare only the current user's authorized incidents. Never store plaintext evidence by default.
