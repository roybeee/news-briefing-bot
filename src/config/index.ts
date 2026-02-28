import { z } from 'zod'

const envSchema = z.object({
  NAVER_CLIENT_ID: z.string().min(1),
  NAVER_CLIENT_SECRET: z.string().min(1),
  NEWSDATA_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  CF_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().default('news-briefing'),
  R2_PUBLIC_BASE_URL: z.string().min(1),
  KAKAO_REST_API_KEY: z.string().min(1),
  KAKAO_REFRESH_TOKEN: z.string().min(1),
  KAKAO_REDIRECT_URI: z.string().default('https://localhost'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DRY_RUN: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  MAX_ARTICLES_PER_KEYWORD: z
    .string()
    .default('10')
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(100)),
})

export type AppConfig = z.infer<typeof envSchema>

export function loadConfig(): AppConfig {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Environment variable validation failed:\n${missing}`)
  }

  return result.data
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

export function createLogger(configLevel: LogLevel) {
  const threshold = LOG_LEVELS[configLevel]

  return {
    debug: (phase: string, message: string, data?: Record<string, unknown>) => {
      if (threshold <= LOG_LEVELS.debug) {
        console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'debug', phase, message, ...data }))
      }
    },
    info: (phase: string, message: string, data?: Record<string, unknown>) => {
      if (threshold <= LOG_LEVELS.info) {
        console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', phase, message, ...data }))
      }
    },
    warn: (phase: string, message: string, data?: Record<string, unknown>) => {
      if (threshold <= LOG_LEVELS.warn) {
        console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'warn', phase, message, ...data }))
      }
    },
    error: (phase: string, message: string, data?: Record<string, unknown>) => {
      if (threshold <= LOG_LEVELS.error) {
        console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', phase, message, ...data }))
      }
    },
  }
}

export type Logger = ReturnType<typeof createLogger>
