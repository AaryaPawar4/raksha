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
    await mongoose.connection.db.collection('contacts').deleteMany({});
    await mongoose.connection.db.collection('checkins').deleteMany({});
  }
});

describe('Phase 6 — Physical Safety Check-In & Trusted Contacts', () => {
  describe('Trusted Contacts Management', () => {
    it('creates a trusted contact for Alice with PENDING consent', async () => {
      const res = await request(app)
        .post('/api/v1/contacts')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          name: 'Jane Doe',
          phone: '+919876543210',
          email: 'jane@example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Jane Doe');
      expect(res.body.data.phone).toBe('+919876543210');
      expect(res.body.data.email).toBe('jane@example.com');
      expect(res.body.data.consentStatus).toBe('PENDING');
      expect(res.body.data.consentGivenAt).toBeUndefined();
    });

    it('enforces tenant isolation: Bob cannot view or edit Alice’s contacts', async () => {
      // Alice creates contact
      const createRes = await request(app)
        .post('/api/v1/contacts')
        .set('x-demo-user-id', USER_ALICE)
        .send({ name: 'Alice Friend', phone: '+911111111111' });

      const contactId = createRes.body.data.id;

      // Bob lists contacts -> gets empty list
      const bobListRes = await request(app)
        .get('/api/v1/contacts')
        .set('x-demo-user-id', USER_BOB);
      expect(bobListRes.status).toBe(200);
      expect(bobListRes.body.data).toHaveLength(0);

      // Bob tries to get Alice's contact by ID -> 404
      const bobGetRes = await request(app)
        .get(`/api/v1/contacts/${contactId}`)
        .set('x-demo-user-id', USER_BOB);
      expect(bobGetRes.status).toBe(404);

      // Bob tries to update Alice's contact -> 404
      const bobPatchRes = await request(app)
        .patch(`/api/v1/contacts/${contactId}`)
        .set('x-demo-user-id', USER_BOB)
        .send({ name: 'Hacked Name' });
      expect(bobPatchRes.status).toBe(404);

      // Bob tries to delete Alice's contact -> 404
      const bobDeleteRes = await request(app)
        .delete(`/api/v1/contacts/${contactId}`)
        .set('x-demo-user-id', USER_BOB);
      expect(bobDeleteRes.status).toBe(404);
    });

    it('updates consent status: CONSENTED sets timestamp, DECLINED clears it', async () => {
      const createRes = await request(app)
        .post('/api/v1/contacts')
        .set('x-demo-user-id', USER_ALICE)
        .send({ name: 'Sister', phone: '+919999988888' });
      const contactId = createRes.body.data.id;

      // Mark as CONSENTED
      const consentRes = await request(app)
        .patch(`/api/v1/contacts/${contactId}/consent`)
        .set('x-demo-user-id', USER_ALICE)
        .send({ consentStatus: 'CONSENTED' });

      expect(consentRes.status).toBe(200);
      expect(consentRes.body.data.consentStatus).toBe('CONSENTED');
      expect(consentRes.body.data.consentGivenAt).toBeDefined();

      // Revoke consent / set DECLINED
      const declineRes = await request(app)
        .patch(`/api/v1/contacts/${contactId}/consent`)
        .set('x-demo-user-id', USER_ALICE)
        .send({ consentStatus: 'DECLINED' });

      expect(declineRes.status).toBe(200);
      expect(declineRes.body.data.consentStatus).toBe('DECLINED');
      expect(declineRes.body.data.consentGivenAt).toBeUndefined();
    });

    it('rejects contact creation without name or with invalid email', async () => {
      const invalidRes1 = await request(app)
        .post('/api/v1/contacts')
        .set('x-demo-user-id', USER_ALICE)
        .send({ name: '', phone: '+919876543210' });
      expect(invalidRes1.status).toBe(400);

      const invalidRes2 = await request(app)
        .post('/api/v1/contacts')
        .set('x-demo-user-id', USER_ALICE)
        .send({ name: 'Test', email: 'not-an-email' });
      expect(invalidRes2.status).toBe(400);
    });
  });

  describe('Check-In Flow & Location Privacy', () => {
    let aliceContactId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/contacts')
        .set('x-demo-user-id', USER_ALICE)
        .send({ name: 'Trusted Sister', phone: '+919876543210' });
      aliceContactId = res.body.data.id;
    });

    it('strictly forbids creating check-in if contact consent is PENDING or DECLINED', async () => {
      // 1. Initial state is PENDING -> rejected with 403
      const pendingRes = await request(app)
        .post('/api/v1/check-ins')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          contactId: aliceContactId,
          message: 'Trying to message unconsented contact',
          locationSharingEnabled: false,
        });
      expect(pendingRes.status).toBe(403);
      expect(pendingRes.body.error.code).toBe('FORBIDDEN');
      expect(pendingRes.body.error.message).toContain('has not consented');

      // 2. Mark as DECLINED -> rejected with 403
      await request(app)
        .patch(`/api/v1/contacts/${aliceContactId}/consent`)
        .set('x-demo-user-id', USER_ALICE)
        .send({ consentStatus: 'DECLINED' });

      const declinedRes = await request(app)
        .post('/api/v1/check-ins')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          contactId: aliceContactId,
          message: 'Trying to message declined contact',
          locationSharingEnabled: false,
        });
      expect(declinedRes.status).toBe(403);
      expect(declinedRes.body.error.code).toBe('FORBIDDEN');
    });

    describe('With Consented Contact', () => {
      beforeEach(async () => {
        await request(app)
          .patch(`/api/v1/contacts/${aliceContactId}/consent`)
          .set('x-demo-user-id', USER_ALICE)
          .send({ consentStatus: 'CONSENTED' });
      });

      it('creates check-in with locationSharingEnabled=false and never stores coordinates', async () => {
        const res = await request(app)
          .post('/api/v1/check-ins')
          .set('x-demo-user-id', USER_ALICE)
          .send({
            contactId: aliceContactId,
            message: 'Heading home from the library.',
            locationSharingEnabled: false,
            latitudeSnapshot: 28.6139, // should be stripped because locationSharingEnabled is false
            longitudeSnapshot: 77.2090,
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.locationSharingEnabled).toBe(false);
        expect(res.body.data.latitudeSnapshot).toBeUndefined();
        expect(res.body.data.longitudeSnapshot).toBeUndefined();
        expect(res.body.data.deliveryState).toBe('PREPARED');
        expect(res.body.data.deliveryDisclaimer).toContain('opened in an external app');
        expect(res.body.data.deliveryDisclaimer).toContain('Delivery is not confirmed');
      });

    it('requires coordinates if locationSharingEnabled=true', async () => {
      const res = await request(app)
        .post('/api/v1/check-ins')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          contactId: aliceContactId,
          message: 'Heading home now.',
          locationSharingEnabled: true,
          // coordinates missing!
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('required when locationSharingEnabled is true');
    });

    it('stores snapshot coordinates when locationSharingEnabled=true and coordinates provided', async () => {
      const res = await request(app)
        .post('/api/v1/check-ins')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          contactId: aliceContactId,
          message: 'Heading home now with location.',
          locationSharingEnabled: true,
          latitudeSnapshot: 28.6139,
          longitudeSnapshot: 77.2090,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.locationSharingEnabled).toBe(true);
      expect(res.body.data.latitudeSnapshot).toBe(28.6139);
      expect(res.body.data.longitudeSnapshot).toBe(77.2090);
    });

    it('rejects check-in referencing a contact owned by another user', async () => {
      const bobRes = await request(app)
        .post('/api/v1/check-ins')
        .set('x-demo-user-id', USER_BOB)
        .send({
          contactId: aliceContactId,
          message: 'Hello Bob',
          locationSharingEnabled: false,
        });

      expect(bobRes.status).toBe(404);
    });

    it('completes check-in and updates status to COMPLETED', async () => {
      const createRes = await request(app)
        .post('/api/v1/check-ins')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          contactId: aliceContactId,
          message: 'Checking in',
          locationSharingEnabled: false,
        });
      const checkInId = createRes.body.data.id;

      const completeRes = await request(app)
        .post(`/api/v1/check-ins/${checkInId}/complete`)
        .set('x-demo-user-id', USER_ALICE);

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.status).toBe('COMPLETED');
      expect(completeRes.body.data.completedAt).toBeDefined();
    });

    it('cancels check-in and updates status to CANCELLED', async () => {
      const createRes = await request(app)
        .post('/api/v1/check-ins')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          contactId: aliceContactId,
          message: 'Checking in',
          locationSharingEnabled: false,
        });
      const checkInId = createRes.body.data.id;

      const cancelRes = await request(app)
        .post(`/api/v1/check-ins/${checkInId}/cancel`)
        .set('x-demo-user-id', USER_ALICE);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('CANCELLED');
      expect(cancelRes.body.data.cancelledAt).toBeDefined();
    });

    it('acknowledges external app opening and updates deliveryState to OPENED_IN_APP', async () => {
      const createRes = await request(app)
        .post('/api/v1/check-ins')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          contactId: aliceContactId,
          message: 'Opening WhatsApp',
          locationSharingEnabled: false,
        });
      const checkInId = createRes.body.data.id;

      const ackRes = await request(app)
        .post(`/api/v1/check-ins/${checkInId}/acknowledge-delivery`)
        .set('x-demo-user-id', USER_ALICE);

      expect(ackRes.status).toBe(200);
      expect(ackRes.body.data.deliveryState).toBe('OPENED_IN_APP');
    });

    it('enforces tenant isolation: Bob cannot access or update Alice’s check-in', async () => {
      const createRes = await request(app)
        .post('/api/v1/check-ins')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          contactId: aliceContactId,
          message: 'Alice private checkin',
          locationSharingEnabled: false,
        });
      const checkInId = createRes.body.data.id;

      // Bob tries to get check-in
      const getRes = await request(app)
        .get(`/api/v1/check-ins/${checkInId}`)
        .set('x-demo-user-id', USER_BOB);
      expect(getRes.status).toBe(404);

      // Bob tries to complete check-in
      const compRes = await request(app)
        .post(`/api/v1/check-ins/${checkInId}/complete`)
        .set('x-demo-user-id', USER_BOB);
      expect(compRes.status).toBe(404);

      // Bob tries to cancel check-in
      const cancRes = await request(app)
        .post(`/api/v1/check-ins/${checkInId}/cancel`)
        .set('x-demo-user-id', USER_BOB);
      expect(cancRes.status).toBe(404);
    });

    it('rejects coordinates out of bounds', async () => {
      const invalidLat = await request(app)
        .post('/api/v1/check-ins')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          contactId: aliceContactId,
          message: 'Test message',
          locationSharingEnabled: true,
          latitudeSnapshot: 95, // invalid > 90
          longitudeSnapshot: 77.2,
        });
      expect(invalidLat.status).toBe(400);

      const invalidLon = await request(app)
        .post('/api/v1/check-ins')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          contactId: aliceContactId,
          message: 'Test message',
          locationSharingEnabled: true,
          latitudeSnapshot: 28.6,
          longitudeSnapshot: 190, // invalid > 180
        });
      expect(invalidLon.status).toBe(400);
    });
  });
});
});
