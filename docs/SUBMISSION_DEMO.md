# RakshaSphere — Submission Demo Walkthrough & Presentation

**Phase:** Phase G — Submission Readiness & Demo Preparation  
**Target Audience:** Judges, Evaluators, Hackathon Reviewers, Security Auditors  
**Synthetic Persona:** Asha Verma (`demo-asha@rakshasphere.org` / `SecurePassword123!`)  

---

## 1. Executive Summary & Pitch Outline

### The Problem
Digital harassment, non-consensual image sharing, blackmail, and stalking disproportionately target women online. Survivors face fragmented reporting mechanisms, fear of exposure, difficulties in proving recurring harassment across multiple platforms (e.g. Instagram + WhatsApp), and physical safety vulnerabilities when commuting.

### The Solution: RakshaSphere
RakshaSphere is a **privacy-first women's digital safety and rapid incident response system** designed around end-to-end user consent, cryptographic evidence preservation, and cross-platform threat intelligence.

### Key Differentiators
1. **ThreatLink Graph Correlation**: Correlates separate incident reports across platforms using normalized handles and phone numbers, identifying persistent serial harassers without cross-user privacy violations.
2. **Zero-Knowledge Evidence Vault**: Client-side/server-side AES-256-GCM authenticated encryption preserves tamper-evident timestamps and SHA-256 integrity hashes without exposing unencrypted files in database storage.
3. **Audit-Ready Complaint & Case Dossiers**: Generates PDF investigative dossiers with embedded checksums, chain-of-custody metadata, and sanitized CSV exports ready for the National Cyber Crime Reporting Portal or legal counsel.
4. **Consent-Driven Safety Check-Ins**: Distinguishes manual WhatsApp/SMS app intents from transactional email notifications. Enforces verified emails, strict contact consent, and honest delivery state tracking (`ACCEPTED_BY_PROVIDER`, avoiding deceptive claims that a message was read).
5. **Privacy-Preserving Geospatial Safety**: Fuzzes incident/check-in locations to ~1km grids by default to prevent precise victim tracking while allowing safe regional pattern awareness.
6. **Immutable User Activity Audit Log**: Completely redacts credentials, encryption keys, tokens, and location coordinates while giving users transparent auditability over account events.

---

## 2. Preparation & Resetting the Demo Environment

### Step 1: Ensure Local Environment is Running
1. Verify `.env` exists in the project root:
   ```bash
   # Quick setup if needed
   cp .env.example .env
   ```
2. Start the backend and frontend servers:
   ```bash
   npm run dev:server   # Port 5000
   npm run dev:client   # Port 5173
   ```

### Step 2: Seed Synthetic Demo Data
Execute the safe synthetic demo seed script (this populates a pre-configured scenario without touching any real user accounts):
```bash
npm run seed:demo
```
This prepares:
- **Demo User:** `demo-asha@rakshasphere.org` (Password: `SecurePassword123!`, Email Status: `Verified`)
- **Incident 1:** Instagram Harassment & Impersonation (Identifier: `@stalker_fake_99`, `+919876543210`)
- **Incident 2:** WhatsApp Blackmail & Extortion (Identifier: `+919876543210`)
- **ThreatLink Correlation:** Phone number link connects Incidents 1 & 2
- **Trusted Contact:** Pooja (Sister) (`pooja.sister@example.com`, Consent: `CONSENTED`)
- **Case Tracking:** Case `CR/2026/89410` filed under National Cyber Crime Reporting Portal

### Step 3: Cleanup / Safe Reset
To completely remove the synthetic demo user and all associated records:
```bash
npm run cleanup:demo
```

---

## 3. Step-by-Step Demo Walkthrough

### Act 1: Authentication & Email Verification
1. **Open Browser:** Navigate to `http://localhost:5173`.
2. **Login:**
   - Enter `demo-asha@rakshasphere.org` / `SecurePassword123!`.
   - Click **Log In**.
   - Note the silent JWT authentication flow: access tokens stored in memory/sessionStorage, refresh tokens in httpOnly cookies.
3. **Email Verification Indicator:**
   - Scroll down to the **Safety Check-In & Trusted Contacts** section.
   - Note the **Verified ✓** status badge next to `demo-asha@rakshasphere.org`.
   - *(Optional New User Walkthrough)*: Register a new account (`testuser@example.com`). Note that the email is initially unverified; clicking "Verify Email" generates a secure verification token which when submitted elevates the account to verified.

### Act 2: Interactive Safety Dashboard & Trend Analytics
1. **Navigate to `/dashboard`** (via top navbar "Dashboard" link).
2. **Review KPI Overview**:
   - Total Incidents: 2
   - Active Cases: 1
   - Risk Assessment Score: High
   - Evidence Files Preserved: 0 (or recent count)
3. **Filter Horizon**:
   - Toggle filters: `7D`, `30D`, `90D`, `All Time`. Watch the responsive SVG time-series chart smoothly adjust.
4. **Privacy-Preserving Safety Map**:
   - Scroll down to the **Consented Location Map**.
   - Point out the status markers and notice the `isFuzzed: true` badge on marker inspection: coordinates are fuzzed to a ~1km grid radius to prevent exposing exact victim addresses.

### Act 3: Incident Intake, AI Safety Analysis & ThreatLink
1. **Navigate to `/incidents`**:
   - Observe the two seeded incidents.
2. **Create a New Incident**:
   - Click **+ New Incident**.
   - Title: `Telegram Threatening Call`
   - Platform: `Telegram`
   - Description: `Anonymous user demanding immediate money transfer or will share edited photos.`
   - Identifiers: Add Phone `+919876543210`.
   - Save incident.
3. **AI Safety Analysis**:
   - Open the newly created incident.
   - Click **Analyze Threat**.
   - Observe deterministic rule-based threat assessment (extracts risk patterns, assigns High/Medium/Low, recommends emergency helplines 112 / 1930 without external API dependencies).
4. **ThreatLink Cross-Platform Graph Correlation**:
   - Click on the **ThreatLink** tab or view correlation links.
   - Observe how the telephone number `+919876543210` connects the new Telegram incident, the prior Instagram impersonation, and the WhatsApp extortion into a **single harassment ring**.
   - Emphasize: Harassers often use different handles on different apps, but RakshaSphere connects the digital breadcrumbs.

### Act 4: Evidence Vault & Cryptographic Tamper-Evidence
1. **Navigate to Evidence Vault** on the incident detail page.
2. **Upload Evidence**:
   - Upload a screenshot or PDF (e.g., chat screenshot).
   - Enter a client-side encryption passphrase.
   - The file is encrypted with AES-256-GCM.
3. **Verify Integrity**:
   - Click **Verify Integrity**.
   - The vault computes the SHA-256 hash and verifies ciphertext authentication tags, proving in court that the file has not been altered or tampered with since upload.

### Act 5: Complaint Generation, Case Tracking & PDF Dossier Export
1. **Draft Cyber Crime Complaint**:
   - Switch to the **Legal / Complaint** tab on the incident.
   - Select template: `National Cyber Crime Reporting Portal (cybercrime.gov.in)`.
   - Click **Generate Draft**.
   - Review formatted draft referencing applicable Sections (66E, 67, 354D IPC).
2. **Case Pipeline Tracking**:
   - Click **Track as Case**.
   - Reference Number: `CR/2026/91024`
   - Follow-up date: 14 days out.
3. **Export Official PDF Dossier**:
   - Click **Export Investigation PDF**.
   - Download and open the generated PDF.
   - Point out: Official header, incident chronology, ThreatLink correlation details, evidence SHA-256 checksums, and strict verification chain of custody.
4. **Sanitized CSV Export**:
   - Download CSV export; inspect CSV injection protection (formula prefixes `'='`, `'+'`, `'-'`, `'@'` are safely escaped).

### Act 6: Safety Check-Ins (Dual-Channel WhatsApp & Transactional Email)
1. **Navigate back to Safety Check-In**:
2. **Review Trusted Contacts**:
   - Point out contact `Pooja (Sister)`. Notice the explicit **Consented** badge and timestamp.
   - Explain: Contacts cannot be contacted without recorded consent.
3. **Channel 1 — WhatsApp / SMS Manual Handoff**:
   - Click **New Check-In** -> **WhatsApp / SMS Handoff**.
   - Select `Pooja (Sister)`.
   - Optionally toggle "Share Approximate Location".
   - Click **Prepare & Open**.
   - Notice the system does NOT claim the message was sent; it opens `wa.me` intent and sets status to `Opened in app (delivery unconfirmed)`.
4. **Channel 2 — Transactional Email Check-In**:
   - Click **New Check-In** -> **Automated Email Check-In**.
   - Choose **My Registered Email** (verified) or **Consented Trusted Contact**.
   - Enter message: *"Leaving office now, will reach home in 30 minutes."*
   - Click **Send Automated Email**.
   - Notice the status badge: **Email: Accepted by Provider (Unconfirmed Read)**.
   - Highlight the honest delivery disclaimer: acceptance by relay provider acknowledges receipt in queue, never proving the recipient has opened the email.
5. **Duplicate / Rate Limit Safeguard**:
   - Try to send another automated email check-in immediately.
   - Observe immediate rejection: *"Please wait at least 60 seconds before sending another check-in."*

### Act 7: Activity Log & User Privacy Transparency
1. **Navigate to `/activity`**:
   - Review the complete chronological timeline of actions performed in this session (`AUTH_LOGIN_SUCCESS`, `INCIDENT_CREATED`, `CHECKIN_CREATED`, `CASE_CREATED`).
2. **Security & Redaction Invariant**:
   - Highlight: Zero passwords, zero encryption keys, zero message bodies, and zero GPS coordinates are logged.
   - Filter by event type (`CHECKIN_CREATED`) or date range to demonstrate auditability.

---

## 4. Configuration Dependencies & Limitations

| Feature | Local Demo / Default Behavior | External Requirement for Production |
|---------|-------------------------------|--------------------------------------|
| **Database** | Built-in in-memory MongoDB for tests; local/Atlas MongoDB for dev | MongoDB Atlas Cluster URI in `MONGODB_URI` |
| **Email Service** | `EMAIL_PROVIDER=mock` or `none` (safe local testing, zero network calls) | `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` |
| **SMS/WhatsApp** | Manual app intent URLs (`wa.me/`, `sms:`) | Optional future direct SMS gateway (Twilio, Gupshup) |
| **AI Threat Analysis** | Deterministic local rule-based safety classifier | Optional future LLM provider API key |
| **Map Tiles** | Free OpenStreetMap tiles via Leaflet | None (works out of the box) |
| **PDF Generation** | Pure server-side `pdfkit` | None (works out of the box) |
