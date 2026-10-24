# RakshaSphere — Phase Plan and Acceptance Criteria
Do not start a phase until the previous phase is reviewed and explicitly approved.

## Phase 0 — Alignment and setup
Create repo folders/scripts, env example, README, health endpoint, docs and tracker.
**Done when:** client/server run with documented commands, health check works, no real secrets committed.

## Phase 1 — UI foundation and incident intake
React layout, backend error handling/validation, incident create/list/detail APIs.
**Done when:** user can create/view synthetic incident; invalid input returns safe 4xx; UI has loading/empty/error states.

## Phase 2 — ThreatLink
Normalize identifiers; exact-match correlation; optional text similarity only after exact matching; explainable links and dismiss feedback.
**Done when:** related synthetic incidents show why they link; unrelated incidents are not called confirmed; only authorized user's incidents are compared; tests pass.

## Phase 3 — AI analysis and playbooks
Rule layer, reviewed playbook data, configurable AI, consent, schema validation, timeout/fallback.
**Done when:** synthetic examples return structured results; malformed output is handled; outage falls back; no sensitive content is logged.

## Phase 4 — Evidence vault
Client-side hash/encryption, save/download/verify/export.
**Done when:** authorized user can save and verify; changed file fails hash check; encryption round-trip tests pass; limitations are disclosed.

## Phase 5 — Action Center
Verified reporting directory, editable complaint draft, manual case tracker.
**Done when:** user can export a draft and update status; links have source and last-verified date; no auto-submission.

## Phase 6 — Physical safety check-in (lower priority)
Start/complete check-in, contact consent, tested escalation if delivery service is available, explicit location sharing.
**Done when:** test consent, escalation and cancellation work; limitations documented.

## Phase 7 — Security and evaluation
Authorization review, safe logging, rate limits, synthetic evaluation set, accessibility/mobile/poor-network testing.
**Done when:** relevant tests pass, actual metrics and limitations are documented, demo works three times consecutively.

## Phase 8 — Demo and handoff
Three-minute scenario, backup video, architecture slide, README and limitations.
**Done when:** demo is repeatable and only tested features are presented as working.

## Phase gate
Before: objectives, planned files, dependencies, risks, acceptance tests.
After: changed files, tests/results, acceptance PASS/FAIL, issues, manual verification, commit reference. Wait for approval before next phase.
