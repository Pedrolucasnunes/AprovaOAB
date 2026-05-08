import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextRequest } from "next/server"
import { createHash } from "node:crypto"

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null

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
 * Em ambientes sem Upstash configurado, retorna `success: true` (fail-open) — necessário
 * para dev local sem credenciais.
 */
export async function rateLimit(
  req: NextRequest,
  prefix: string,
  requests: number,
  windowSeconds: number,
  keyExtra?: string,
): Promise<{ success: boolean; remaining: number }> {
  const limiter = getLimiter(prefix, requests, windowSeconds)
  if (!limiter) return { success: true, remaining: requests }

  const ip = getClientIp(req)
  const key = keyExtra ? `${ip}:${keyExtra}` : ip
  try {
    const result = await limiter.limit(key)
    return { success: result.success, remaining: result.remaining }
  } catch (err) {
    console.error("[rate-limit] upstash error, failing open:", err)
    return { success: true, remaining: requests }
  }
}
