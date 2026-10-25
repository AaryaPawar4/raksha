import { ActivityLogModel, ActivityEventType, ActivityEventOutcome } from '../models/activityLog.model';

/** Never include: passwords, tokens, keys, IVs, ciphertext, coordinates, full URIs */
const FORBIDDEN_KEYS = new Set([
  'password', 'passwordhash', 'refreshtoken', 'accesstoken', 'token', 'secret',
  'key', 'iv', 'ivhex', 'salt', 'salthex', 'ciphertext', 'ciphertextbase64',
  'authorization', 'cookie', 'passphrase', 'lat', 'lon', 'latitude', 'longitude',
  'latitudesnapshot', 'longitudesnapshot', 'coordinates',
]);

function sanitizeMeta(
  meta: Record<string, unknown>
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (FORBIDDEN_KEYS.has(k.toLowerCase())) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    }
  }
  return out;
}

export interface ActivityLogOptions {
  ownerId: string;
  eventType: ActivityEventType;
  outcome?: ActivityEventOutcome;
  resourceId?: string;
  resourceLabel?: string;
  safeMetadata?: Record<string, unknown>;
}

/**
 * Persist a user-scoped activity record to MongoDB.
 * Fire-and-forget: errors are caught and swallowed so they never break the caller.
 */
export async function recordActivity(opts: ActivityLogOptions): Promise<void> {
  const doc = {
    ownerId: opts.ownerId,
    eventType: opts.eventType,
    outcome: opts.outcome ?? 'SUCCESS',
    resourceId: opts.resourceId,
    resourceLabel: opts.resourceLabel
      ? String(opts.resourceLabel).slice(0, 100)
      : undefined,
    safeMetadata: opts.safeMetadata ? sanitizeMeta(opts.safeMetadata as Record<string, unknown>) : undefined,
  };

  try {
    await ActivityLogModel.create(doc);
  } catch {
    // Intentionally swallowed — activity logging must never break a request
  }
}

