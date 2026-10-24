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
| GET/POST | `/api/v1/cases` | List/create tracked cases | 5 |
| POST | `/api/v1/check-ins` | Start check-in | 6 |
| POST | `/api/v1/check-ins/:id/complete` | Mark safe arrival | 6 |

ThreatLink link fields: `linkId`, `relatedIncidentId`, `matchType`, `matchedEvidence`, `strength`, `explanation`, `warning`. Match types must distinguish exact identifier matches from weaker text similarity. Feedback decisions should be enumerated (e.g. `RELEVANT`, `NOT_RELATED`, `UNSURE`).

Suggested error codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `AI_PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR`.

If contracts change, update this file and tests in the same phase.
