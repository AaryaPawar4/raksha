# RakshaSphere — ThreatLink Specification

## Goal
Surface explainable possible relationships between incidents reported by the same user, helping them review patterns rather than treating every incident in isolation.

## Not intended to do
ThreatLink is not a perpetrator-identification system, crime predictor, global social-media scanner, or proof of account ownership.

## MVP correlation
1. Use incidents belonging to the authenticated user only.
2. Normalize user-supplied identifiers carefully: usernames, URLs, phone numbers, email addresses.
3. Compare exact identifiers first.
4. Optionally add text similarity only after exact-match tests pass.
5. Create a link with matchType, evidence reference, explanation, strength and user disposition.
6. Let the user mark `RELEVANT`, `NOT_RELATED`, or `UNSURE`.
7. Avoid duplicate edges and allow dismissed links to remain dismissed.

## UI
Show both incident labels/dates, match type, reason, limitations, and user controls. Display a warning: a link does not prove identity or culpability.

## Matching hierarchy
Exact normalized identifier = stronger signal. Text similarity = weaker signal. Do not infer common ownership from writing style, names, profile images, or vague semantic similarity. No face recognition.

## Required tests
- Shared exact username/URL/phone/email produces an explained link.
- Similar text without shared identifier is never shown as confirmed.
- Unrelated pair produces no strong link.
- Duplicate pair does not create duplicate edges.
- User cannot query another user's incident/link.
- Dismiss/feedback updates disposition.
- Empty history and malformed fields are handled safely.

Use synthetic labelled related/unrelated pairs. Report actual precision and false positives; prefer fewer explainable links over misleading links.
