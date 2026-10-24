# RakshaSphere — AI Coding Agent Rules

- Read this docs folder before coding.
- Follow product requirements, MVC architecture, API contracts, security requirements and ThreatLink spec.
- Work only on the phase explicitly authorized by the user.
- Inspect current code before editing; do not overwrite blindly.
- Ask before consequential architecture/security changes.
- Backend flow must be `Route → Middleware → Controller → Service → Repository/Model`.
- Routes only define endpoints/middleware. Controllers handle HTTP request/response and call services. Services contain business logic. Repositories/models handle persistence.
- React components must not access MongoDB directly. Frontend calls documented APIs through a shared API client.
- Validate request and AI output schemas. Keep secrets out of code and logs.
- Never claim a feature is done without implementation and test results.
- Never fabricate test results or metrics.
- Never implement covert tracking, unauthorized location sharing, background recording, or automatic police contact.
- Per phase: plan → implement → test → update docs/tracker → report PASS/FAIL → stop for approval.
