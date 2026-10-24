import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val < 65536, {
      message: 'PORT must be a valid port number (1-65535)',
    }),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().optional(),
  AI_PROVIDER_API_KEY: z.string().optional(),
  AI_PROVIDER_MODEL: z.string().default('gemini-1.5-flash'),
  JWT_ACCESS_SECRET: z.string().default('dev-jwt-access-secret-minimum-32-chars-key-for-local'),
  JWT_REFRESH_SECRET: z.string().default('dev-jwt-refresh-secret-minimum-32-chars-key-for-local'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  RATE_LIMIT_GLOBAL_MAX: z
    .string()
    .default('300')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_AUTH_MAX: z
    .string()
    .default('15')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_ANALYSIS_MAX: z
    .string()
    .default('20')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_UPLOAD_MAX: z
    .string()
    .default('30')
    .transform((val) => parseInt(val, 10)),
  TRUST_PROXY: z.string().default('false'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let validatedEnv: EnvConfig;

try {
  validatedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables configuration:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    console.error('❌ Failed to parse environment variables:', error);
  }
  process.exit(1);
}

export const env = validatedEnv;
