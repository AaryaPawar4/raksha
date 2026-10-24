import { Request, Response } from 'express';
import { HealthService } from '../services/health.service';
import { createSuccessResponse } from '../utils/response';

export class HealthController {
  public static getHealth(_req: Request, res: Response): void {
    const healthData = HealthService.getHealth();
    res.status(200).json(createSuccessResponse(healthData));
  }
}
