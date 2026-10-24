import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { Express } from 'express';

let mongod: MongoMemoryServer;
let app: Express;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDatabase(mongod.getUri());
  app = createApp();
});

afterAll(async () => {
  await disconnectDatabase();
  await mongod.stop();
});

describe('Phase 7 — End-to-End Integration Journey (RS-015D)', () => {
  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;

  let incidentA1Id: string;
  let incidentA2Id: string;
  let evidenceId: string;
  let caseId: string;
  let contactId: string;
  let checkInId: string;

  // 1. Register test users
  it('Step 1: Authenticate two distinct users with genuine JWT credentials', async () => {
    const regResA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'userA.journey@example.com',
        password: 'Password123!',
        name: 'User Alpha',
      });
    expect(regResA.status).toBe(201);
    expect(regResA.body.success).toBe(true);
    userAToken = regResA.body.data.accessToken;
    userAId = regResA.body.data.user.id;

    const regResB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'userB.journey@example.com',
        password: 'Password123!',
        name: 'User Beta',
      });
    expect(regResB.status).toBe(201);
    expect(regResB.body.success).toBe(true);
    userBToken = regResB.body.data.accessToken;
    userBId = regResB.body.data.user.id;

    expect(userAId).not.toBe(userBId);
  });

  // 2. Create and retrieve incidents
  it('Step 2: User A creates two related incidents with shared identifiers', async () => {
    const inc1 = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Harassment on Instagram',
        incidentType: 'HARASSMENT',
        description: 'Perpetrator sent threatening direct messages repeatedly.',
        platform: 'INSTAGRAM',
        identifiers: [
          { type: 'USERNAME', value: 'stalker_99' },
          { type: 'PHONE', value: '+919876543210' },
        ],
      });
    expect(inc1.status).toBe(201);
    incidentA1Id = inc1.body.data.id;
    expect(inc1.body.data.ownerId).toBe(userAId);

    const inc2 = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'WhatsApp Blackmail Threat',
        incidentType: 'BLACKMAIL',
        description: 'Perpetrator threatened exposure unless money is sent.',
        platform: 'WHATSAPP',
        identifiers: [
          { type: 'PHONE', value: '+919876543210' }, // Shared identifier!
        ],
      });
    expect(inc2.status).toBe(201);
    incidentA2Id = inc2.body.data.id;
  });

  // 3. ThreatLink Correlation
  it('Step 3: Run ThreatLink correlation across own incidents with exact match', async () => {
    const linksRes = await request(app)
      .get(`/api/v1/incidents/${incidentA1Id}/links`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(linksRes.status).toBe(200);
    expect(linksRes.body.success).toBe(true);
    expect(linksRes.body.data.length).toBeGreaterThan(0);
    const link = linksRes.body.data[0];
    expect(link.relatedIncidentId).toBe(incidentA2Id);
    expect(link.matchType).toBe('EXACT_IDENTIFIER');
    expect(link.explanation).toContain('match');
  });

  // 4. Safety Indicators & Playbook
  it('Step 4: Retrieve deterministic safety indicators and actionable playbook', async () => {
    const analysisRes = await request(app)
      .post(`/api/v1/incidents/${incidentA2Id}/analyze`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ consentToAiProcessing: false });

    expect(analysisRes.status).toBe(200);
    expect(analysisRes.body.success).toBe(true);
    expect(analysisRes.body.data.ruleIndicators).toBeDefined();
    expect(analysisRes.body.data.playbook).toBeDefined();
    expect(analysisRes.body.data.playbook.immediateSafetySteps.length).toBeGreaterThan(0);
  });

  // 5. Evidence Vault Zero-Knowledge Preservation
  it('Step 5: Store encrypted evidence with SHA-256 integrity hash', async () => {
    const uploadRes = await request(app)
      .post('/api/v1/vault/items')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        incidentId: incidentA2Id,
        filename: 'threat_screenshot.png',
        mimeType: 'image/png',
        size: 51200,
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        ciphertextBase64: 'ZW5jcnlwdGVkYmxvYnRlc3Q=',
        encryptionMetadata: {
          algorithm: 'AES-GCM',
          keyDerivation: 'PBKDF2',
          pbkdf2Iterations: 600000,
          ivHex: 'abcdef0123456789abcdef01',
          saltHex: '0123456789abcdef0123456789abcdef',
          version: '1.0',
        },
      });

    expect(uploadRes.status).toBe(201);
    evidenceId = uploadRes.body.data.id;
    expect(uploadRes.body.data.ownerId).toBe(userAId);

    // Verify hash
    const verifyRes = await request(app)
      .post(`/api/v1/vault/items/${evidenceId}/verify`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.integrityStatus).toBe('VERIFIED');
  });

  // 6. Complaint Draft & Case Tracking
  it('Step 6: Generate structured complaint draft and register tracked case', async () => {
    const draftRes = await request(app)
      .get(`/api/v1/incidents/${incidentA2Id}/report-draft`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(draftRes.status).toBe(200);
    expect(draftRes.body.data.fullDraftText).toContain('COMPLAINT STATEMENT');
    expect(draftRes.body.data.evidenceItems.length).toBe(1);

    const caseRes = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        incidentId: incidentA2Id,
        reportingChannel: 'NATIONAL_CYBER_CRIME_PORTAL',
        referenceNumber: 'CR/2026/89410',
        notes: 'Submitted online via cybercrime.gov.in',
      });

    expect(caseRes.status).toBe(201);
    caseId = caseRes.body.data.id;
    expect(caseRes.body.data.ownerId).toBe(userAId);
  });

  // 7. Trusted Contact & Consent Enforcement
  it('Step 7: Manage trusted contact with explicit consent verification', async () => {
    const contactRes = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Pooja Sister',
        phone: '+919988776655',
      });

    expect(contactRes.status).toBe(201);
    contactId = contactRes.body.data.id;
    expect(contactRes.body.data.consentStatus).toBe('PENDING');

    // Attempting check-in before consent -> 403
    const blockedCheckIn = await request(app)
      .post('/api/v1/check-ins')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        contactId,
        message: 'Trying to check in without consent',
        locationSharingEnabled: false,
      });
    expect(blockedCheckIn.status).toBe(403);

    // Grant explicit consent
    const consentRes = await request(app)
      .patch(`/api/v1/contacts/${contactId}/consent`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ consentStatus: 'CONSENTED' });
    expect(consentRes.status).toBe(200);
    expect(consentRes.body.data.consentStatus).toBe('CONSENTED');
  });

  // 8. Physical Safety Check-In Flow
  it('Step 8: Create check-in, acknowledge external app delivery, and complete', async () => {
    const checkInRes = await request(app)
      .post('/api/v1/check-ins')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        contactId,
        message: 'On my way home. Please watch my route.',
        locationSharingEnabled: true,
        latitudeSnapshot: 28.5355,
        longitudeSnapshot: 77.3910,
      });

    expect(checkInRes.status).toBe(201);
    checkInId = checkInRes.body.data.id;
    expect(checkInRes.body.data.deliveryState).toBe('PREPARED');

    // Acknowledge opened in messaging app
    const ackRes = await request(app)
      .post(`/api/v1/check-ins/${checkInId}/acknowledge-delivery`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(ackRes.status).toBe(200);
    expect(ackRes.body.data.deliveryState).toBe('OPENED_IN_APP');

    // Mark safe
    const compRes = await request(app)
      .post(`/api/v1/check-ins/${checkInId}/complete`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(compRes.status).toBe(200);
    expect(compRes.body.data.status).toBe('COMPLETED');
  });

  // 9. Cross-Tenant Isolation Enforcement
  it('Step 9: Enforce strict cross-tenant isolation: User B cannot access or mutate User A resources', async () => {
    // Attempt incident access
    const incRes = await request(app)
      .get(`/api/v1/incidents/${incidentA1Id}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(incRes.status).toBe(404);

    // Attempt vault access
    const vaultRes = await request(app)
      .get(`/api/v1/vault/items/${evidenceId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(vaultRes.status).toBe(404);

    // Attempt case access
    const caseGetRes = await request(app)
      .get(`/api/v1/cases/${caseId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(caseGetRes.status).toBe(404);

    // Attempt contact access
    const contactGetRes = await request(app)
      .get(`/api/v1/contacts/${contactId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(contactGetRes.status).toBe(404);

    // Attempt check-in access
    const checkInGetRes = await request(app)
      .get(`/api/v1/check-ins/${checkInId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(checkInGetRes.status).toBe(404);
  });

  // 10. Consistent API Envelopes & Error Handling
  it('Step 10: Verify standard envelope consistency across success and failure', async () => {
    const successRes = await request(app)
      .get('/health')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(successRes.body.success).toBe(true);
    expect(successRes.body.data).toBeDefined();

    const notFoundRes = await request(app)
      .get('/api/v1/incidents/000000000000000000000000')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.success).toBe(false);
    expect(notFoundRes.body.error.code).toBe('NOT_FOUND');
    expect(notFoundRes.body.error.message).toBeDefined();
  });
});
