import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { Express } from 'express';
import { ActivityLogModel } from '../src/models/activityLog.model';

let mongod: MongoMemoryServer;
let app: Express;

const USER_ALICE = 'alice-activity-tenant';
const USER_BOB = 'bob-activity-tenant';

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
    await mongoose.connection.db.collection('activitylogs').deleteMany({});
  }
});

describe('Phase E — Activity Log & Audit Trail Integration Tests', () => {
  it('requires authentication / tenant identity (401 when invalid token provided)', async () => {
    const res = await request(app)
      .get('/api/v1/activity')
      .set('Authorization', 'Bearer invalid.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns empty result structure for a user with no activity', async () => {
    const res = await request(app)
      .get('/api/v1/activity')
      .set('x-demo-user-id', USER_ALICE);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.totalPages).toBe(1);
  });

  it('automatically logs activity upon incident creation and case creation', async () => {
    // 1. Create an incident as Alice
    const incRes = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        title: 'Harassment on Instagram',
        incidentType: 'HARASSMENT',
        description: 'Persistent unwanted direct messages.',
        platform: 'INSTAGRAM',
      });
    expect(incRes.status).toBe(201);
    const incidentId = incRes.body.data.id;

    // 2. Create a case for Alice
    const caseRes = await request(app)
      .post('/api/v1/cases')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        incidentId,
        reportingChannel: 'National Cyber Crime Portal',
        referenceNumber: 'REF-ALICE-1001',
        status: 'REPORTED',
      });
    expect(caseRes.status).toBe(201);

    // Give fire-and-forget logging a brief moment to commit
    await new Promise((r) => setTimeout(r, 50));

    // 3. Query Alice's activity
    const activityRes = await request(app)
      .get('/api/v1/activity')
      .set('x-demo-user-id', USER_ALICE);

    expect(activityRes.status).toBe(200);
    expect(activityRes.body.data.total).toBe(2);

    const eventTypes = activityRes.body.data.items.map((i: { eventType: string }) => i.eventType);
    expect(eventTypes).toContain('INCIDENT_CREATED');
    expect(eventTypes).toContain('CASE_CREATED');

    // Verify safe label
    const caseEvent = activityRes.body.data.items.find(
      (i: { eventType: string }) => i.eventType === 'CASE_CREATED'
    );
    expect(caseEvent.resourceLabel).toBe('REF-ALICE-1001');
  });

  it('strictly enforces multi-tenant isolation (Bob cannot see Alice activity)', async () => {
    // Seed an activity directly for Alice
    await ActivityLogModel.create({
      ownerId: USER_ALICE,
      eventType: 'INCIDENT_CREATED',
      outcome: 'SUCCESS',
      resourceId: 'inc-1234',
      resourceLabel: 'Private Alice Incident',
    });

    // Seed an activity for Bob
    await ActivityLogModel.create({
      ownerId: USER_BOB,
      eventType: 'AUTH_LOGIN_SUCCESS',
      outcome: 'SUCCESS',
    });

    // Query Bob's activity
    const bobRes = await request(app)
      .get('/api/v1/activity')
      .set('x-demo-user-id', USER_BOB);

    expect(bobRes.status).toBe(200);
    expect(bobRes.body.data.total).toBe(1);
    expect(bobRes.body.data.items[0].eventType).toBe('AUTH_LOGIN_SUCCESS');
    expect(bobRes.text).not.toContain('Private Alice Incident');

    // Query Alice's activity
    const aliceRes = await request(app)
      .get('/api/v1/activity')
      .set('x-demo-user-id', USER_ALICE);

    expect(aliceRes.status).toBe(200);
    expect(aliceRes.body.data.total).toBe(1);
    expect(aliceRes.body.data.items[0].resourceLabel).toBe('Private Alice Incident');
  });

  it('filters activity by eventType correctly', async () => {
    await ActivityLogModel.create([
      { ownerId: USER_ALICE, eventType: 'INCIDENT_CREATED', outcome: 'SUCCESS' },
      { ownerId: USER_ALICE, eventType: 'VAULT_UPLOAD', outcome: 'SUCCESS' },
      { ownerId: USER_ALICE, eventType: 'CASE_CREATED', outcome: 'SUCCESS' },
    ]);

    const res = await request(app)
      .get('/api/v1/activity?eventType=VAULT_UPLOAD')
      .set('x-demo-user-id', USER_ALICE);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].eventType).toBe('VAULT_UPLOAD');
  });

  it('filters activity by outcome correctly', async () => {
    await ActivityLogModel.create([
      { ownerId: USER_ALICE, eventType: 'AUTH_LOGIN_SUCCESS', outcome: 'SUCCESS' },
      { ownerId: USER_ALICE, eventType: 'AUTH_LOGIN_FAILURE', outcome: 'FAILURE' },
    ]);

    const res = await request(app)
      .get('/api/v1/activity?outcome=FAILURE')
      .set('x-demo-user-id', USER_ALICE);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].eventType).toBe('AUTH_LOGIN_FAILURE');
  });

  it('validates invalid filter parameters gracefully with 400 VALIDATION_ERROR', async () => {
    const invalidTypeRes = await request(app)
      .get('/api/v1/activity?eventType=INVALID_TYPE')
      .set('x-demo-user-id', USER_ALICE);

    expect(invalidTypeRes.status).toBe(400);
    expect(invalidTypeRes.body.error.code).toBe('VALIDATION_ERROR');

    const invalidOutcomeRes = await request(app)
      .get('/api/v1/activity?outcome=MAYBE')
      .set('x-demo-user-id', USER_ALICE);

    expect(invalidOutcomeRes.status).toBe(400);
    expect(invalidOutcomeRes.body.error.code).toBe('VALIDATION_ERROR');

    const invalidDateRes = await request(app)
      .get('/api/v1/activity?startDate=not-a-date')
      .set('x-demo-user-id', USER_ALICE);

    expect(invalidDateRes.status).toBe(400);
    expect(invalidDateRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('supports pagination with limit and page parameters', async () => {
    // Create 5 items
    for (let i = 1; i <= 5; i++) {
      await ActivityLogModel.create({
        ownerId: USER_ALICE,
        eventType: 'CASE_UPDATED',
        outcome: 'SUCCESS',
        resourceLabel: `Update #${i}`,
      });
    }

    const page1Res = await request(app)
      .get('/api/v1/activity?limit=2&page=1')
      .set('x-demo-user-id', USER_ALICE);

    expect(page1Res.status).toBe(200);
    expect(page1Res.body.data.items.length).toBe(2);
    expect(page1Res.body.data.total).toBe(5);
    expect(page1Res.body.data.page).toBe(1);
    expect(page1Res.body.data.totalPages).toBe(3);

    const page3Res = await request(app)
      .get('/api/v1/activity?limit=2&page=3')
      .set('x-demo-user-id', USER_ALICE);

    expect(page3Res.status).toBe(200);
    expect(page3Res.body.data.items.length).toBe(1);
    expect(page3Res.body.data.page).toBe(3);
  });

  it('guarantees sensitive keys are redacted from metadata', async () => {
    const { recordActivity } = await import('../src/services/activityLog.service');

    recordActivity({
      ownerId: USER_ALICE,
      eventType: 'VAULT_UPLOAD',
      outcome: 'SUCCESS',
      resourceLabel: 'evidence.png',
      safeMetadata: {
        filename: 'evidence.png',
        mimeType: 'image/png',
        password: 'SECRET_PASSWORD',
        accessToken: 'JWT_ACCESS_TOKEN',
        ciphertextBase64: 'ENCRYPTED_DATA',
        latitudeSnapshot: 28.6139,
        longitudeSnapshot: 77.209,
      },
    });

    await new Promise((r) => setTimeout(r, 50));

    const res = await request(app)
      .get('/api/v1/activity')
      .set('x-demo-user-id', USER_ALICE);

    expect(res.status).toBe(200);
    const item = res.body.data.items[0];

    // Allowed metadata exists
    expect(item.safeMetadata.filename).toBe('evidence.png');
    expect(item.safeMetadata.mimeType).toBe('image/png');

    // Sensitive metadata is stripped entirely
    expect(item.safeMetadata.password).toBeUndefined();
    expect(item.safeMetadata.accessToken).toBeUndefined();
    expect(item.safeMetadata.ciphertextBase64).toBeUndefined();
    expect(item.safeMetadata.latitudeSnapshot).toBeUndefined();
    expect(item.safeMetadata.longitudeSnapshot).toBeUndefined();
  });
});
