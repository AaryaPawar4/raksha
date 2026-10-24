import { z } from 'zod';

export const analyzeIncidentSchema = z.object({
  consentToAiProcessing: z.boolean({
    required_error: 'consentToAiProcessing must be specified (true or false)',
    invalid_type_error: 'consentToAiProcessing must be a boolean',
  }),
  consentTimestamp: z
    .string()
    .datetime({ message: 'consentTimestamp must be a valid ISO 8601 string' })
    .optional(),
});
