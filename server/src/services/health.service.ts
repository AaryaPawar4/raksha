import { HealthCheckData } from '@rakshasphere/shared';
import { env } from '../config/env';

export class HealthService {
  public static getHealth(): HealthCheckData {
    return {
      status: 'ok',
      service: 'rakshasphere-api',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      environment: env.NODE_ENV,
    };
  }
}
