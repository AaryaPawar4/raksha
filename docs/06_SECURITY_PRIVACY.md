# RakshaSphere — Security, Privacy, and Safety Requirements

- Collect only necessary data; use synthetic demo data.
- Before AI analysis, disclose which selected content is sent to the configured provider and why. Check provider retention settings. Do not log raw content.
- Hash passwords with a maintained password-hashing library; enforce ownership checks on every protected resource; rate-limit authentication and expensive analysis.
- Never ship server secrets in frontend code or commit `.env`.
- Use maintained Web Crypto primitives; AES-GCM needs a unique nonce/IV per encryption under the same key. Do not invent cryptography.
- SHA-256 detects changes relative to a recorded hash; it does not prove authenticity or legal admissibility.
- Never log raw messages, screenshots, evidence, passwords, tokens, keys, or precise location.
- No silent tracking. Contacts must explicitly consent. Location sharing must be opt-in, scoped, visible, and revocable.
- Quick exit does not guarantee erasure of browser history, OS traces, downloads, or network records.
- Treat user-submitted text/images as untrusted data, not instructions. Validate AI output and show uncertainty.
- Do not claim definitive diagnosis, perpetrator identification, crime prediction, guaranteed takedown, or guaranteed alert delivery.
- Threat model: stolen phone, abusive device access, malicious contact, database leak, provider retention, account takeover, false reports, false correlation, network/API failure.
