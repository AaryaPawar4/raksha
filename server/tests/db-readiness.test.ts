import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
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

describe('Phase 7 — MongoDB Atlas Resilience & Health Checks (RS-015C)', () => {
  it('GET /health returns liveness status ok (Phase 0 contract preserved)', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.service).toBe('rakshasphere-api');
  });

  it('GET /health/ready returns readiness diagnostics with database connected', async () => {
    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ready');
    expect(res.body.data.database.connected).toBe(true);
    expect(res.body.data.database.status).toBe('connected');
    expect(typeof res.body.data.database.pingLatencyMs).toBe('number');
  });

  it('GET /health/ready reports 503 not_ready when MongoDB is disconnected', async () => {
    // Temporarily disconnect
    await disconnectDatabase();

    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.details.status).toBe('not_ready');
    expect(res.body.error.details.database.connected).toBe(false);

    // Reconnect for remaining tests
    await connectDatabase(mongod.getUri());
  });
});
