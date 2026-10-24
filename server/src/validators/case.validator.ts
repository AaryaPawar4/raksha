import { z } from 'zod';

export const caseStatusSchema = z.enum([
  'REPORTED',
  'UNDER_REVIEW',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
]);

export const createCaseSchema = z.object({
  incidentId: z.string().min(1, 'Incident ID is required'),
  reportingChannel: z
    .string()
    .min(2, 'Reporting channel is required')
    .max(255)
    .trim(),
  referenceNumber: z
    .string()
    .min(1, 'Reference number / acknowledgment ID is required')
    .max(100)
    .trim(),
  status: caseStatusSchema.optional().default('REPORTED'),
  followUpAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateCaseSchema = z.object({
  reportingChannel: z.string().min(2).max(255).trim().optional(),
  referenceNumber: z.string().min(1).max(100).trim().optional(),
  status: caseStatusSchema.optional(),
  followUpAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).trim().optional(),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
