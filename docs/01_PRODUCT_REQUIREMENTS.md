# RakshaSphere — Product Requirements

## Summary
RakshaSphere is a privacy-conscious women's safety response platform that helps a user understand a reported digital threat, connect potentially related incidents, preserve selected evidence, prepare a complaint draft, access reporting guidance, and optionally use a consent-based physical safety check-in.

## Core user journey
1. User creates or opens an incident.
2. User enters text or deliberately selects a screenshot for analysis.
3. The app explains what content will be sent to the configured AI provider before analysis.
4. Rule-based checks and AI analysis produce structured indicators, uncertainty, severity guidance, and a reviewed action playbook.
5. ThreatLink checks the user's own incidents for explainable potential relationships.
6. User chooses whether to save evidence in the vault.
7. User can generate an editable complaint draft and open verified reporting guidance.
8. Optional: user starts a check-in and chooses whether to share location with an explicitly consenting contact.

## Functional requirements
- Incident management: create/list/view/update only the authenticated user's incidents.
- AI-assisted response: structured incident type, indicators, uncertainty, next steps, reviewed playbook references, schema validation and fallback.
- ThreatLink: exact identifier matching first; optional text similarity later; explain every link; allow dismissal; never claim identity or guilt.
- Evidence vault: user-selected evidence, client-side SHA-256 and encryption if implemented, verification, export; explain limits of hashes.
- Action Center: verified links, editable complaint draft, manual case tracker; never auto-submit.
- Safety check-in: explicit contact consent; explicit, scoped and revocable location sharing; test delivery honestly.

## Non-functional requirements
Secure defaults, input validation, authorization, accessible responsive UI, safe errors, no sensitive content in logs, documented setup and limitations.

## Out of scope
Bluetooth mesh, hardware power-button triggers, covert/background recording, automatic police contact, guaranteed deepfake detection, perpetrator identification, or guaranteed takedown/alert delivery.

## MVP success
Synthetic demo: report incident → analyze → show explainable ThreatLink relationships → save/verify selected evidence → generate report draft. Add check-in only after the core flow is reliable.
