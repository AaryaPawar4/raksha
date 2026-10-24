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
