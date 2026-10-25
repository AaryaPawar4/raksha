export type AuditEventType =
  | 'AUTH_REGISTER'
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_LOGOUT'
  | 'AUTH_TOKEN_REFRESH'
  | 'AUTH_TOKEN_REUSE_DETECTED'
  | 'VAULT_UPLOAD'
  | 'VAULT_VERIFY'
  | 'VAULT_DELETE'
  | 'CHECKIN_CREATED'
  | 'CHECKIN_COMPLETED'
  | 'CHECKIN_CANCELLED'
  | 'INCIDENT_DELETED';

export interface AuditEventPayload {
  eventType: AuditEventType;
  userId?: string;
  ip?: string;
  resourceId?: string;
  success: boolean;
  metadata?: Record<string, string | number | boolean>;
}

// Redaction utility to guarantee sensitive values are never logged
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'refreshtoken',
  'rawrefreshtoken',
  'newrefreshtoken',
  'refresh_token',
  'accesstoken',
  'access_token',
  'token',
  'bearertoken',
  'authorization',
  'cookie',
  'passphrase',
  'key',
  'secret',
  'salt',
  'iv',
  'salthex',
  'ivhex',
  'ciphertext',
  'ciphertextbase64',
  'latitudesnapshot',
  'longitudesnapshot',
  'coordinates',
  'lat',
  'lon',
  'narrative',
  'description',
]);

export function sanitizeLogData(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (data instanceof Error) {
    let msg = data.message;
    for (const key of SENSITIVE_KEYS) {
      const regex = new RegExp(`(${key}\\s*[:=]\\s*)([^\\s,;]+)`, 'gi');
      msg = msg.replace(regex, '$1[REDACTED]');
    }
    return { name: data.name, message: msg };
  }

  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    const isSensitive =
      SENSITIVE_KEYS.has(lowerKey) ||
      lowerKey.endsWith('token') ||
      lowerKey.endsWith('password') ||
      lowerKey.endsWith('secret') ||
      lowerKey.endsWith('cookie');

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeLogData(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export class AuditLogger {
  public static log(event: AuditEventPayload): void {
    const safeMetadata = event.metadata ? sanitizeLogData(event.metadata) : undefined;

    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'SECURITY_AUDIT',
      eventType: event.eventType,
      userId: event.userId || 'anonymous',
      ip: event.ip ? event.ip.replace(/:\d+$/, '') : undefined,
      resourceId: event.resourceId,
      success: event.success,
      metadata: safeMetadata,
    };

    // Output structured JSON line in production/dev
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[AUDIT] ${JSON.stringify(logEntry)}`);
    }
  }
}
