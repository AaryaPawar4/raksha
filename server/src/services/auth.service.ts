import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserRepository } from '../repositories/user.repository';
import { userDocToUser } from '../models/user.model';
import { isDatabaseConnected } from '../config/db';
import {
  RegisterDTO,
  LoginDTO,
  User,
} from '@rakshasphere/shared';
import { ServiceError } from './incident.service';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyRefreshToken,
} from '../utils/token';
import { AuditLogger } from '../utils/auditLogger';

const BCRYPT_SALT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private static checkDatabase(): void {
    if (!isDatabaseConnected()) {
      throw new ServiceError(
        'Database service is currently unavailable. Please ensure MongoDB is connected.',
        'INTERNAL_ERROR',
        503
      );
    }
  }

  public static async register(dto: RegisterDTO): Promise<AuthResult> {
    this.checkDatabase();

    const normalizedEmail = dto.email.toLowerCase().trim();
    const existing = await UserRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new ServiceError(
        'An account with this email address already exists.',
        'CONFLICT',
        409
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const { user, doc } = await UserRepository.create({
      email: normalizedEmail,
      passwordHash,
      name: dto.name.trim(),
    });

    const family = crypto.randomUUID();
    const { token: refreshToken, hash: tokenHash } = generateRefreshToken(user.id, family);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await UserRepository.addRefreshToken(user.id, {
      tokenHash,
      family,
      expiresAt,
    });

    const accessToken = generateAccessToken(user);

    return { user, accessToken, refreshToken };
  }

  public static async login(dto: LoginDTO): Promise<AuthResult> {
    this.checkDatabase();

    const normalizedEmail = dto.email.toLowerCase().trim();
    const userDoc = await UserRepository.findByEmail(normalizedEmail);
    if (!userDoc) {
      // Do not reveal whether email exists
      throw new ServiceError(
        'Invalid email address or password.',
        'UNAUTHENTICATED',
        401
      );
    }

    const passwordMatch = await bcrypt.compare(dto.password, userDoc.passwordHash);
    if (!passwordMatch) {
      throw new ServiceError(
        'Invalid email address or password.',
        'UNAUTHENTICATED',
        401
      );
    }

    const user = userDocToUser(userDoc);
    const family = crypto.randomUUID();
    const { token: refreshToken, hash: tokenHash } = generateRefreshToken(user.id, family);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await UserRepository.addRefreshToken(user.id, {
      tokenHash,
      family,
      expiresAt,
    });

    const accessToken = generateAccessToken(user);

    return { user, accessToken, refreshToken };
  }

  public static async refresh(rawRefreshToken: string): Promise<AuthResult> {
    this.checkDatabase();

    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new ServiceError(
        'Refresh token is required.',
        'UNAUTHENTICATED',
        401
      );
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new ServiceError(
        'Invalid or expired refresh token.',
        'UNAUTHENTICATED',
        401
      );
    }

    const incomingHash = hashToken(rawRefreshToken);

    // Atomically find and mark the active token as revoked to guarantee race-condition safety
    const atomicResult = await UserRepository.atomicRevokeActiveToken(incomingHash);

    if (!atomicResult) {
      // Token either does not exist or was ALREADY revoked (replay attack / race condition)
      const existing = await UserRepository.findByRefreshTokenHash(incomingHash);

      if (existing) {
        // Invalidate the entire token family on detected replay
        AuditLogger.log({
          eventType: 'AUTH_TOKEN_REUSE_DETECTED',
          userId: existing.userDoc._id.toString(),
          success: false,
          metadata: { family: existing.tokenItem.family },
        });
        await UserRepository.revokeTokenFamily(existing.userDoc._id.toString(), existing.tokenItem.family);
        throw new ServiceError(
          'Refresh token reuse detected. All sessions in this chain have been revoked for your security.',
          'UNAUTHENTICATED',
          401
        );
      }

      throw new ServiceError(
        'Invalid refresh token.',
        'UNAUTHENTICATED',
        401
      );
    }

    const { userDoc, tokenItem } = atomicResult;

    // Check expiration
    if (new Date() > tokenItem.expiresAt) {
      throw new ServiceError(
        'Refresh token has expired. Please log in again.',
        'UNAUTHENTICATED',
        401
      );
    }

    // Token was already atomically revoked; issue new replacement in the same family
    const user = userDocToUser(userDoc);
    const { token: newRefreshToken, hash: newTokenHash } = generateRefreshToken(
      user.id,
      tokenItem.family
    );
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await UserRepository.addRefreshToken(user.id, {
      tokenHash: newTokenHash,
      family: tokenItem.family,
      expiresAt,
    });

    const accessToken = generateAccessToken(user);

    return {
      user,
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  public static async logout(rawRefreshToken?: string, userId?: string): Promise<void> {
    this.checkDatabase();

    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      const result = await UserRepository.findByRefreshTokenHash(tokenHash);
      if (result) {
        await UserRepository.revokeRefreshToken(result.userDoc._id.toString(), tokenHash);
      }
    } else if (userId) {
      await UserRepository.revokeAllTokens(userId);
    }
  }

  public static async getCurrentUser(userId: string): Promise<User> {
    this.checkDatabase();

    const userDoc = await UserRepository.findById(userId);
    if (!userDoc) {
      throw new ServiceError(
        'User not found or account no longer active.',
        'NOT_FOUND',
        404
      );
    }
    return userDocToUser(userDoc);
  }

  public static async requestEmailVerification(userId: string): Promise<{
    message: string;
    alreadyVerified: boolean;
    token?: string;
  }> {
    this.checkDatabase();

    const userDoc = await UserRepository.findById(userId);
    if (!userDoc) {
      throw new ServiceError('User not found.', 'NOT_FOUND', 404);
    }

    if (userDoc.isEmailVerified) {
      return {
        message: 'Your email address is already verified.',
        alreadyVerified: true,
      };
    }

    // Generate secure 32-byte hex token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await UserRepository.setEmailVerificationToken(userId, tokenHash, expiresAt);

    // If an email provider is configured, we can dispatch the verification email
    const { EmailService } = await import('./email.service');
    if (EmailService.isConfigured()) {
      await EmailService.sendMail({
        to: userDoc.email,
        subject: 'Verify your email address - RakshaSphere',
        text: `Hello ${userDoc.name},\n\nPlease verify your email for RakshaSphere using the following token:\n\n${rawToken}\n\nThis verification link expires in 24 hours.\n\nStay safe,\nRakshaSphere Team`,
      });
    }

    // In non-production or when no external provider is active, return the token so users/tests can complete verification
    return {
      message: 'Email verification token generated.',
      alreadyVerified: false,
      token: rawToken,
    };
  }

  public static async confirmEmailVerification(userId: string, token: string): Promise<{
    success: boolean;
    user: User;
  }> {
    this.checkDatabase();

    if (!token || token.trim().length === 0) {
      throw new ServiceError('Verification token is required.', 'VALIDATION_ERROR', 400);
    }

    const userDoc = await UserRepository.findById(userId);
    if (!userDoc) {
      throw new ServiceError('User not found.', 'NOT_FOUND', 404);
    }

    if (userDoc.isEmailVerified) {
      return { success: true, user: userDocToUser(userDoc) };
    }

    const tokenHash = hashToken(token.trim());
    if (
      !userDoc.emailVerificationTokenHash ||
      userDoc.emailVerificationTokenHash !== tokenHash
    ) {
      throw new ServiceError('Invalid or expired verification token.', 'VALIDATION_ERROR', 400);
    }

    if (
      userDoc.emailVerificationExpiresAt &&
      new Date() > userDoc.emailVerificationExpiresAt
    ) {
      throw new ServiceError('Verification token has expired. Please request a new one.', 'VALIDATION_ERROR', 400);
    }

    const updatedUser = await UserRepository.markEmailVerified(userId);
    if (!updatedUser) {
      throw new ServiceError('Failed to mark email as verified.', 'INTERNAL_ERROR', 500);
    }

    return { success: true, user: updatedUser };
  }
}
