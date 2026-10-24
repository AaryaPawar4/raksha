import { ApiSuccessResponse, ApiErrorResponse, ApiErrorDetail } from '@rakshasphere/shared';

export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

export function createErrorResponse(
  code: ApiErrorDetail['code'],
  message: string,
  details?: unknown
): ApiErrorResponse {
  const errorObj: ApiErrorDetail = {
    code,
    message,
  };
  if (details !== undefined) {
    errorObj.details = details;
  }
  return {
    success: false,
    error: errorObj,
  };
}
