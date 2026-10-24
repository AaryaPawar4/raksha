import { z } from 'zod';

const incidentTypes = [
  'HARASSMENT',
  'DOXXING',
  'IMPERSONATION',
  'BLACKMAIL',
  'STALKING',
  'FINANCIAL_SCAM',
  'OTHER',
] as const;

const platformTypes = [
  'INSTAGRAM',
  'WHATSAPP',
  'TELEGRAM',
  'TWITTER_X',
  'FACEBOOK',
  'SMS',
  'EMAIL',
  'OTHER',
] as const;

const identifierTypes = ['USERNAME', 'PHONE', 'EMAIL', 'URL', 'OTHER'] as const;

export const createIncidentSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters long')
    .max(120, 'Title cannot exceed 120 characters'),
  incidentType: z.enum(incidentTypes, {
    required_error: 'Incident category is required',
    invalid_type_error: 'Invalid incident category',
  }),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(5, 'Description must be at least 5 characters long')
    .max(2000, 'Description cannot exceed 2000 characters'),
  occurredAt: z
    .string()
    .datetime({ message: 'occurredAt must be a valid ISO 8601 date string' })
    .optional(),
  platform: z.enum(platformTypes, {
    required_error: 'Platform is required',
    invalid_type_error: 'Invalid platform selection',
  }),
  identifiers: z
    .array(
      z.object({
        type: z.enum(identifierTypes),
        value: z.string().trim().min(1, 'Identifier value cannot be empty').max(256),
      })
    )
    .optional()
    .default([]),
});

export const incidentListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => !isNaN(val) && val > 0, { message: 'page must be a positive integer' }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 50, {
      message: 'limit must be between 1 and 50',
    }),
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ARCHIVED']).optional(),
  incidentType: z.enum(incidentTypes).optional(),
});
