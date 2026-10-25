import { z } from 'zod';

export const analyticsSummaryQuerySchema = z
  .object({
    startDate: z.string().datetime({ message: 'startDate must be a valid ISO 8601 date string' }).optional(),
    endDate: z.string().datetime({ message: 'endDate must be a valid ISO 8601 date string' }).optional(),
    platform: z
      .enum(['INSTAGRAM', 'WHATSAPP', 'TELEGRAM', 'TWITTER_X', 'FACEBOOK', 'SMS', 'EMAIL', 'OTHER'])
      .optional(),
    incidentType: z
      .enum(['HARASSMENT', 'DOXXING', 'IMPERSONATION', 'BLACKMAIL', 'STALKING', 'FINANCIAL_SCAM', 'OTHER'])
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'startDate must be before or equal to endDate',
      path: ['endDate'],
    }
  );

export const mapPointsQuerySchema = z.object({
  fuzzLocation: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((val) => {
      if (val === undefined) return true;
      if (typeof val === 'boolean') return val;
      return val === 'true';
    }),
});
