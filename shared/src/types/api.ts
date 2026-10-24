export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorDetail {
  code:
    | 'VALIDATION_ERROR'
    | 'UNAUTHENTICATED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'RATE_LIMITED'
    | 'AI_PROVIDER_UNAVAILABLE'
    | 'CONFLICT'
    | 'INTERNAL_ERROR';
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface HealthCheckData {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  version: string;
  environment: string;
}

export interface ReadinessCheckData {
  status: 'ready' | 'not_ready';
  database: {
    connected: boolean;
    status: string;
    pingLatencyMs: number | null;
    isAtlas: boolean;
  };
  timestamp: string;
}
