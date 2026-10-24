import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { User } from '@rakshasphere/shared';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  family: string;
  type: 'refresh';
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Parse a duration string like '15m', '7d', '1h' into seconds.
 * Falls back to 900 (15 minutes) if the format is unrecognized.
 */
function parseDurationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 900;
  }
}

const TOKEN_ISSUER = 'rakshasphere';
const TOKEN_AUDIENCE = 'rakshasphere-app';

export function generateAccessToken(user: User): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    type: 'access',
  };

  const options: SignOptions = {
    algorithm: 'HS256',
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    expiresIn: parseDurationToSeconds(env.JWT_ACCESS_EXPIRY),
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function generateRefreshToken(
  userId: string,
  family: string
): { token: string; hash: string } {
  const payload: RefreshTokenPayload = {
    sub: userId,
    family,
    type: 'refresh',
  };

  const options: SignOptions = {
    algorithm: 'HS256',
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    expiresIn: parseDurationToSeconds(env.JWT_REFRESH_EXPIRY),
  };

  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, options);

  const hash = hashToken(token);
  return { token, hash };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  }) as AccessTokenPayload;
  if (decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: ['HS256'],
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  }) as RefreshTokenPayload;
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return decoded;
}
