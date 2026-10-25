import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { Express } from 'express';
import { UserModel } from '../src/models/user.model';
import { ContactModel } from '../src/models/contact.model';
import { ActivityLogModel } from '../src/models/activityLog.model';
import { EmailService } from '../src/services/email.service';
import nodemailer from 'nodemailer';

let mongod: MongoMemoryServer;
let app: Express;

const USER_ALICE = '507f1f77bcf86cd799439011';
const USER_BOB = '507f1f77bcf86cd799439022';

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDatabase(mongod.getUri());
  app = createApp();

  // Configure mock email transporter
  EmailService.setMockTransporter(
    nodemailer.createTransport({
      jsonTransport: true,
    })
  );
});

afterAll(async () => {
  EmailService.setMockTransporter(null);
  await disconnectDatabase();
  await mongod.stop();
});

beforeEach(async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.db.collection('users').deleteMany({});
    await mongoose.connection.db.collection('contacts').deleteMany({});
    await mongoose.connection.db.collection('checkins').deleteMany({});
    await mongoose.connection.db.collection('activitylogs').deleteMany({});
  }
});

describe('Phase F — Consent-based Email Check-In and Verification', () => {
  describe('Email Provider Status & Verification Flow', () => {
    it('returns email provider configuration status', async () => {
      const res = await request(app)
        .get('/api/v1/check-ins/email/status')
        .set('x-demo-user-id', USER_ALICE);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.isConfigured).toBe('boolean');
      expect(typeof res.body.data.providerName).toBe('string');
      expect(typeof res.body.data.fromAddress).toBe('string');
    });

    it('requests email verification and confirms verification token', async () => {
      // Seed user with unverified email
      await UserModel.create({
        _id: new mongoose.Types.ObjectId(USER_ALICE),
        email: 'alice@example.com',
        name: 'Alice User',
        passwordHash: 'dummyhash',
        isEmailVerified: false,
      });

      const reqRes = await request(app)
        .post('/api/v1/auth/verify-email/request')
        .set('x-demo-user-id', USER_ALICE);

      expect(reqRes.status).toBe(200);
      expect(reqRes.body.success).toBe(true);
      expect(reqRes.body.data.message).toContain('token generated');

      const verificationToken = reqRes.body.data.token;
      expect(verificationToken).toBeDefined();

      // Confirm with invalid token
      const invalidRes = await request(app)
        .post('/api/v1/auth/verify-email/confirm')
        .set('x-demo-user-id', USER_ALICE)
        .send({ token: 'wrong-token' });

      expect(invalidRes.status).toBe(400);

      // Confirm with correct token
      const confirmRes = await request(app)
        .post('/api/v1/auth/verify-email/confirm')
        .set('x-demo-user-id', USER_ALICE)
        .send({ token: verificationToken });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.success).toBe(true);
      expect(confirmRes.body.data.user.isEmailVerified).toBe(true);

      // Verify in DB
      const user = await UserModel.findById(USER_ALICE);
      expect(user?.isEmailVerified).toBe(true);
      expect(user?.emailVerificationTokenHash).toBeUndefined();
    });
  });

  describe('Sending Email Check-In to SELF', () => {
    it('rejects sending email check-in to SELF if email is unverified', async () => {
      await UserModel.create({
        _id: new mongoose.Types.ObjectId(USER_ALICE),
        email: 'unverified@example.com',
        name: 'Unverified Alice',
        passwordHash: 'dummyhash',
        isEmailVerified: false,
      });

      const res = await request(app)
        .post('/api/v1/check-ins/email')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          recipientType: 'SELF',
          message: 'Checking in with myself.',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('not verified');
    });

    it('successfully dispatches email check-in to SELF when email is verified', async () => {
      await UserModel.create({
        _id: new mongoose.Types.ObjectId(USER_ALICE),
        email: 'alice.verified@example.com',
        name: 'Verified Alice',
        passwordHash: 'dummyhash',
        isEmailVerified: true,
      });

      const res = await request(app)
        .post('/api/v1/check-ins/email')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          recipientType: 'SELF',
          message: 'I have arrived safely at the train station.',
          clientNonce: 'nonce-alice-1',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.channel).toBe('AUTOMATED_EMAIL');
      expect(res.body.data.emailDeliveryStatus).toBe('ACCEPTED_BY_PROVIDER');
      expect(res.body.data.recipientEmail).toBe('alice.verified@example.com');
      expect(res.body.data.deliveryDisclaimer).toContain('Provider acceptance acknowledges queue receipt');

      // Verify activity log entry without sensitive message leak
      const logs = await ActivityLogModel.find({ ownerId: USER_ALICE }).exec();
      expect(logs.length).toBeGreaterThan(0);
      const emailLog = logs.find((l) => l.eventType === 'CHECKIN_CREATED');
      expect(emailLog).toBeDefined();
      expect(emailLog?.outcome).toBe('SUCCESS');
      // Ensure no raw message in activity metadata
      expect(emailLog?.safeMetadata?.message).toBeUndefined();
    });

    it('rejects duplicate check-in with the same clientNonce', async () => {
      await UserModel.create({
        _id: new mongoose.Types.ObjectId(USER_ALICE),
        email: 'alice.verified@example.com',
        name: 'Verified Alice',
        passwordHash: 'dummyhash',
        isEmailVerified: true,
      });

      const first = await request(app)
        .post('/api/v1/check-ins/email')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          recipientType: 'SELF',
          message: 'Nonce test checkin',
          clientNonce: 'repeat-nonce-123',
        });
      expect(first.status).toBe(201);

      const second = await request(app)
        .post('/api/v1/check-ins/email')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          recipientType: 'SELF',
          message: 'Nonce test checkin',
          clientNonce: 'repeat-nonce-123',
        });
      expect(second.status).toBe(409);
      expect(second.body.error.message).toContain('Duplicate check-in');
    });
  });

  describe('Sending Email Check-In to TRUSTED_CONTACT', () => {
    it('rejects email check-in if contact has not consented (status PENDING or DECLINED)', async () => {
      const contact = await ContactModel.create({
        ownerId: USER_ALICE,
        name: 'Pending Contact',
        email: 'pending@example.com',
        consentStatus: 'PENDING',
      });

      const res = await request(app)
        .post('/api/v1/check-ins/email')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          recipientType: 'TRUSTED_CONTACT',
          contactId: contact._id.toString(),
          message: 'Checking in with contact.',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('has not consented');
    });

    it('rejects email check-in if consented contact lacks an email address', async () => {
      const contact = await ContactModel.create({
        ownerId: USER_ALICE,
        name: 'Phone Only Contact',
        phone: '+919999988888',
        consentStatus: 'CONSENTED',
      });

      const res = await request(app)
        .post('/api/v1/check-ins/email')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          recipientType: 'TRUSTED_CONTACT',
          contactId: contact._id.toString(),
          message: 'Checking in with contact.',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('does not have an email address configured');
    });

    it('rejects accessing another tenant contacts', async () => {
      const bobContact = await ContactModel.create({
        ownerId: USER_BOB,
        name: 'Bob Friend',
        email: 'bobfriend@example.com',
        consentStatus: 'CONSENTED',
      });

      const res = await request(app)
        .post('/api/v1/check-ins/email')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          recipientType: 'TRUSTED_CONTACT',
          contactId: bobContact._id.toString(),
          message: 'Malicious attempt across tenants.',
        });

      expect(res.status).toBe(404);
    });

    it('successfully sends email check-in to consented contact with verified recipient email', async () => {
      const contact = await ContactModel.create({
        ownerId: USER_ALICE,
        name: 'Guardian Contact',
        email: 'guardian@example.com',
        consentStatus: 'CONSENTED',
      });

      const res = await request(app)
        .post('/api/v1/check-ins/email')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          recipientType: 'TRUSTED_CONTACT',
          contactId: contact._id.toString(),
          message: 'Heading home on metro now, should reach in 25 mins.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.channel).toBe('AUTOMATED_EMAIL');
      expect(res.body.data.emailDeliveryStatus).toBe('ACCEPTED_BY_PROVIDER');
      expect(res.body.data.recipientEmail).toBe('guardian@example.com');
      expect(res.body.data.contactName).toBe('Guardian Contact');
    });
  });
});
