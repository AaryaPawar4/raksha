import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Health Check & Basic Routing', () => {
  const app = createApp();

  it('GET /health should return 200 and standard success envelope', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toMatchObject({
      status: 'ok',
      service: 'rakshasphere-api',
      version: '0.1.0',
    });
    expect(response.body.data).toHaveProperty('timestamp');
    expect(response.body.data).toHaveProperty('environment');
  });

  it('GET /unknown-route should return 404 with standard error envelope', async () => {
    const response = await request(app).get('/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Resource not found: GET /unknown-route',
    });
  });
});
