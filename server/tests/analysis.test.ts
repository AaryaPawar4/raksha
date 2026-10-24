import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { PlaybookService } from '../src/services/playbook.service';
import { RuleAnalysisService } from '../src/services/ruleAnalysis.service';
import { AiProviderService } from '../src/services/aiProvider.service';
import { Express } from 'express';

let mongod: MongoMemoryServer;
let app: Express;

const USER_ALICE = 'alice-analysis-test';
const USER_BOB = 'bob-analysis-test';

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
  }
  vi.restoreAllMocks();
});

describe('Phase 3 — Rule-Based Safety Indicators & Curated Playbooks', () => {
  describe('1. Curated Playbooks Service', () => {
    it('returns verified playbooks for all 7 incident categories', () => {
      const categories = [
        'HARASSMENT',
        'DOXXING',
        'IMPERSONATION',
        'BLACKMAIL',
        'STALKING',
        'FINANCIAL_SCAM',
        'OTHER',
      ] as const;

      for (const cat of categories) {
        const playbook = PlaybookService.getPlaybookForCategory(cat);
        expect(playbook.category).toBe(cat);
        expect(playbook.title).toBeDefined();
        expect(playbook.version).toBe('2026.1');
        expect(playbook.immediateSafetySteps.length).toBeGreaterThan(0);
        expect(playbook.accountSecuritySteps.length).toBeGreaterThan(0);
        expect(playbook.evidencePreservationSteps.length).toBeGreaterThan(0);
        expect(playbook.officialReportingChannels.length).toBeGreaterThan(0);
        expect(playbook.disclaimer).toBeDefined();

        // Verify channels have valid real URLs
        for (const channel of playbook.officialReportingChannels) {
          expect(channel.url).toMatch(/^https?:\/\//);
          expect(channel.verifiedDate).toBe('2026-10-01');
        }
      }
    });

    it('falls back to OTHER playbook for unrecognized category', () => {
      const pb = PlaybookService.getPlaybookForCategory('UNKNOWN' as any);
      expect(pb.category).toBe('OTHER');
    });
  });

  describe('2. Deterministic Rule-Based Indicators', () => {
    it('detects THREATS_OR_BLACKMAIL indicator with signal attribution', () => {
      const indicators = RuleAnalysisService.evaluate({
        id: 'inc-1',
        ownerId: 'u1',
        title: 'Extortion demand',
        incidentType: 'BLACKMAIL',
        description: 'Caller said: pay or else I will leak your photos and ruin your life.',
        platform: 'WHATSAPP',
        status: 'OPEN',
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const threatInd = indicators.find((i) => i.id === 'THREATS_OR_BLACKMAIL');
      expect(threatInd).toBeDefined();
      expect(threatInd?.severity).toBe('HIGH');
      expect(threatInd?.confidence).toBe('HIGH');
      expect(threatInd?.explanation).toContain('extortion or threatening language');
      expect(threatInd?.uncertaintyNotes).toContain('cannot establish intent');
    });

    it('detects EXPOSURE_OF_PERSONAL_INFO (Doxxing) signals', () => {
      const indicators = RuleAnalysisService.evaluate({
        id: 'inc-2',
        ownerId: 'u1',
        title: 'Doxxed on forum',
        incidentType: 'DOXXING',
        description: 'Anonymous account posted my address and shared my phone number publicly.',
        platform: 'TWITTER_X',
        status: 'OPEN',
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const doxInd = indicators.find((i) => i.id === 'EXPOSURE_OF_PERSONAL_INFO');
      expect(doxInd).toBeDefined();
      expect(doxInd?.severity).toBe('HIGH');
      expect(doxInd?.explanation).toContain('personal information disclosure');
    });

    it('detects STALKING_CONCERNS indicators', () => {
      const indicators = RuleAnalysisService.evaluate({
        id: 'inc-3',
        ownerId: 'u1',
        title: 'Following me home',
        incidentType: 'STALKING',
        description: 'Suspicious person tracks my location and knows where i am every evening.',
        platform: 'INSTAGRAM',
        status: 'OPEN',
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const stalkInd = indicators.find((i) => i.id === 'STALKING_CONCERNS');
      expect(stalkInd).toBeDefined();
      expect(stalkInd?.explanation).toContain('persistent monitoring');
    });

    it('detects IMPERSONATION and FINANCIAL_SCAM indicators', () => {
      const indicators = RuleAnalysisService.evaluate({
        id: 'inc-4',
        ownerId: 'u1',
        title: 'Fake profile asking for cash',
        incidentType: 'IMPERSONATION',
        description: 'Fake profile using my photos is messaging friends to send money urgently.',
        platform: 'FACEBOOK',
        status: 'OPEN',
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(indicators.some((i) => i.id === 'IMPERSONATION')).toBe(true);
      expect(indicators.some((i) => i.id === 'FINANCIAL_SCAM')).toBe(true);
    });
  });

  describe('3. POST /api/v1/incidents/:id/analyze API Endpoint', () => {
    let incidentId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/incidents')
        .set('x-demo-user-id', USER_ALICE)
        .send({
          title: 'Harassing emails with blackmail threat',
          incidentType: 'BLACKMAIL',
          description: 'Attacker demands payment or else private files will be exposed.',
          platform: 'EMAIL',
        });
      incidentId = res.body.data.id;
    });

    it('runs rule-based analysis and curated playbook without AI when consent is false', async () => {
      // Mock AI Provider to ensure it is NOT called
      const aiSpy = vi.spyOn(AiProviderService, 'analyze');

      const res = await request(app)
        .post(`/api/v1/incidents/${incidentId}/analyze`)
        .set('x-demo-user-id', USER_ALICE)
        .send({ consentToAiProcessing: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.analysisMode).toBe('RULES_ONLY');
      expect(res.body.data.providerStatus).toBe('SKIPPED_NO_CONSENT');
      expect(res.body.data.aiAnalysis).toBeNull();
      expect(res.body.data.consentGiven).toBe(false);
      expect(res.body.data.ruleIndicators.length).toBeGreaterThan(0);
      expect(res.body.data.playbook.category).toBe('BLACKMAIL');
      expect(res.body.data.disclaimer).toContain('not legal advice');

      // Crucial verification: AI provider was NOT called without consent!
      expect(aiSpy).not.toHaveBeenCalled();
    });

    it('invokes AI provider when consentToAiProcessing is explicitly true', async () => {
      // Mock successful AI Provider response
      vi.spyOn(AiProviderService, 'analyze').mockResolvedValueOnce({
        success: true,
        status: 'COMPLETED',
        data: {
          overallSeverity: 'HIGH',
          indicators: [
            {
              id: 'AI_COERCION',
              name: 'Financial Coercion Pressure',
              severity: 'HIGH',
              confidence: 'HIGH',
              explanation: 'Language creates artificial urgency and threats of exposure.',
              uncertaintyNotes: 'Model evaluated text alone without verifying email headers.',
            },
          ],
          uncertaintyAssessment: 'Online extortion cannot be definitively attributed to an individual.',
          immediateSteps: ['Cease contact immediately', 'Do not transfer funds'],
          nextSteps: ['File police complaint', 'Preserve email headers'],
          modelMetadata: {
            provider: 'Google Gemini',
            model: 'gemini-1.5-flash',
            completedAt: new Date().toISOString(),
          },
        },
      });

      const res = await request(app)
        .post(`/api/v1/incidents/${incidentId}/analyze`)
        .set('x-demo-user-id', USER_ALICE)
        .send({
          consentToAiProcessing: true,
          consentTimestamp: new Date().toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.data.analysisMode).toBe('AI_ASSISTED');
      expect(res.body.data.providerStatus).toBe('COMPLETED');
      expect(res.body.data.aiAnalysis).not.toBeNull();
      expect(res.body.data.aiAnalysis.indicators[0].name).toBe('Financial Coercion Pressure');
      expect(res.body.data.consentGiven).toBe(true);
    });

    it('gracefully falls back to rules and playbooks if AI provider fails or is unconfigured', async () => {
      // Mock AI Provider failure
      vi.spyOn(AiProviderService, 'analyze').mockResolvedValueOnce({
        success: false,
        status: 'FALLBACK_PROVIDER_ERROR',
        errorMessage: 'AI Provider timeout',
      });

      const res = await request(app)
        .post(`/api/v1/incidents/${incidentId}/analyze`)
        .set('x-demo-user-id', USER_ALICE)
        .send({ consentToAiProcessing: true });

      expect(res.status).toBe(200);
      expect(res.body.data.analysisMode).toBe('AI_ASSISTED');
      expect(res.body.data.providerStatus).toBe('FALLBACK_PROVIDER_ERROR');
      expect(res.body.data.aiAnalysis).toBeNull();
      // Rules and playbook are still completely available!
      expect(res.body.data.ruleIndicators.length).toBeGreaterThan(0);
      expect(res.body.data.playbook).toBeDefined();
    });

    it('rejects invalid request payload with missing consent boolean', async () => {
      const res = await request(app)
        .post(`/api/v1/incidents/${incidentId}/analyze`)
        .set('x-demo-user-id', USER_ALICE)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('blocks cross-user analysis: User Bob cannot analyze User Alice incident', async () => {
      const res = await request(app)
        .post(`/api/v1/incidents/${incidentId}/analyze`)
        .set('x-demo-user-id', USER_BOB)
        .send({ consentToAiProcessing: false });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
