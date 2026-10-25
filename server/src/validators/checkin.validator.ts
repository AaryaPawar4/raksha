import { z } from 'zod';

export const createContactSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name cannot exceed 100 characters'),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone cannot exceed 30 characters')
    .optional(),
  email: z
    .string()
    .trim()
    .email('Invalid email format')
    .max(200, 'Email cannot exceed 200 characters')
    .optional(),
});

export const updateContactSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name cannot be empty')
      .max(100, 'Name cannot exceed 100 characters')
      .optional(),
    phone: z
      .string()
      .trim()
      .max(30, 'Phone cannot exceed 30 characters')
      .optional(),
    email: z
      .string()
      .trim()
      .email('Invalid email format')
      .max(200, 'Email cannot exceed 200 characters')
      .optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined || data.phone !== undefined || data.email !== undefined,
    { message: 'At least one field (name, phone, or email) must be provided' }
  );

export const updateConsentSchema = z.object({
  consentStatus: z.enum(['CONSENTED', 'DECLINED'], {
    required_error: 'consentStatus is required',
    invalid_type_error: 'consentStatus must be CONSENTED or DECLINED',
  }),
});

export const createCheckInSchema = z.object({
  contactId: z
    .string({ required_error: 'contactId is required' })
    .min(1, 'contactId cannot be empty'),
  message: z
    .string({ required_error: 'message is required' })
    .trim()
    .min(1, 'message cannot be empty')
    .max(2000, 'message cannot exceed 2000 characters'),
  locationSharingEnabled: z
    .boolean({ required_error: 'locationSharingEnabled is required' })
    .default(false),
  latitudeSnapshot: z
    .number()
    .min(-90, 'latitude must be between -90 and 90')
    .max(90, 'latitude must be between -90 and 90')
    .optional(),
  longitudeSnapshot: z
    .number()
    .min(-180, 'longitude must be between -180 and 180')
    .max(180, 'longitude must be between -180 and 180')
    .optional(),
  dueAt: z
    .string()
    .datetime({ message: 'dueAt must be a valid ISO 8601 datetime string' })
    .refine(
      (val) => new Date(val) > new Date(),
      { message: 'dueAt must be in the future' }
    )
    .optional(),
});

export const sendEmailCheckInSchema = z
  .object({
    recipientType: z.enum(['SELF', 'TRUSTED_CONTACT'], {
      required_error: 'recipientType is required',
      invalid_type_error: "recipientType must be 'SELF' or 'TRUSTED_CONTACT'",
    }),
    contactId: z.string().trim().optional(),
    message: z
      .string({ required_error: 'message is required' })
      .trim()
      .min(1, 'message cannot be empty')
      .max(1000, 'message cannot exceed 1000 characters'),
    clientNonce: z.string().trim().max(100).optional(),
  })
  .refine(
    (data) => {
      if (data.recipientType === 'TRUSTED_CONTACT') {
        return Boolean(data.contactId && data.contactId.length > 0);
      }
      return true;
    },
    {
      message: 'contactId is required when recipientType is TRUSTED_CONTACT',
      path: ['contactId'],
    }
  );

