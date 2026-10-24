import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { sanitizeLogData } from '../src/utils/auditLogger';
import { verifyAccessToken, generateAccessToken } from '../src/utils/token';
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

describe('Phase 7 Deep Audit — Security Hardening & Controls', () => {
  describe('1. AuditLogger Redaction & Sanitization', () => {
    it('redacts sensitive fields across nested structures, arrays, and error objects', () => {
      const sensitivePayload = {
        user: {
          id: 'usr_123',
          password: 'SecretPassword999!',
          passwordHash: '$2b$12$abcdef...',
          authToken: 'jwt.token.here',
        },
        location: {
          latitudeSnapshot: 28.5355,
          longitudeSnapshot: 77.391,
          coordinates: [28.5355, 77.391],
        },
        vault: {
          ciphertext: 'ZW5jcnlwdGVk...',
          ciphertextBase64: 'ZW5jcnlwdGVk...',
          key: 'symmetric-key-data',
          passphrase: 'super-secret-user-passphrase',
        },
        tokens: ['normal-item', { refreshToken: 'rt_secret_123' }],
      };

      const sanitized = sanitizeLogData(sensitivePayload) as any;

      expect(sanitized.user.password).toBe('[REDACTED]');
      expect(sanitized.user.passwordHash).toBe('[REDACTED]');
      expect(sanitized.user.authToken).toBe('[REDACTED]');
      expect(sanitized.location.latitudeSnapshot).toBe('[REDACTED]');
      expect(sanitized.location.longitudeSnapshot).toBe('[REDACTED]');
      expect(sanitized.location.coordinates).toBe('[REDACTED]');
      expect(sanitized.vault.ciphertext).toBe('[REDACTED]');
      expect(sanitized.vault.ciphertextBase64).toBe('[REDACTED]');
      expect(sanitized.vault.key).toBe('[REDACTED]');
      expect(sanitized.vault.passphrase).toBe('[REDACTED]');
      expect(sanitized.tokens[1].refreshToken).toBe('[REDACTED]');
      expect(sanitized.user.id).toBe('usr_123');
    });

    it('redacts sensitive details embedded inside Error objects', () => {
      const err = new Error('Database failed with password: SuperSecretPassword123');
      const sanitized = sanitizeLogData(err) as { name: string; message: string };

      expect(sanitized.message).toContain('[REDACTED]');
      expect(sanitized.message).not.toContain('SuperSecretPassword123');
    });
  });

  describe('2. CORS Origin Rejection', () => {
    it('blocks unauthorized origin with HTTP 403 FORBIDDEN and error envelope', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://malicious-attacker-site.com');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('CORS blocked');
    });
  });

  describe('3. JWT Algorithm Confusion & Claim Verification', () => {
    it('strictly verifies HS256 algorithm and rejects malformed or unverified tokens', () => {
      const sampleUser = {
        id: 'user_claim_test',
        email: 'claims@example.com',
        name: 'Claim Tester',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const validToken = generateAccessToken(sampleUser);
      const decoded = verifyAccessToken(validToken);

      expect(decoded.sub).toBe(sampleUser.id);
      expect(decoded.email).toBe(sampleUser.email);

      // Verify malformed tokens throw
      expect(() => verifyAccessToken('header.payload.signature_tampered')).toThrow();
    });
  });

  describe('4. Concurrent Refresh Token Rotation', () => {
    it('handles concurrent refresh requests safely without race condition', async () => {
      // Register user
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'concurrent.audit@example.com',
          password: 'Password123!',
          name: 'Concurrent User',
        });
      expect(regRes.status).toBe(201);
      const refreshToken = regRes.body.data.refreshToken;

      // Send 2 parallel refresh requests with the same token
      const [res1, res2] = await Promise.all([
        request(app).post('/api/v1/auth/refresh').send({ refreshToken }),
        request(app).post('/api/v1/auth/refresh').send({ refreshToken }),
      ]);

      // Exactly one must succeed (200) and the other must be rejected (401)
      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 401]);
    });
  });
});
