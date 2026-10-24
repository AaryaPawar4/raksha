import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { Express } from 'express';
import crypto from 'crypto';

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
    await mongoose.connection.db.collection('evidences').deleteMany({});
  }
});

// Helper simulating in-browser Web Crypto API client-side encryption
async function simulateClientSideEncryption(plaintext: string, passphrase: string) {
  const enc = new TextEncoder();
  const plaintextBytes = enc.encode(plaintext);

  // SHA-256 of plaintext
  const sha256 = crypto.createHash('sha256').update(plaintextBytes).digest('hex');

  // Random 16-byte salt and 12-byte IV
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);

  // PBKDF2 derive 256-bit AES key
  const iterations = 100000;
  const key = crypto.pbkdf2Sync(passphrase, salt, iterations, 32, 'sha256');

  // AES-256-GCM encryption
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintextBytes), cipher.final()]);
  const tag = cipher.getAuthTag();
  const ciphertextWithTag = Buffer.concat([encrypted, tag]);

  return {
    plaintextBytes,
    sha256,
    ciphertextBase64: ciphertextWithTag.toString('base64'),
    encryptionMetadata: {
      algorithm: 'AES-GCM' as const,
      keyDerivation: 'PBKDF2' as const,
      pbkdf2Iterations: iterations,
      ivHex: iv.toString('hex'),
      saltHex: salt.toString('hex'),
      version: '1.0' as const,
    },
  };
}

// Helper simulating in-browser Web Crypto API client-side decryption
function simulateClientSideDecryption(
  ciphertextBase64: string,
  passphrase: string,
  ivHex: string,
  saltHex: string,
  iterations = 100000
): { decryptedText: string; computedSha256: string } {
  const buffer = Buffer.from(ciphertextBase64, 'base64');
  const iv = Buffer.from(ivHex, 'hex');
  const salt = Buffer.from(saltHex, 'hex');

  // Last 16 bytes is GCM auth tag
  const tag = buffer.subarray(buffer.length - 16);
  const encryptedData = buffer.subarray(0, buffer.length - 16);

  const key = crypto.pbkdf2Sync(passphrase, salt, iterations, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  const computedSha256 = crypto.createHash('sha256').update(decrypted).digest('hex');

  return {
    decryptedText: decrypted.toString('utf-8'),
    computedSha256,
  };
}

describe('Phase 4 — Evidence Vault Integration & Cryptographic Tests', () => {
  describe('1. Client-Side Cryptographic Roundtrip & Tamper Detection', () => {
    it('successfully encrypts and decrypts with the correct passphrase', async () => {
      const originalText = 'CONFIDENTIAL: Extortion chat log evidence with perpetrator timestamp.';
      const passphrase = 'SuperSecurePassphrase123!';

      const encrypted = await simulateClientSideEncryption(originalText, passphrase);
      expect(encrypted.ciphertextBase64).toBeDefined();
      expect(encrypted.sha256).toHaveLength(64);

      const decrypted = simulateClientSideDecryption(
        encrypted.ciphertextBase64,
        passphrase,
        encrypted.encryptionMetadata.ivHex,
        encrypted.encryptionMetadata.saltHex
      );

      expect(decrypted.decryptedText).toBe(originalText);
      expect(decrypted.computedSha256).toBe(encrypted.sha256);
    });

    it('fails decryption when provided an incorrect passphrase', async () => {
      const originalText = 'Harassing email headers evidence';
      const encrypted = await simulateClientSideEncryption(originalText, 'RightPassphrase123!');

      expect(() => {
        simulateClientSideDecryption(
          encrypted.ciphertextBase64,
          'WrongPassphrase456!',
          encrypted.encryptionMetadata.ivHex,
          encrypted.encryptionMetadata.saltHex
        );
      }).toThrow();
    });

    it('fails decryption and detects tampering when ciphertext is modified', async () => {
      const originalText = 'Audio recording transcript evidence';
      const encrypted = await simulateClientSideEncryption(originalText, 'PassphraseSecret!');

      // Tamper with the ciphertext by flipping one byte
      const rawBuf = Buffer.from(encrypted.ciphertextBase64, 'base64');
      rawBuf[0] = rawBuf[0] ^ 0xff; // Flip byte
      const tamperedCiphertext = rawBuf.toString('base64');

      expect(() => {
        simulateClientSideDecryption(
          tamperedCiphertext,
          'PassphraseSecret!',
          encrypted.encryptionMetadata.ivHex,
          encrypted.encryptionMetadata.saltHex
        );
      }).toThrow();
    });

    it('generates distinct IV and salt for identical plaintext encrypted with the same passphrase', async () => {
      const text = 'Same message encrypted twice';
      const pass = 'ConsistentPassphrase123!';

      const enc1 = await simulateClientSideEncryption(text, pass);
      const enc2 = await simulateClientSideEncryption(text, pass);

      // Nonces and salts must be unique
      expect(enc1.encryptionMetadata.ivHex).not.toBe(enc2.encryptionMetadata.ivHex);
      expect(enc1.encryptionMetadata.saltHex).not.toBe(enc2.encryptionMetadata.saltHex);
      expect(enc1.ciphertextBase64).not.toBe(enc2.ciphertextBase64);
      // But plaintext SHA-256 digest is identical
      expect(enc1.sha256).toBe(enc2.sha256);
    });
  });

  describe('2. Evidence Vault API Endpoints & Tenant Isolation', () => {
    let aliceIncidentId: string;
    let bobIncidentId: string;

    beforeEach(async () => {
      // Create Alice's incident
      const incRes = await request(app)
        .post('/api/v1/incidents')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          title: 'Alice Harassment Incident',
          incidentType: 'HARASSMENT',
          description: 'Intake test',
          platform: 'INSTAGRAM',
        });
      aliceIncidentId = incRes.body.data.id;

      // Create Bob's incident
      const bobIncRes = await request(app)
        .post('/api/v1/incidents')
        .set('x-demo-user-id', USER_BOB)
        .send({
          title: 'Bob Stalking Incident',
          incidentType: 'STALKING',
          description: 'Intake test for Bob',
          platform: 'WHATSAPP',
        });
      bobIncidentId = bobIncRes.body.data.id;
    });

    it('successfully stores encrypted evidence for owner (POST /api/v1/vault/items)', async () => {
      const encrypted = await simulateClientSideEncryption('Screenshot data', 'SecretPass123!');

      const res = await request(app)
        .post('/api/v1/vault/items')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          incidentId: aliceIncidentId,
          filename: 'harassment_screenshot.png',
          mimeType: 'image/png',
          size: 1024,
          sha256: encrypted.sha256,
          ciphertextBase64: encrypted.ciphertextBase64,
          encryptionMetadata: encrypted.encryptionMetadata,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.ownerId).toBe(USER_ALICE);
      expect(res.body.data.filename).toBe('harassment_screenshot.png');
      expect(res.body.data.sha256).toBe(encrypted.sha256);
      expect(res.body.data.encryptionMetadata.algorithm).toBe('AES-GCM');
    });

    it('rejects uploading evidence to an incident owned by another user', async () => {
      const encrypted = await simulateClientSideEncryption('Screenshot data', 'SecretPass123!');

      // Bob tries to attach evidence to Alice's incident
      const res = await request(app)
        .post('/api/v1/vault/items')
        .set('x-demo-user-id', USER_BOB)
        .send({
          incidentId: aliceIncidentId,
          filename: 'bobs_intruding_file.png',
          mimeType: 'image/png',
          size: 1024,
          sha256: encrypted.sha256,
          ciphertextBase64: encrypted.ciphertextBase64,
          encryptionMetadata: encrypted.encryptionMetadata,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('rejects invalid payload: file size > 10MB or invalid sha256', async () => {
      const encrypted = await simulateClientSideEncryption('Too big data', 'SecretPass123!');

      // Over 10MB
      const resBig = await request(app)
        .post('/api/v1/vault/items')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          incidentId: aliceIncidentId,
          filename: 'giant.png',
          mimeType: 'image/png',
          size: 15 * 1024 * 1024,
          sha256: encrypted.sha256,
          ciphertextBase64: encrypted.ciphertextBase64,
          encryptionMetadata: encrypted.encryptionMetadata,
        });

      expect(resBig.status).toBe(400);
      expect(resBig.body.success).toBe(false);

      // Malformed SHA-256
      const resBadHash = await request(app)
        .post('/api/v1/vault/items')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          incidentId: aliceIncidentId,
          filename: 'invalid_hash.png',
          mimeType: 'image/png',
          size: 1024,
          sha256: 'not-a-valid-sha256',
          ciphertextBase64: encrypted.ciphertextBase64,
          encryptionMetadata: encrypted.encryptionMetadata,
        });

      expect(resBadHash.status).toBe(400);
      expect(resBadHash.body.success).toBe(false);
    });

    it('lists evidence for an incident excluding heavy ciphertextBase64', async () => {
      const encrypted = await simulateClientSideEncryption('Screenshot data', 'SecretPass123!');

      await request(app)
        .post('/api/v1/vault/items')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          incidentId: aliceIncidentId,
          filename: 'screen1.png',
          mimeType: 'image/png',
          size: 2048,
          sha256: encrypted.sha256,
          ciphertextBase64: encrypted.ciphertextBase64,
          encryptionMetadata: encrypted.encryptionMetadata,
        });

      const listRes = await request(app)
        .get(`/api/v1/vault/items?incidentId=${aliceIncidentId}`)
        .set('x-demo-user-id', USER_ALICE);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.data[0].filename).toBe('screen1.png');
      // ciphertextBase64 should NOT be exposed in listing
      expect(listRes.body.data[0].ciphertextBase64).toBeUndefined();
    });

    it('retrieves evidence with ciphertext for owner (GET /api/v1/vault/items/:id)', async () => {
      const encrypted = await simulateClientSideEncryption('Confidential proof', 'SecretPass123!');

      const createRes = await request(app)
        .post('/api/v1/vault/items')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          incidentId: aliceIncidentId,
          filename: 'proof.txt',
          mimeType: 'text/plain',
          size: 100,
          sha256: encrypted.sha256,
          ciphertextBase64: encrypted.ciphertextBase64,
          encryptionMetadata: encrypted.encryptionMetadata,
        });
      const evidenceId = createRes.body.data.id;

      // Alice can fetch it with ciphertext
      const getRes = await request(app)
        .get(`/api/v1/vault/items/${evidenceId}`)
        .set('x-demo-user-id', USER_ALICE);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.ciphertextBase64).toBe(encrypted.ciphertextBase64);

      // Bob CANNOT fetch Alice's evidence
      const bobRes = await request(app)
        .get(`/api/v1/vault/items/${evidenceId}`)
        .set('x-demo-user-id', USER_BOB);

      expect(bobRes.status).toBe(404);
    });

    it('verifies integrity hash and returns limitation disclaimer (POST /api/v1/vault/items/:id/verify)', async () => {
      const encrypted = await simulateClientSideEncryption('Call audio log', 'SecretPass123!');

      const createRes = await request(app)
        .post('/api/v1/vault/items')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          incidentId: aliceIncidentId,
          filename: 'audio.txt',
          mimeType: 'text/plain',
          size: 512,
          sha256: encrypted.sha256,
          ciphertextBase64: encrypted.ciphertextBase64,
          encryptionMetadata: encrypted.encryptionMetadata,
        });
      const evidenceId = createRes.body.data.id;

      const verifyRes = await request(app)
        .post(`/api/v1/vault/items/${evidenceId}/verify`)
        .set('x-demo-user-id', USER_ALICE);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.evidenceId).toBe(evidenceId);
      expect(verifyRes.body.data.storedSha256).toBe(encrypted.sha256);
      expect(verifyRes.body.data.ciphertextSha256).toBeDefined();
      expect(verifyRes.body.data.integrityStatus).toBe('VERIFIED');
      expect(verifyRes.body.data.disclaimer).toContain('A cryptographic hash does not by itself prove who created the file');

      // Bob cannot verify Alice's evidence
      const bobVerifyRes = await request(app)
        .post(`/api/v1/vault/items/${evidenceId}/verify`)
        .set('x-demo-user-id', USER_BOB);
      expect(bobVerifyRes.status).toBe(404);
    });

    it('deletes evidence item for owner and blocks cross-tenant deletion', async () => {
      const encrypted = await simulateClientSideEncryption('Temp log', 'SecretPass123!');

      const createRes = await request(app)
        .post('/api/v1/vault/items')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          incidentId: aliceIncidentId,
          filename: 'delete_me.txt',
          mimeType: 'text/plain',
          size: 128,
          sha256: encrypted.sha256,
          ciphertextBase64: encrypted.ciphertextBase64,
          encryptionMetadata: encrypted.encryptionMetadata,
        });
      const evidenceId = createRes.body.data.id;

      // Bob tries to delete Alice's evidence -> 404
      const bobDelRes = await request(app)
        .delete(`/api/v1/vault/items/${evidenceId}`)
        .set('x-demo-user-id', USER_BOB);
      expect(bobDelRes.status).toBe(404);

      // Alice deletes her own evidence -> 200
      const aliceDelRes = await request(app)
        .delete(`/api/v1/vault/items/${evidenceId}`)
        .set('x-demo-user-id', USER_ALICE);
      expect(aliceDelRes.status).toBe(200);
      expect(aliceDelRes.body.data.deleted).toBe(true);

      // Subsequent fetch returns 404
      const checkRes = await request(app)
        .get(`/api/v1/vault/items/${evidenceId}`)
        .set('x-demo-user-id', USER_ALICE);
      expect(checkRes.status).toBe(404);
    });
  });
});
