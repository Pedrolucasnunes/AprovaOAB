import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextRequest } from "next/server"
import { createHash } from "node:crypto"
import { logWarning } from "@/lib/logger"

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null

const isProd = process.env.NODE_ENV === "production"

const limiters = new Map<string, Ratelimit>()

function getLimiter(prefix: string, requests: number, windowSeconds: number): Ratelimit | null {
  if (!redis) return null
  const key = `${prefix}:${requests}:${windowSeconds}`
  let limiter = limiters.get(key)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
      analytics: false,
      prefix,
    })
    limiters.set(key, limiter)
  }
  return limiter
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}

export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16)
}

/**
 * Aplica rate limit por IP (e opcionalmente por uma chave extra, ex: hash de email).
 * Dev local sem Upstash: fail-open. Prod sem Upstash ou com erro de conexão: fail-closed,
 * pra evitar bruteforce de login durante outage do Upstash.
 */
export async function rateLimit(
  req: NextRequest,
  prefix: string,
  requests: number,
  windowSeconds: number,
  keyExtra?: string,
): Promise<{ success: boolean; remaining: number }> {
  const limiter = getLimiter(prefix, requests, windowSeconds)
  if (!limiter) {
    if (isProd) {
      logWarning("rate-limit não configurado em prod, falhando fechado", {
        area: "rate-limit",
        prefix,
      })
      return { success: false, remaining: 0 }
    }
    return { success: true, remaining: requests }
  }

  const ip = getClientIp(req)
  const key = keyExtra ? `${ip}:${keyExtra}` : ip
  try {
    const result = await limiter.limit(key)
    return { success: result.success, remaining: result.remaining }
  } catch (err) {
    logWarning(
      isProd ? "upstash unavailable, failing closed" : "upstash unavailable, failing open",
      {
        area: "rate-limit",
        prefix,
        err: err instanceof Error ? err.message : String(err),
      },
    )
    return { success: !isProd, remaining: isProd ? 0 : requests }
  }
}
