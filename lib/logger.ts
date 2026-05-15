import * as Sentry from "@sentry/nextjs"

export interface LogContext {
  area: string
  userId?: string
  [key: string]: unknown
}

const SENSITIVE_KEYS = new Set([
  "email",
  "password",
  "token",
  "access_token",
  "refresh_token",
  "secret",
  "api_key",
  "apikey",
  "card",
  "cvv",
  "cvc",
  "amount",
  "stripe_secret",
  "service_role_key",
])

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : v
  }
  return result
}

/**
 * Loga exceção em Sentry + console com contexto estruturado.
 * Use em catch outer de rotas API e em silent fails de libs.
 */
export function logError(err: unknown, context: LogContext): void {
  const { area, userId, ...extra } = context
  const safeExtra = redact(extra)

  Sentry.captureException(err, {
    tags: { area, ...(userId ? { user_id: userId } : {}) },
    extra: safeExtra,
  })

  const msg = err instanceof Error ? err.message : String(err)
  console.error(`[${area}]`, msg, safeExtra)
}

/**
 * Loga warning estruturado (sem Sentry exception, só breadcrumb + console).
 * Use pra situações esperadas mas indesejadas (fail-open, fallback, etc).
 */
export function logWarning(message: string, context: LogContext): void {
  const { area, ...extra } = context
  const safeExtra = redact(extra)

  Sentry.addBreadcrumb({
    category: area,
    message,
    level: "warning",
    data: safeExtra,
  })

  console.warn(`[${area}]`, message, safeExtra)
}
