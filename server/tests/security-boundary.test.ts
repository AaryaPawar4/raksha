import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { env } from '../src/config/env';

describe('Phase 1 Verification Gate — Security Boundary & Resilience', () => {
  let mongod: MongoMemoryServer;
  let app = createApp();

  const ALICE_ID = 'user-alice-verified';
  const BOB_ID = 'user-bob-attacker';

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await connectDatabase(mongod.getUri());
  });

  afterAll(async () => {
    await disconnectDatabase();
    await mongod.stop();
  });

  describe('1. Security Boundary & Identity Spoofing Protection', () => {
    it('ignores client-supplied body ownerId/userId and enforces authenticated identity', async () => {
      const spoofAttempt = {
        title: 'Incident spoof attempt',
        incidentType: 'HARASSMENT',
        description: 'Attempting to inject a different ownerId in body',
        platform: 'TWITTER_X',
        ownerId: BOB_ID, // Malicious attempt to assign incident to Bob
        userId: BOB_ID,  // Malicious attempt to assign incident to Bob
      };

      const res = await request(app)
        .post('/api/v1/incidents')
        .set('x-demo-user-id', ALICE_ID)
        .send(spoofAttempt);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Owner MUST be Alice (derived from auth header), NOT Bob
      expect(res.body.data.ownerId).toBe(ALICE_ID);
      expect(res.body.data.ownerId).not.toBe(BOB_ID);
    });

    it('rejects all requests with 401 in production mode regardless of x-demo-user-id', async () => {
      // Temporarily simulate production environment
      const originalEnv = env.NODE_ENV;
      (env as { NODE_ENV: string }).NODE_ENV = 'production';

      try {
        const resIncidents = await request(app)
          .get('/api/v1/incidents')
          .set('x-demo-user-id', ALICE_ID);
        expect(resIncidents.status).toBe(401);
        expect(resIncidents.body.success).toBe(false);

        const resContacts = await request(app)
          .get('/api/v1/contacts')
          .set('x-demo-user-id', ALICE_ID);
        expect(resContacts.status).toBe(401);
        expect(resContacts.body.success).toBe(false);

        const resCheckins = await request(app)
          .get('/api/v1/check-ins')
          .set('x-demo-user-id', ALICE_ID);
        expect(resCheckins.status).toBe(401);
        expect(resCheckins.body.success).toBe(false);
      } finally {
        (env as { NODE_ENV: string }).NODE_ENV = originalEnv;
      }
    });

    it('caller cannot access another user incident by switching demo user ID (isolation check)', async () => {
      // 1. Alice creates an incident
      const createRes = await request(app)
        .post('/api/v1/incidents')
        .set('x-demo-user-id', ALICE_ID)
        .send({
          title: "Alice's Private Threat",
          incidentType: 'STALKING',
          description: 'Private stalking incident data',
          platform: 'WHATSAPP',
        });

      const aliceIncidentId = createRes.body.data.id;

      // 2. Bob attempts to access Alice's incident
      const bobRes = await request(app)
        .get(`/api/v1/incidents/${aliceIncidentId}`)
        .set('x-demo-user-id', BOB_ID);

      // Returns 404 to avoid leaking existence or data
      expect(bobRes.status).toBe(404);
      expect(bobRes.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('2. Identifiers Schema & Validation', () => {
    it('accepts valid identifier types (USERNAME, PHONE, EMAIL, URL, OTHER)', async () => {
      const res = await request(app)
        .post('/api/v1/incidents')
        .set('x-demo-user-id', ALICE_ID)
        .send({
          title: 'Threat with multiple identifiers',
          incidentType: 'DOXXING',
          description: 'Harasser shared various handles and links',
          platform: 'TELEGRAM',
          identifiers: [
            { type: 'USERNAME', value: '@harasser_telegram' },
            { type: 'PHONE', value: '+919876543210' },
            { type: 'EMAIL', value: 'stalker@example.com' },
            { type: 'URL', value: 'https://malicious-site.example/leak' },
            { type: 'OTHER', value: 'Telegram channel ID 998877' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.identifiers).toHaveLength(5);
      expect(res.body.data.identifiers[0].type).toBe('USERNAME');
      expect(res.body.data.identifiers[1].value).toBe('+919876543210');
    });

    it('rejects identifier with unsupported type enum', async () => {
      const res = await request(app)
        .post('/api/v1/incidents')
        .set('x-demo-user-id', ALICE_ID)
        .send({
          title: 'Threat with bad identifier type',
          incidentType: 'HARASSMENT',
          description: 'Description test',
          platform: 'SMS',
          identifiers: [{ type: 'IP_ADDRESS', value: '192.168.1.1' }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects identifier with empty or whitespace-only value', async () => {
      const res = await request(app)
        .post('/api/v1/incidents')
        .set('x-demo-user-id', ALICE_ID)
        .send({
          title: 'Threat with blank identifier value',
          incidentType: 'HARASSMENT',
          description: 'Description test',
          platform: 'SMS',
          identifiers: [{ type: 'USERNAME', value: '    ' }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects identifier with value exceeding 256 characters', async () => {
      const res = await request(app)
        .post('/api/v1/incidents')
        .set('x-demo-user-id', ALICE_ID)
        .send({
          title: 'Threat with oversized identifier',
          incidentType: 'HARASSMENT',
          description: 'Description test',
          platform: 'SMS',
          identifiers: [{ type: 'URL', value: 'https://example.com/' + 'a'.repeat(250) }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('3. Database Unavailability & Graceful Degradation', () => {
    it('returns safe 503 response when MongoDB is disconnected, without leaking internals', async () => {
      // Disconnect mongoose to test graceful failure
      await mongoose.disconnect();

      const res = await request(app)
        .get('/api/v1/incidents')
        .set('x-demo-user-id', ALICE_ID);

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      expect(res.body.error.message).toContain('Database service is currently unavailable');

      // Ensure no stack traces or MongoDB driver internals are exposed
      expect(JSON.stringify(res.body)).not.toContain('MongoNotConnectedError');
      expect(JSON.stringify(res.body)).not.toContain('TopologyDescription');

      // Reconnect so afterAll cleanly shuts down
      await connectDatabase(mongod.getUri());
    });
  });
});
