import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { Express } from 'express';

let mongod: MongoMemoryServer;
let app: Express;

const USER_A = 'user-analytics-alpha';
const USER_B = 'user-analytics-beta';

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
    await mongoose.connection.db.collection('cases').deleteMany({});
    await mongoose.connection.db.collection('checkins').deleteMany({});
    await mongoose.connection.db.collection('evidences').deleteMany({});
    await mongoose.connection.db.collection('threatlinks').deleteMany({});
  }
});

describe('Phase C — Analytics API (RS-015F)', () => {
  describe('GET /api/v1/analytics/summary', () => {
    it('returns empty/zeroed aggregate structures when user has no records', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/summary')
        .set('x-demo-user-id', USER_A);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overview.totalIncidents).toBe(0);
      expect(res.body.data.overview.totalCases).toBe(0);
      expect(res.body.data.overview.totalCheckIns).toBe(0);
      expect(res.body.data.riskDistribution).toEqual({ high: 0, medium: 0, low: 0 });
      expect(res.body.data.incidentTrends).toEqual([]);
      expect(res.body.data.recentActivity).toEqual([]);
    });

    it('accurately aggregates user incidents, cases, check-ins, and risk distribution', async () => {
      // 1. Seed incidents for User A
      if (mongoose.connection.db) {
        await mongoose.connection.db.collection('incidents').insertMany([
          {
            ownerId: USER_A,
            title: 'Blackmail threat via Instagram',
            incidentType: 'BLACKMAIL', // HIGH risk
            description: 'Blackmail attempt',
            platform: 'INSTAGRAM',
            status: 'OPEN',
            occurredAt: new Date('2026-10-10T10:00:00Z'),
            createdAt: new Date('2026-10-10T10:00:00Z'),
            updatedAt: new Date('2026-10-10T10:00:00Z'),
          },
          {
            ownerId: USER_A,
            title: 'Stalking via Telegram',
            incidentType: 'STALKING', // HIGH risk
            description: 'Stalking messages',
            platform: 'TELEGRAM',
            status: 'UNDER_REVIEW',
            occurredAt: new Date('2026-10-12T14:00:00Z'),
            createdAt: new Date('2026-10-12T14:00:00Z'),
            updatedAt: new Date('2026-10-12T14:00:00Z'),
          },
          {
            ownerId: USER_A,
            title: 'Harassment on WhatsApp',
            incidentType: 'HARASSMENT', // MEDIUM risk
            description: 'Repeated calls',
            platform: 'WHATSAPP',
            status: 'RESOLVED',
            occurredAt: new Date('2026-10-15T09:00:00Z'),
            createdAt: new Date('2026-10-15T09:00:00Z'),
            updatedAt: new Date('2026-10-15T09:00:00Z'),
          },
        ]);

        // 2. Seed a case for User A
        await mongoose.connection.db.collection('cases').insertOne({
          ownerId: USER_A,
          incidentId: 'dummy-inc-1',
          reportingChannel: 'National Cyber Crime Portal',
          referenceNumber: 'NCCR-2026-999',
          status: 'IN_PROGRESS',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // 3. Seed a check-in for User A
        await mongoose.connection.db.collection('checkins').insertOne({
          ownerId: USER_A,
          contactId: 'dummy-contact-1',
          contactName: 'Priya Sharma',
          message: 'Safe at home',
          locationSharingEnabled: true,
          latitudeSnapshot: 28.6139,
          longitudeSnapshot: 77.209,
          status: 'ACTIVE',
          deliveryState: 'CONFIRMED',
          deliveryDisclaimer: 'Notice',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const res = await request(app)
        .get('/api/v1/analytics/summary')
        .set('x-demo-user-id', USER_A);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.overview.totalIncidents).toBe(3);
      expect(data.overview.openIncidents).toBe(1);
      expect(data.overview.resolvedIncidents).toBe(1);
      expect(data.overview.totalCases).toBe(1);
      expect(data.overview.activeCases).toBe(1);
      expect(data.overview.totalCheckIns).toBe(1);
      expect(data.overview.activeCheckIns).toBe(1);

      // Check Risk Distribution: 2 High (BLACKMAIL, STALKING), 1 Medium (HARASSMENT), 0 Low
      expect(data.riskDistribution).toEqual({ high: 2, medium: 1, low: 0 });

      // Check Platform breakdown
      expect(data.byPlatform.INSTAGRAM).toBe(1);
      expect(data.byPlatform.TELEGRAM).toBe(1);
      expect(data.byPlatform.WHATSAPP).toBe(1);
      expect(data.byPlatform.FACEBOOK).toBe(0);

      // Check Incident Trends (3 distinct days)
      expect(data.incidentTrends.length).toBe(3);
      expect(data.incidentTrends[0].date).toBe('2026-10-10');
      expect(data.incidentTrends[0].count).toBe(1);

      // Check Recent Activity
      expect(data.recentActivity.length).toBeGreaterThanOrEqual(3);
    });

    it('enforces strict cross-user isolation: User B cannot see User A metrics', async () => {
      // Seed an incident for User A
      if (mongoose.connection.db) {
        await mongoose.connection.db.collection('incidents').insertOne({
          ownerId: USER_A,
          title: 'User A Secret Threat',
          incidentType: 'BLACKMAIL',
          description: 'Confidential',
          platform: 'INSTAGRAM',
          status: 'OPEN',
          occurredAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // User B requests their summary
      const resB = await request(app)
        .get('/api/v1/analytics/summary')
        .set('x-demo-user-id', USER_B);

      expect(resB.status).toBe(200);
      expect(resB.body.data.overview.totalIncidents).toBe(0);
      expect(resB.body.data.recentActivity).toEqual([]);

      // User A requests their summary
      const resA = await request(app)
        .get('/api/v1/analytics/summary')
        .set('x-demo-user-id', USER_A);

      expect(resA.status).toBe(200);
      expect(resA.body.data.overview.totalIncidents).toBe(1);
    });

    it('filters metrics by valid date ranges', async () => {
      if (mongoose.connection.db) {
        await mongoose.connection.db.collection('incidents').insertMany([
          {
            ownerId: USER_A,
            title: 'September Event',
            incidentType: 'HARASSMENT',
            description: 'Old event',
            platform: 'SMS',
            status: 'RESOLVED',
            occurredAt: new Date('2026-09-15T00:00:00Z'),
            createdAt: new Date('2026-09-15T00:00:00Z'),
            updatedAt: new Date('2026-09-15T00:00:00Z'),
          },
          {
            ownerId: USER_A,
            title: 'October Event',
            incidentType: 'HARASSMENT',
            description: 'Recent event',
            platform: 'SMS',
            status: 'OPEN',
            occurredAt: new Date('2026-10-15T00:00:00Z'),
            createdAt: new Date('2026-10-15T00:00:00Z'),
            updatedAt: new Date('2026-10-15T00:00:00Z'),
          },
        ]);
      }

      // Query only October
      const res = await request(app)
        .get('/api/v1/analytics/summary?startDate=2026-10-01T00:00:00Z&endDate=2026-10-31T23:59:59Z')
        .set('x-demo-user-id', USER_A);

      expect(res.status).toBe(200);
      expect(res.body.data.overview.totalIncidents).toBe(1);
      expect(res.body.data.incidentTrends[0].date).toBe('2026-10-15');
    });

    it('rejects invalid date parameters with 400 VALIDATION_ERROR', async () => {
      // 1. Malformed date
      const malformedRes = await request(app)
        .get('/api/v1/analytics/summary?startDate=invalid-date')
        .set('x-demo-user-id', USER_A);

      expect(malformedRes.status).toBe(400);
      expect(malformedRes.body.error.code).toBe('VALIDATION_ERROR');

      // 2. startDate after endDate
      const invertedRes = await request(app)
        .get('/api/v1/analytics/summary?startDate=2026-10-20T00:00:00Z&endDate=2026-10-10T00:00:00Z')
        .set('x-demo-user-id', USER_A);

      expect(invertedRes.status).toBe(400);
      expect(invertedRes.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/analytics/map-points', () => {
    it('returns privacy-fuzzed coordinates by default', async () => {
      if (mongoose.connection.db) {
        await mongoose.connection.db.collection('checkins').insertOne({
          ownerId: USER_A,
          contactId: 'c1',
          contactName: 'Neha',
          message: 'Safe in transit',
          locationSharingEnabled: true,
          latitudeSnapshot: 19.07609,
          longitudeSnapshot: 72.877426,
          status: 'COMPLETED',
          deliveryState: 'CONFIRMED',
          deliveryDisclaimer: 'Notice',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const res = await request(app)
        .get('/api/v1/analytics/map-points')
        .set('x-demo-user-id', USER_A);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.isRealTime).toBe(false);

      const point = res.body.data.points[0];
      expect(point.isFuzzed).toBe(true);
      // Fuzzed coordinates must not exactly equal raw floating point coords
      expect(point.lat).not.toBe(19.07609);
      expect(Math.abs(point.lat - 19.07609)).toBeLessThan(0.05); // Within ~5km
    });

    it('returns precise coordinates only when fuzzLocation is explicitly false', async () => {
      if (mongoose.connection.db) {
        await mongoose.connection.db.collection('checkins').insertOne({
          ownerId: USER_A,
          contactId: 'c1',
          contactName: 'Neha',
          message: 'Safe in transit',
          locationSharingEnabled: true,
          latitudeSnapshot: 19.07609,
          longitudeSnapshot: 72.877426,
          status: 'COMPLETED',
          deliveryState: 'CONFIRMED',
          deliveryDisclaimer: 'Notice',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const res = await request(app)
        .get('/api/v1/analytics/map-points?fuzzLocation=false')
        .set('x-demo-user-id', USER_A);

      expect(res.status).toBe(200);
      expect(res.body.data.points[0].isFuzzed).toBe(false);
      expect(res.body.data.points[0].lat).toBe(19.07609);
      expect(res.body.data.points[0].lng).toBe(72.87743);
    });

    it('enforces tenant isolation on map points', async () => {
      if (mongoose.connection.db) {
        await mongoose.connection.db.collection('checkins').insertOne({
          ownerId: USER_A,
          contactId: 'c1',
          contactName: 'User A Secret CheckIn',
          message: 'Confidential',
          locationSharingEnabled: true,
          latitudeSnapshot: 12.9716,
          longitudeSnapshot: 77.5946,
          status: 'ACTIVE',
          deliveryState: 'CONFIRMED',
          deliveryDisclaimer: 'Notice',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const resB = await request(app)
        .get('/api/v1/analytics/map-points')
        .set('x-demo-user-id', USER_B);

      expect(resB.status).toBe(200);
      expect(resB.body.data.total).toBe(0);
      expect(resB.body.data.points).toEqual([]);
    });
  });
});
