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
    await mongoose.connection.db.collection('threatlinks').deleteMany({});
  }
});

describe('Phase 2 — ThreatLink Correlation Integration Tests', () => {
  it('correlates two incidents belonging to the same user sharing an exact normalized username', async () => {
    // 1. Alice creates Incident 1 with @stalker_01
    const inc1Res = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        title: 'Harassment via IG',
        incidentType: 'HARASSMENT',
        description: 'Received violent DMs',
        platform: 'INSTAGRAM',
        identifiers: [{ type: 'USERNAME', value: '@Stalker_01' }],
      });
    const inc1Id = inc1Res.body.data.id;

    // 2. Alice creates Incident 2 with stalker_01 (different casing, no @)
    const inc2Res = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        title: 'Harassment via Twitter',
        incidentType: 'STALKING',
        description: 'Same person tweeting threatening content',
        platform: 'TWITTER_X',
        identifiers: [{ type: 'USERNAME', value: 'stalker_01' }],
      });
    const inc2Id = inc2Res.body.data.id;

    // 3. Query ThreatLink for Incident 1
    const linksRes = await request(app)
      .get(`/api/v1/incidents/${inc1Id}/links`)
      .set('x-demo-user-id', USER_ALICE);

    expect(linksRes.status).toBe(200);
    expect(linksRes.body.success).toBe(true);
    expect(linksRes.body.data).toHaveLength(1);

    const edge = linksRes.body.data[0];
    expect(edge.matchType).toBe('EXACT_IDENTIFIER');
    expect(edge.matchedIdentifierType).toBe('USERNAME');
    expect(edge.strength).toBe('STRONG');
    expect(edge.relatedIncidentId).toBe(inc2Id);
    expect(edge.relatedIncident.title).toBe('Harassment via Twitter');
    expect(edge.matchedValueMasked).toBe('@St******01');
    expect(edge.explanation).toContain('Exact match on USERNAME');
    expect(edge.warning).toContain('investigative lead only');
    expect(edge.userDisposition).toBe('PENDING');

    // 4. Query ThreatLink for Incident 2 (bidirectional reciprocal link)
    const linksRes2 = await request(app)
      .get(`/api/v1/incidents/${inc2Id}/links`)
      .set('x-demo-user-id', USER_ALICE);

    expect(linksRes2.status).toBe(200);
    expect(linksRes2.body.data).toHaveLength(1);
    expect(linksRes2.body.data[0].relatedIncidentId).toBe(inc1Id);
  });

  it('excludes self-matching (incident cannot link to itself)', async () => {
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        title: 'Isolated Incident',
        incidentType: 'DOXXING',
        description: 'Personal phone number leaked',
        platform: 'TELEGRAM',
        identifiers: [{ type: 'PHONE', value: '+91 98765 43210' }],
      });
    const id = res.body.data.id;

    const linksRes = await request(app)
      .get(`/api/v1/incidents/${id}/links`)
      .set('x-demo-user-id', USER_ALICE);

    expect(linksRes.status).toBe(200);
    expect(linksRes.body.data).toHaveLength(0);
  });

  it('strictly isolates users: identical identifier across different users NEVER links', async () => {
    // Alice has an incident with a phone number
    const aliceRes = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        title: "Alice's scam call",
        incidentType: 'FINANCIAL_SCAM',
        description: 'Call from scam center',
        platform: 'SMS',
        identifiers: [{ type: 'PHONE', value: '+919876543210' }],
      });
    const aliceId = aliceRes.body.data.id;

    // Bob has an incident with the EXACT SAME phone number
    await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_BOB)
      .send({
        title: "Bob's scam call",
        incidentType: 'FINANCIAL_SCAM',
        description: 'Same scam center contacted Bob',
        platform: 'SMS',
        identifiers: [{ type: 'PHONE', value: '+91 98765 43210' }],
      });

    // Alice checks her ThreatLink — MUST BE EMPTY (tenant isolation!)
    const aliceLinksRes = await request(app)
      .get(`/api/v1/incidents/${aliceId}/links`)
      .set('x-demo-user-id', USER_ALICE);

    expect(aliceLinksRes.status).toBe(200);
    expect(aliceLinksRes.body.data).toHaveLength(0);

    // Bob cannot query Alice's incident's links
    const crossQueryRes = await request(app)
      .get(`/api/v1/incidents/${aliceId}/links`)
      .set('x-demo-user-id', USER_BOB);

    expect(crossQueryRes.status).toBe(404);
  });

  it('returns empty array cleanly when incident has no identifiers', async () => {
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        title: 'Incident without identifiers',
        incidentType: 'HARASSMENT',
        description: 'Vague harassment without handles',
        platform: 'OTHER',
      });

    const linksRes = await request(app)
      .get(`/api/v1/incidents/${res.body.data.id}/links`)
      .set('x-demo-user-id', USER_ALICE);

    expect(linksRes.status).toBe(200);
    expect(linksRes.body.data).toEqual([]);
  });

  it('updates and persists user disposition feedback (RELEVANT, NOT_RELATED, UNSURE)', async () => {
    // 1. Create two matching incidents
    const inc1 = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        title: 'Threat email 1',
        incidentType: 'BLACKMAIL',
        description: 'Demanding payment',
        platform: 'EMAIL',
        identifiers: [{ type: 'EMAIL', value: 'extortion@darkmail.example' }],
      });

    await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        title: 'Threat email 2',
        incidentType: 'BLACKMAIL',
        description: 'Follow-up extortion email',
        platform: 'EMAIL',
        identifiers: [{ type: 'EMAIL', value: 'Extortion@Darkmail.Example' }],
      });

    // 2. Fetch the link
    const linksRes = await request(app)
      .get(`/api/v1/incidents/${inc1.body.data.id}/links`)
      .set('x-demo-user-id', USER_ALICE);

    expect(linksRes.body.data).toHaveLength(1);
    const linkId = linksRes.body.data[0].id;
    expect(linksRes.body.data[0].userDisposition).toBe('PENDING');

    // 3. Submit feedback: RELEVANT
    const fbRes = await request(app)
      .post(`/api/v1/threat-links/${linkId}/feedback`)
      .set('x-demo-user-id', USER_ALICE)
      .send({ disposition: 'RELEVANT' });

    expect(fbRes.status).toBe(200);
    expect(fbRes.body.success).toBe(true);
    expect(fbRes.body.data.userDisposition).toBe('RELEVANT');

    // 4. Verify persistence on subsequent retrieval
    const refetchRes = await request(app)
      .get(`/api/v1/incidents/${inc1.body.data.id}/links`)
      .set('x-demo-user-id', USER_ALICE);

    expect(refetchRes.body.data[0].userDisposition).toBe('RELEVANT');

    // 5. Change feedback to NOT_RELATED
    const dismissRes = await request(app)
      .post(`/api/v1/threat-links/${linkId}/feedback`)
      .set('x-demo-user-id', USER_ALICE)
      .send({ disposition: 'NOT_RELATED' });

    expect(dismissRes.status).toBe(200);
    expect(dismissRes.body.data.userDisposition).toBe('NOT_RELATED');
  });

  it('rejects invalid feedback values with 400 VALIDATION_ERROR', async () => {
    // Create an incident to get a link
    const inc1 = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        title: 'Inc 1',
        incidentType: 'HARASSMENT',
        description: 'desc 1',
        platform: 'INSTAGRAM',
        identifiers: [{ type: 'USERNAME', value: '@target_match' }],
      });
    await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        title: 'Inc 2',
        incidentType: 'HARASSMENT',
        description: 'desc 2',
        platform: 'INSTAGRAM',
        identifiers: [{ type: 'USERNAME', value: 'target_match' }],
      });

    const linksRes = await request(app)
      .get(`/api/v1/incidents/${inc1.body.data.id}/links`)
      .set('x-demo-user-id', USER_ALICE);

    const linkId = linksRes.body.data[0].id;

    const badFeedbackRes = await request(app)
      .post(`/api/v1/threat-links/${linkId}/feedback`)
      .set('x-demo-user-id', USER_ALICE)
      .send({ disposition: 'CONFIRMED_PERPETRATOR' }); // Invalid enum

    expect(badFeedbackRes.status).toBe(400);
    expect(badFeedbackRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('user Bob cannot submit feedback on Alice ThreatLink', async () => {
    const inc1 = await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        title: 'Inc A1',
        incidentType: 'HARASSMENT',
        description: 'desc A1',
        platform: 'INSTAGRAM',
        identifiers: [{ type: 'USERNAME', value: '@common_match' }],
      });
    await request(app)
      .post('/api/v1/incidents')
      .set('x-demo-user-id', USER_ALICE)
      .send({
        title: 'Inc A2',
        incidentType: 'HARASSMENT',
        description: 'desc A2',
        platform: 'INSTAGRAM',
        identifiers: [{ type: 'USERNAME', value: 'common_match' }],
      });

    const linksRes = await request(app)
      .get(`/api/v1/incidents/${inc1.body.data.id}/links`)
      .set('x-demo-user-id', USER_ALICE);

    const linkId = linksRes.body.data[0].id;

    // Bob tries to update Alice's link
    const bobFeedbackRes = await request(app)
      .post(`/api/v1/threat-links/${linkId}/feedback`)
      .set('x-demo-user-id', USER_BOB)
      .send({ disposition: 'RELEVANT' });

    expect(bobFeedbackRes.status).toBe(404);
    expect(bobFeedbackRes.body.error.code).toBe('NOT_FOUND');
  });
});
