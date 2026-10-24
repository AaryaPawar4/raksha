# RakshaSphere — Test Plan

## Test levels
- Unit: identifier normalization, ThreatLink matching, playbook selection, validation.
- API: status codes, response schema, authorization, invalid input, provider failure.
- Integration: persistence, encryption workflow, report export, check-in jobs if implemented.
- E2E: primary browser journey.
- Manual: real phone layout, poor network, quick-exit limitations, accessibility.

## ThreatLink minimum cases
Exact username, URL, phone/email; similar text without shared identifier; unrelated messages; duplicate pair prevention; dismissed link remains dismissed; user data isolation; empty history; malformed fields.

## AI test set
Use 20–30 synthetic examples across blackmail, impersonation, harassment, doxxing, financial scam, harmless messages with alarming words, ambiguous context, and false-positive challenges.

Record actual correct flags, false positives, missed indicators, unsupported claims, and usefulness of next steps. Do not fabricate accuracy metrics.

## Security cases
Missing/invalid auth; cross-user access attempts; oversized/invalid uploads; malformed requests; rate limits; secrets absent from logs/repo; tamper detection; AI timeout/malformed JSON; authorization on nested resources.

## Demo reliability
Seed synthetic data, create reset script, run full demo three times, prepare backup video and fallback if AI API fails.
