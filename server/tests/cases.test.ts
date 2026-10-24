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

describe('Phase 5 — Action Center & Case Tracking Integration Tests', () => {
  let aliceIncidentId: string;
  let bobIncidentId: string;

  beforeEach(async () => {
    // Create incident for Alice
    const aliceIncRes = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        title: 'Extortion and Doxxing via WhatsApp',
        incidentType: 'BLACKMAIL',
        description: 'Perpetrator threatened to leak private photos unless I send money immediately.',
        platform: 'WHATSAPP',
        identifiers: [
          { type: 'PHONE', value: '+919876543210' },
          { type: 'USERNAME', value: 'extorter_handle' },
        ],
      });
    aliceIncidentId = aliceIncRes.body.data.id;

    // Attach evidence to Alice's incident
    await request(app)
      .post('/api/v1/vault/items')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        incidentId: aliceIncidentId,
        filename: 'whatsapp_blackmail_chat.png',
        mimeType: 'image/png',
        size: 20480,
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        ciphertextBase64: 'dGVzdGNpcGhlcnRleHQ=',
        encryptionMetadata: {
          algorithm: 'AES-GCM',
          keyDerivation: 'PBKDF2',
          pbkdf2Iterations: 600000,
          ivHex: '0123456789abcdef01234567',
          saltHex: '0123456789abcdef0123456789abcdef',
          version: '1.0',
        },
      });

    // Create incident for Bob
    const bobIncRes = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_BOB)
      .send({
        title: 'Harassment on Facebook',
        incidentType: 'HARASSMENT',
        description: 'Defamatory comments posted on public page.',
        platform: 'FACEBOOK',
      });
    bobIncidentId = bobIncRes.body.data.id;
  });

  describe('1. Report Draft Generation (GET /api/v1/incidents/:id/report-draft)', () => {
    it('generates a comprehensive structured complaint draft for the incident owner', async () => {
      const res = await request(app)
        .get(`/api/v1/incidents/${aliceIncidentId}/report-draft`)
        .set('x-demo-user-id', USER_ALICE);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const draft = res.body.data;

      expect(draft.incidentId).toBe(aliceIncidentId);
      expect(draft.title).toBe('Extortion and Doxxing via WhatsApp');
      expect(draft.incidentType).toBe('BLACKMAIL');
      expect(draft.platform).toBe('WHATSAPP');
      expect(draft.narrative).toContain('threatened to leak private photos');

      // Identifiers included
      expect(draft.identifiers).toHaveLength(2);
      expect(draft.identifiers[0].value).toBe('+919876543210');

      // Evidence digest items included with SHA-256 hashes
      expect(draft.evidenceItems).toHaveLength(1);
      expect(draft.evidenceItems[0].filename).toBe('whatsapp_blackmail_chat.png');
      expect(draft.evidenceItems[0].sha256).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      );

      // Deterministic indicators included
      expect(draft.safetyIndicators.length).toBeGreaterThan(0);
      expect(
        draft.safetyIndicators.some(
          (i: { name: string }) => i.name.includes('Threats') || i.name.includes('Blackmail')
        )
      ).toBe(true);

      // Playbook suggestions included
      expect(draft.suggestedActionItems.length).toBeGreaterThan(0);

      // Legal non-transmission disclaimer
      expect(draft.disclaimer).toContain('RakshaSphere does NOT automatically file, transmit, or submit');

      // Full draft text formatting
      expect(draft.fullDraftText).toContain('FORMAL CYBER INCIDENT COMPLAINT STATEMENT (DRAFT)');
      expect(draft.fullDraftText).toContain('whatsapp_blackmail_chat.png');
      expect(draft.fullDraftText).toContain(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      );
    });

    it('rejects cross-tenant report draft generation with 404', async () => {
      // Bob requests draft for Alice's incident
      const res = await request(app)
        .get(`/api/v1/incidents/${aliceIncidentId}/report-draft`)
        .set('x-demo-user-id', USER_BOB);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Case Tracking Management (/api/v1/cases)', () => {
    it('creates a tracked case for an incident and marks it as USER_REPORTED', async () => {
      const res = await request(app)
        .post('/api/v1/cases')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          incidentId: aliceIncidentId,
          reportingChannel: 'National Cyber Crime Reporting Portal (cybercrime.gov.in)',
          referenceNumber: 'NCCR-2026-89104',
          status: 'REPORTED',
          notes: 'Filed complaint online. Received SMS acknowledgment.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.ownerId).toBe(USER_ALICE);
      expect(res.body.data.referenceNumber).toBe('NCCR-2026-89104');
      expect(res.body.data.status).toBe('REPORTED');
      expect(res.body.data.verificationBadge).toBe('USER_REPORTED');
    });

    it('rejects creating a case for an incident owned by another tenant', async () => {
      // Bob tries to log a case for Alice's incident
      const res = await request(app)
        .post('/api/v1/cases')
        .set('x-demo-user-id', USER_BOB)
        .send({
          incidentId: aliceIncidentId,
          reportingChannel: 'Local Police Station',
          referenceNumber: 'FIR-42/26',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('lists tracked cases for the owner and isolates across tenants', async () => {
      // Alice logs case
      await request(app)
        .post('/api/v1/cases')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          incidentId: aliceIncidentId,
          reportingChannel: 'Cyber Crime Portal',
          referenceNumber: 'ALICE-CASE-1',
        });

      // Bob logs case
      await request(app)
        .post('/api/v1/cases')
        .set('x-demo-user-id', USER_BOB)
        .send({
          incidentId: bobIncidentId,
          reportingChannel: 'Meta Support',
          referenceNumber: 'BOB-CASE-1',
        });

      // Alice lists her cases
      const aliceListRes = await request(app)
        .get('/api/v1/cases')
        .set('x-demo-user-id', USER_ALICE);

      expect(aliceListRes.status).toBe(200);
      expect(aliceListRes.body.data).toHaveLength(1);
      expect(aliceListRes.body.data[0].referenceNumber).toBe('ALICE-CASE-1');

      // Bob lists his cases
      const bobListRes = await request(app)
        .get('/api/v1/cases')
        .set('x-demo-user-id', USER_BOB);

      expect(bobListRes.status).toBe(200);
      expect(bobListRes.body.data).toHaveLength(1);
      expect(bobListRes.body.data[0].referenceNumber).toBe('BOB-CASE-1');
    });

    it('updates case status and notes', async () => {
      const createRes = await request(app)
        .post('/api/v1/cases')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          incidentId: aliceIncidentId,
          reportingChannel: 'Cyber Crime Portal',
          referenceNumber: 'ALICE-CASE-2',
          status: 'REPORTED',
        });
      const caseId = createRes.body.data.id;

      // Alice updates status to UNDER_REVIEW
      const updateRes = await request(app)
        .patch(`/api/v1/cases/${caseId}`)
        .set('x-demo-user-id', USER_ALICE)
        .send({
          status: 'UNDER_REVIEW',
          notes: 'Investigating Officer contacted me via phone.',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.status).toBe('UNDER_REVIEW');
      expect(updateRes.body.data.notes).toBe('Investigating Officer contacted me via phone.');

      // Bob cannot update Alice's case
      const bobUpdateRes = await request(app)
        .patch(`/api/v1/cases/${caseId}`)
        .set('x-demo-user-id', USER_BOB)
        .send({ status: 'RESOLVED' });

      expect(bobUpdateRes.status).toBe(404);
    });

    it('deletes case for owner and blocks cross-tenant deletion', async () => {
      const createRes = await request(app)
        .post('/api/v1/cases')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          incidentId: aliceIncidentId,
          reportingChannel: 'Cyber Crime Portal',
          referenceNumber: 'ALICE-DEL-CASE',
        });
      const caseId = createRes.body.data.id;

      // Bob tries to delete Alice's case -> 404
      const bobDelRes = await request(app)
        .delete(`/api/v1/cases/${caseId}`)
        .set('x-demo-user-id', USER_BOB);
      expect(bobDelRes.status).toBe(404);

      // Alice deletes her case -> 200
      const aliceDelRes = await request(app)
        .delete(`/api/v1/cases/${caseId}`)
        .set('x-demo-user-id', USER_ALICE);
      expect(aliceDelRes.status).toBe(200);
      expect(aliceDelRes.body.data.deleted).toBe(true);

      // Subsequent fetch returns 404
      const fetchRes = await request(app)
        .get(`/api/v1/cases/${caseId}`)
        .set('x-demo-user-id', USER_ALICE);
      expect(fetchRes.status).toBe(404);
    });
  });
});
