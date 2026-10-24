import { z } from 'zod';

export const encryptionMetadataSchema = z.object({
  algorithm: z.literal('AES-GCM'),
  keyDerivation: z.literal('PBKDF2'),
  pbkdf2Iterations: z.number().int().min(10000),
  ivHex: z.string().min(24).max(32).regex(/^[a-f0-9]+$/i, 'IV must be hexadecimal'),
  saltHex: z.string().min(32).max(64).regex(/^[a-f0-9]+$/i, 'Salt must be hexadecimal'),
  version: z.literal('1.0'),
});

export const uploadEvidenceSchema = z.object({
  incidentId: z.string().min(1, 'Incident ID is required'),
  filename: z.string().min(1, 'Filename is required').max(255),
  mimeType: z.enum([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
  ]),
  size: z.number().int().positive().max(10 * 1024 * 1024, 'File size must not exceed 10MB'),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i, 'SHA-256 digest must be a 64-character hexadecimal string'),
  ciphertextBase64: z.string().min(1, 'Ciphertext is required'),
  encryptionMetadata: encryptionMetadataSchema,
  userEnteredCaptureTime: z.string().datetime().optional(),
});

export type UploadEvidenceInput = z.infer<typeof uploadEvidenceSchema>;
