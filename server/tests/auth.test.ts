import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { env } from '../src/config/env';
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

beforeEach(async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.db.collection('users').deleteMany({});
  }
});

describe('Phase 7 — Production Authentication & Token Security (RS-015A)', () => {
  const validUser = {
    email: 'asha.safety@example.com',
    password: 'SecurePassword123!',
    name: 'Asha Verma',
  };

  describe('Registration & Password Hashing', () => {
    it('registers a new user with 201, password hash stored, and returns JWT', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validUser.email.toLowerCase());
      expect(res.body.data.user.name).toBe(validUser.name);
      expect(res.body.data.accessToken).toBeDefined();

      // Check cookie was set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('raksha_refresh_token'))).toBe(true);

      // Verify raw password is NOT in database
      const userDoc = await mongoose.connection.db
        ?.collection('users')
        .findOne({ email: validUser.email.toLowerCase() });
      expect(userDoc).toBeDefined();
      expect(userDoc?.passwordHash).not.toBe(validUser.password);
      expect(userDoc?.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });

    it('rejects duplicate registration with 409 CONFLICT', async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);
      const dupRes = await request(app).post('/api/v1/auth/register').send(validUser);

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error.code).toBe('CONFLICT');
    });

    it('rejects weak password or invalid email with 400 VALIDATION_ERROR', async () => {
      const weakRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, password: 'short' });
      expect(weakRes.status).toBe(400);

      const invalidEmailRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, email: 'not-an-email' });
      expect(invalidEmailRes.status).toBe(400);
    });
  });

  describe('Login & Token Issuance', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);
    });

    it('authenticates valid credentials and issues new JWT access token', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(validUser.email.toLowerCase());
    });

    it('rejects incorrect password with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: validUser.email,
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects non-existent email with 401 UNAUTHENTICATED (safe messaging)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nobody@example.com',
        password: validUser.password,
      });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Invalid email address or password');
    });
  });

  describe('Token Rotation & Reuse Detection', () => {
    it('rotates refresh token and detects reuse attempt, revoking session chain', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(validUser);
      const rawRefreshToken = regRes.body.data.refreshToken;
      expect(rawRefreshToken).toBeDefined();

      // Wait briefly to ensure JWT `iat` differs
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // First refresh: valid -> receives new tokens
      const refresh1 = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rawRefreshToken });

      expect(refresh1.status).toBe(200);
      expect(refresh1.body.data.accessToken).toBeDefined();
      const secondRefreshToken = refresh1.body.data.refreshToken;
      expect(secondRefreshToken).not.toBe(rawRefreshToken);

      // Replay attack: attempt to reuse the old first refresh token
      const reuseAttempt = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rawRefreshToken });

      expect(reuseAttempt.status).toBe(401);
      expect(reuseAttempt.body.error.message).toContain('reuse detected');

      // Now the second token in the compromised chain is also invalidated!
      const subsequentAttempt = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: secondRefreshToken });

      expect(subsequentAttempt.status).toBe(401);
    });
  });

  describe('JWT Verification on Protected Endpoints', () => {
    it('allows access to protected routes with valid JWT Bearer token', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(validUser);
      const token = regRes.body.data.accessToken;

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.email).toBe(validUser.email.toLowerCase());
    });

    it('rejects protected routes with expired or malformed JWT Bearer token', async () => {
      const badRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(badRes.status).toBe(401);
      expect(badRes.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects demo header in production mode even if provided', async () => {
      const origEnv = env.NODE_ENV;
      (env as { NODE_ENV: string }).NODE_ENV = 'production';

      try {
        const res = await request(app)
          .get('/api/v1/auth/me')
          .set('x-demo-user-id', 'spoofed-id');

        expect(res.status).toBe(401);
      } finally {
        (env as { NODE_ENV: string }).NODE_ENV = origEnv;
      }
    });
  });
});
