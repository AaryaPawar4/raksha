import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { Express } from 'express';

let mongod: MongoMemoryServer;
let app: Express;

const TEST_USER_A = 'test-user-alice';
const TEST_USER_B = 'test-user-bob';

const validIncidentPayload = {
  title: 'Repeated harassment via Instagram messages',
  incidentType: 'HARASSMENT',
  description: 'Received threatening messages over 3 days from an unknown account.',
  occurredAt: '2026-10-20T08:00:00.000Z',
  platform: 'INSTAGRAM',
  identifiers: [{ type: 'USERNAME', value: '@threat_actor_123' }],
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await connectDatabase(uri);
  app = createApp();
});

afterAll(async () => {
  await disconnectDatabase();
  await mongod.stop();
});

beforeEach(async () => {
  // Clean incident collection between tests
  if (mongoose.connection.db) {
    await mongoose.connection.db.collection('incidents').deleteMany({});
  }
});

describe('POST /api/v1/incidents', () => {
  it('creates an incident successfully for authenticated user', async () => {
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', TEST_USER_A)
      .send(validIncidentPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      title: validIncidentPayload.title,
      incidentType: 'HARASSMENT',
      platform: 'INSTAGRAM',
      status: 'OPEN',
      ownerId: TEST_USER_A,
    });
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.createdAt).toBeDefined();
  });

  it('returns 400 when title is missing', async () => {
    const { title: _t, ...payloadWithoutTitle } = validIncidentPayload;
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', TEST_USER_A)
      .send(payloadWithoutTitle);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when description is too short', async () => {
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', TEST_USER_A)
      .send({ ...validIncidentPayload, description: 'Hi' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid incidentType enum', async () => {
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', TEST_USER_A)
      .send({ ...validIncidentPayload, incidentType: 'HACKING' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid occurredAt date format', async () => {
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', TEST_USER_A)
      .send({ ...validIncidentPayload, occurredAt: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for empty request body', async () => {
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', TEST_USER_A)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/incidents', () => {
  it('returns only the requesting user\'s incidents', async () => {
    // Seed 2 incidents for User A and 1 for User B
    await request(app).post('/api/v1/incidents').set('x-demo-user-id', TEST_USER_A).send(validIncidentPayload);
    await request(app).post('/api/v1/incidents').set('x-demo-user-id', TEST_USER_A).send({ ...validIncidentPayload, title: 'Second incident for A' });
    await request(app).post('/api/v1/incidents').set('x-demo-user-id', TEST_USER_B).send({ ...validIncidentPayload, title: 'Incident for B only' });

    const res = await request(app)
      .get('/api/v1/incidents')
      .set('x-demo-user-id', TEST_USER_A);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
    res.body.data.items.forEach((item: { ownerId: string }) => {
      expect(item.ownerId).toBe(TEST_USER_A);
    });
  });

  it('returns empty list when user has no incidents', async () => {
    const res = await request(app)
      .get('/api/v1/incidents')
      .set('x-demo-user-id', TEST_USER_A);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('user B cannot see user A incidents', async () => {
    await request(app).post('/api/v1/incidents').set('x-demo-user-id', TEST_USER_A).send(validIncidentPayload);

    const res = await request(app)
      .get('/api/v1/incidents')
      .set('x-demo-user-id', TEST_USER_B);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });

  it('respects pagination parameters', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/v1/incidents').set('x-demo-user-id', TEST_USER_A).send({ ...validIncidentPayload, title: `Incident ${i + 1}` });
    }

    const res = await request(app)
      .get('/api/v1/incidents?page=1&limit=2')
      .set('x-demo-user-id', TEST_USER_A);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.total).toBe(5);
    expect(res.body.data.totalPages).toBe(3);
  });

  it('filters by status', async () => {
    await request(app).post('/api/v1/incidents').set('x-demo-user-id', TEST_USER_A).send(validIncidentPayload);

    const res = await request(app)
      .get('/api/v1/incidents?status=OPEN')
      .set('x-demo-user-id', TEST_USER_A);

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].status).toBe('OPEN');
  });

  it('returns 400 for invalid query params', async () => {
    const res = await request(app)
      .get('/api/v1/incidents?page=abc')
      .set('x-demo-user-id', TEST_USER_A);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/incidents/:id', () => {
  it('retrieves a single incident owned by the requesting user', async () => {
    const createRes = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', TEST_USER_A)
      .send(validIncidentPayload);

    const incidentId = createRes.body.data.id;

    const res = await request(app)
      .get(`/api/v1/incidents/${incidentId}`)
      .set('x-demo-user-id', TEST_USER_A);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(incidentId);
    expect(res.body.data.ownerId).toBe(TEST_USER_A);
  });

  it('returns 404 for a nonexistent valid ObjectId', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .get(`/api/v1/incidents/${fakeId}`)
      .set('x-demo-user-id', TEST_USER_A);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for an invalid (malformed) ID — never leaks DB error', async () => {
    const res = await request(app)
      .get('/api/v1/incidents/not-a-valid-object-id')
      .set('x-demo-user-id', TEST_USER_A);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    // Ensure no stack trace or DB-level error message is exposed
    expect(JSON.stringify(res.body)).not.toContain('CastError');
    expect(JSON.stringify(res.body)).not.toContain('mongodb');
  });

  it('user B cannot access user A\'s incident (ownership isolation)', async () => {
    const createRes = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', TEST_USER_A)
      .send(validIncidentPayload);

    const incidentId = createRes.body.data.id;

    const res = await request(app)
      .get(`/api/v1/incidents/${incidentId}`)
      .set('x-demo-user-id', TEST_USER_B);

    expect(res.status).toBe(404);
    // Deliberately responds 404 (not 403) to avoid leaking existence
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('DELETE /api/v1/incidents/:id', () => {
  it('successfully deletes an incident owned by the caller', async () => {
    const createRes = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', TEST_USER_A)
      .send(validIncidentPayload);

    const incidentId = createRes.body.data.id;

    const delRes = await request(app)
      .delete(`/api/v1/incidents/${incidentId}`)
      .set('x-demo-user-id', TEST_USER_A);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
    expect(delRes.body.data.deleted).toBe(true);
    expect(delRes.body.data.id).toBe(incidentId);

    // Verify incident is no longer retrievable
    const getRes = await request(app)
      .get(`/api/v1/incidents/${incidentId}`)
      .set('x-demo-user-id', TEST_USER_A);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when attempting to delete a nonexistent incident', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .delete(`/api/v1/incidents/${fakeId}`)
      .set('x-demo-user-id', TEST_USER_A);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for an invalid malformed ID without leaking internal errors', async () => {
    const res = await request(app)
      .delete('/api/v1/incidents/invalid-hex-id')
      .set('x-demo-user-id', TEST_USER_A);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(JSON.stringify(res.body)).not.toContain('CastError');
  });

  it('user B cannot delete user A\'s incident (strict cross-user authorization)', async () => {
    const createRes = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', TEST_USER_A)
      .send(validIncidentPayload);

    const incidentId = createRes.body.data.id;

    // User B tries to delete User A's incident
    const delRes = await request(app)
      .delete(`/api/v1/incidents/${incidentId}`)
      .set('x-demo-user-id', TEST_USER_B);

    expect(delRes.status).toBe(404);
    expect(delRes.body.error.code).toBe('NOT_FOUND');

    // Verify incident is still intact for User A
    const getRes = await request(app)
      .get(`/api/v1/incidents/${incidentId}`)
      .set('x-demo-user-id', TEST_USER_A);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(incidentId);
  });

  it('prunes direct ThreatLink edges without breaking unrelated links, and detaches vault evidence', async () => {
    // Create 3 incidents for User A
    const inc1 = (await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', TEST_USER_A)
      .send({ ...validIncidentPayload, title: 'Incident 1' })).body.data.id;

    const inc2 = (await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', TEST_USER_A)
      .send({ ...validIncidentPayload, title: 'Incident 2' })).body.data.id;

    const inc3 = (await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', TEST_USER_A)
      .send({ ...validIncidentPayload, title: 'Incident 3' })).body.data.id;

    // Create a ThreatLink between 1 and 2, and another between 2 and 3
    if (mongoose.connection.db) {
      await mongoose.connection.db.collection('threatlinks').insertMany([
        {
          ownerId: TEST_USER_A,
          incidentAId: inc1,
          incidentBId: inc2,
          canonicalPair: `${inc1}:${inc2}`,
          matchType: 'EXACT_IDENTIFIER',
          matchedIdentifierType: 'USERNAME',
          matchedValueMasked: '@threat_actor_***',
          strength: 'HIGH',
          explanation: 'Shared handle',
          warning: 'Warning',
          userDisposition: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          ownerId: TEST_USER_A,
          incidentAId: inc2,
          incidentBId: inc3,
          canonicalPair: `${inc2}:${inc3}`,
          matchType: 'EXACT_IDENTIFIER',
          matchedIdentifierType: 'USERNAME',
          matchedValueMasked: '@threat_actor_***',
          strength: 'HIGH',
          explanation: 'Shared handle',
          warning: 'Warning',
          userDisposition: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Insert an evidence item attached to inc1
      await mongoose.connection.db.collection('evidences').insertOne({
        ownerId: TEST_USER_A,
        incidentId: inc1,
        filename: 'screenshot.png',
        mimeType: 'image/png',
        size: 1024,
        sha256: 'a'.repeat(64),
        ciphertextBase64: 'fake-cipher',
        encryptionMetadata: {
          algorithm: 'AES-GCM',
          keyDerivation: 'PBKDF2',
          pbkdf2Iterations: 100000,
          ivHex: 'b'.repeat(24),
          saltHex: 'c'.repeat(32),
          version: '1.0',
        },
        serverReceivedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Delete Incident 1
    const delRes = await request(app)
      .delete(`/api/v1/incidents/${inc1}`)
      .set('x-demo-user-id', TEST_USER_A);

    expect(delRes.status).toBe(200);
    expect(delRes.body.data.deleted).toBe(true);
    expect(delRes.body.data.removedLinksCount).toBe(1);
    expect(delRes.body.data.retainedEvidenceCount).toBe(1);

    // Verify ThreatLink between 1 and 2 is gone, but link between 2 and 3 remains!
    if (mongoose.connection.db) {
      const remainingLinks = await mongoose.connection.db
        .collection('threatlinks')
        .find({ ownerId: TEST_USER_A })
        .toArray();
      expect(remainingLinks.length).toBe(1);
      expect(remainingLinks[0].incidentAId).toBe(inc2);
      expect(remainingLinks[0].incidentBId).toBe(inc3);

      // Verify evidence item is retained and unlinked, NOT deleted!
      const evidence = await mongoose.connection.db
        .collection('evidences')
        .findOne({ ownerId: TEST_USER_A });
      expect(evidence).not.toBeNull();
      expect(evidence?.incidentId).toBe('unlinked');
      expect(evidence?.filename).toBe('screenshot.png');
    }
  });
});
