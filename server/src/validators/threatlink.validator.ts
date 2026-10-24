import { z } from 'zod';

export const threatLinkFeedbackSchema = z.object({
  disposition: z.enum(['RELEVANT', 'NOT_RELATED', 'UNSURE'], {
    required_error: 'Disposition is required',
    invalid_type_error: 'Disposition must be RELEVANT, NOT_RELATED, or UNSURE',
  }),
});
