import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  JWT_ACCESS_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().default(30),

  FLOW_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  FLOW_API_KEY: z.string().min(1),
  FLOW_SECRET_KEY: z.string().min(1),
  FLOW_API_URL: z.string().url().default('https://sandbox.flow.cl/api'),
  FLOW_PLAN_ID: z.string().optional(),
  BILLING_WEBHOOK_URL: z.string().url(),
  BILLING_RETURN_URL: z.string().url(),

  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_TTS_MODEL: z.string().default('tts-1'),
  OPENAI_TTS_VOICE: z.string().default('nova'),
  FREE_MONTHLY_AI_LIMIT: z.coerce.number().default(50),
  AUDIO_CACHE_TTL_DAYS: z.coerce.number().default(90),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuración de entorno inválida:\n${issues}`);
  }
  return result.data;
}
