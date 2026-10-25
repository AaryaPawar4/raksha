import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { Express } from 'express';

let mongod: MongoMemoryServer;
let app: Express;

const USER_ALICE = 'alice-tenant';
const USER_BOB = 'bob-tenant';

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDatabase(mongod.getUri());
  app = createApp();
});

afterAll(async () => {
  await disconnectDatabase();
  await mongod.stop();
});

beforeEach(async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.db.collection('incidents').deleteMany({});
    await mongoose.connection.db.collection('evidences').deleteMany({});
    await mongoose.connection.db.collection('cases').deleteMany({});
  }
});

describe('Phase D — PDF Case Dossier and CSV Export Integration Tests', () => {
  let aliceIncidentId: string;
  let aliceCaseId: string;
  let bobIncidentId: string;
  let bobCaseId: string;

  beforeEach(async () => {
    // 1. Create Alice incident
    const aliceIncRes = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        title: 'Harassment and Stalking Campaign',
        incidentType: 'STALKING',
        description: 'Persistent unwanted messages across accounts.',
        platform: 'INSTAGRAM',
        occurredAt: '2026-10-15T10:00:00.000Z',
        identifiers: [{ type: 'USERNAME', value: 'stalker_account_99' }],
      });
    aliceIncidentId = aliceIncRes.body.data.id;

    // 2. Attach evidence to Alice's incident
    await request(app)
      .post('/api/v1/vault/items')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        incidentId: aliceIncidentId,
        filename: 'threat_screenshot_dm.png',
        mimeType: 'image/png',
        size: 20480,
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        ciphertextBase64: 'ENCRYPTED_BINARY_CIPHERTEXT',
        iv: 'INIT_VECTOR_123',
        authTag: 'AUTH_TAG_456',
        clientDerivedKeyId: 'DERIVED_KEY_789',
      });

    // 3. Create Alice tracked case
    const aliceCaseRes = await request(app)
      .post('/api/v1/cases')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        incidentId: aliceIncidentId,
        reportingChannel: 'cybercrime.gov.in',
        referenceNumber: 'CC-2026-10928',
        status: 'UNDER_REVIEW',
        notes: 'Submitted online acknowledgment receipt received.',
      });
    aliceCaseId = aliceCaseRes.body.data.id;

    // 4. Create Bob incident
    const bobIncRes = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_BOB)
      .send({
        title: 'Bob Personal Scam',
        incidentType: 'FINANCIAL_SCAM',
        description: 'Fraudulent payment request via Telegram.',
        platform: 'TELEGRAM',
        occurredAt: '2026-10-20T12:00:00.000Z',
      });
    bobIncidentId = bobIncRes.body.data.id;

    // 5. Create Bob case
    const bobCaseRes = await request(app)
      .post('/api/v1/cases')
      .set('x-demo-user-id', USER_BOB)
      .send({
        incidentId: bobIncidentId,
        reportingChannel: 'National Cyber Crime Portal',
        referenceNumber: 'BOB-CASE-4432',
        status: 'REPORTED',
      });
    bobCaseId = bobCaseRes.body.data.id;
  });

  describe('PDF Case Dossier Export (POST /api/v1/cases/:id/export/pdf)', () => {
    it('generates a valid binary PDF with proper headers and magic bytes', async () => {
      const res = await request(app)
        .post(`/api/v1/cases/${aliceCaseId}/export/pdf`)
        .set('x-demo-user-id', USER_ALICE)
        .send({ includeEvidenceDigest: true, includeComplaintDraft: true });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename="RakshaSphere_Case_CC-2026-10928_.*\.pdf"/
      );

      // Verify PDF magic header bytes: %PDF-
      const pdfHeader = res.body.toString('utf-8', 0, 5);
      expect(pdfHeader).toBe('%PDF-');
    });

    it('returns 404 for a non-existent case ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toHexString();
      const res = await request(app)
        .post(`/api/v1/cases/${nonExistentId}/export/pdf`)
        .set('x-demo-user-id', USER_ALICE)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('enforces strict cross-user tenant isolation (Bob cannot export Alice case)', async () => {
      const res = await request(app)
        .post(`/api/v1/cases/${aliceCaseId}/export/pdf`)
        .set('x-demo-user-id', USER_BOB)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('requires authentication / tenant identity', async () => {
      const res = await request(app)
        .post(`/api/v1/cases/${aliceCaseId}/export/pdf`)
        .set('Authorization', 'Bearer invalid.expired.token')
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Incident CSV Export (GET /api/v1/incidents/export/csv)', () => {
    it('generates properly formatted CSV with headers and UTF-8 BOM', async () => {
      const res = await request(app)
        .get('/api/v1/incidents/export/csv')
        .set('x-demo-user-id', USER_ALICE);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename="RakshaSphere_Incidents_.*\.csv"/
      );

      const text = res.text;
      // Should start with BOM
      expect(text.charCodeAt(0)).toBe(0xfeff);

      // Verify headers
      expect(text).toContain('Incident ID');
      expect(text).toContain('Title');
      expect(text).toContain('Incident Type');
      expect(text).toContain('Platform');
      expect(text).toContain('Status');

      // Verify Alice's incident content is present
      expect(text).toContain('Harassment and Stalking Campaign');
      expect(text).toContain('STALKING');
      expect(text).toContain('INSTAGRAM');

      // Verify cross-user isolation: Bob's incident must NOT be in Alice's CSV
      expect(text).not.toContain('Bob Personal Scam');
      expect(text).not.toContain('TELEGRAM');
    });

    it('neutralizes spreadsheet formula injection (CWE-1236)', async () => {
      // Create incident with malicious formula titles
      await request(app)
        .post('/api/v1/incidents')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          title: '=cmd|\' /C calc\'!A0',
          incidentType: 'HARASSMENT',
          description: '@dangerousFunction() leading character',
          platform: 'WHATSAPP',
        });

      const res = await request(app)
        .get('/api/v1/incidents/export/csv')
        .set('x-demo-user-id', USER_ALICE);

      expect(res.status).toBe(200);
      const text = res.text;

      // The malicious '=' and '@' should be neutralized with a leading single quote and wrapped in double quotes
      expect(text).toContain('"\'=cmd|\' /C calc\'!A0"');
      expect(text).toContain('"\'@dangerousFunction() leading character"');
    });

    it('applies date filtering correctly', async () => {
      // Alice has an incident on 2026-10-15
      const matchingRes = await request(app)
        .get('/api/v1/incidents/export/csv?startDate=2026-10-14T00:00:00.000Z&endDate=2026-10-16T23:59:59.000Z')
        .set('x-demo-user-id', USER_ALICE);

      expect(matchingRes.status).toBe(200);
      expect(matchingRes.text).toContain('Harassment and Stalking Campaign');

      const nonMatchingRes = await request(app)
        .get('/api/v1/incidents/export/csv?startDate=2026-11-01T00:00:00.000Z&endDate=2026-11-30T23:59:59.000Z')
        .set('x-demo-user-id', USER_ALICE);

      expect(nonMatchingRes.status).toBe(200);
      expect(nonMatchingRes.text).not.toContain('Harassment and Stalking Campaign');
    });

    it('validates invalid date parameters gracefully', async () => {
      const res = await request(app)
        .get('/api/v1/incidents/export/csv?startDate=invalid-date')
        .set('x-demo-user-id', USER_ALICE);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Case CSV Export (GET /api/v1/cases/export/csv)', () => {
    it('exports user-scoped cases with proper headers', async () => {
      const res = await request(app)
        .get('/api/v1/cases/export/csv')
        .set('x-demo-user-id', USER_ALICE);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(res.text).toContain('Case ID');
      expect(res.text).toContain('Reference Number');
      expect(res.text).toContain('CC-2026-10928');
      expect(res.text).toContain('cybercrime.gov.in');

      // Does not contain Bob's case
      expect(res.text).not.toContain('BOB-CASE-4432');
    });

    it('filters cases by status query param', async () => {
      const res = await request(app)
        .get('/api/v1/cases/export/csv?status=UNDER_REVIEW')
        .set('x-demo-user-id', USER_ALICE);

      expect(res.status).toBe(200);
      expect(res.text).toContain('CC-2026-10928');

      const emptyRes = await request(app)
        .get('/api/v1/cases/export/csv?status=CLOSED')
        .set('x-demo-user-id', USER_ALICE);

      expect(emptyRes.status).toBe(200);
      expect(emptyRes.text).not.toContain('CC-2026-10928');
    });
  });
});
