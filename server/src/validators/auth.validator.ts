import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address format')
    .max(254, 'Email cannot exceed 254 characters'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name cannot exceed 100 characters'),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address format'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});
