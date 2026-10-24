import { Request, Response } from 'express';
import { HealthService } from '../services/health.service';
import { getDatabaseDiagnostics, isDatabaseConnected } from '../config/db';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { ReadinessCheckData } from '@rakshasphere/shared';

export class HealthController {
  public static getHealth(_req: Request, res: Response): void {
    const healthData = HealthService.getHealth();
    res.status(200).json(createSuccessResponse(healthData));
  }

  public static async getReadiness(_req: Request, res: Response): Promise<void> {
    const dbDiagnostics = await getDatabaseDiagnostics();
    const isReady = isDatabaseConnected();

    const readinessData: ReadinessCheckData = {
      status: isReady ? 'ready' : 'not_ready',
      database: {
        connected: isReady,
        status: dbDiagnostics.status,
        pingLatencyMs: dbDiagnostics.pingLatencyMs,
        isAtlas: dbDiagnostics.isAtlas,
      },
      timestamp: new Date().toISOString(),
    };

    if (!isReady) {
      res
        .status(503)
        .json(
          createErrorResponse(
            'INTERNAL_ERROR',
            'Database is currently unavailable or disconnected.',
            readinessData
          )
        );
      return;
    }

    res.status(200).json(createSuccessResponse(readinessData));
  }
}
