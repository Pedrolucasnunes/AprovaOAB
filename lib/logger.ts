import * as Sentry from "@sentry/nextjs"

export interface LogContext {
  area: string
  userId?: string
  [key: string]: unknown
}

/**
 * Loga exceção em Sentry + console com contexto estruturado.
 * Use em catch outer de rotas API e em silent fails de libs.
 */
export function logError(err: unknown, context: LogContext): void {
  const { area, userId, ...extra } = context

  Sentry.captureException(err, {
    tags: { area, ...(userId ? { user_id: userId } : {}) },
    extra,
  })

  const msg = err instanceof Error ? err.message : String(err)
  console.error(`[${area}]`, msg, extra)
}

/**
 * Loga warning estruturado (sem Sentry exception, só breadcrumb + console).
 * Use pra situações esperadas mas indesejadas (fail-open, fallback, etc).
 */
export function logWarning(message: string, context: LogContext): void {
  const { area, ...extra } = context

  Sentry.addBreadcrumb({
    category: area,
    message,
    level: "warning",
    data: extra,
  })

  console.warn(`[${area}]`, message, extra)
}
