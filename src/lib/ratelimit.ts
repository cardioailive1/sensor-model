/**
 * Rate Limiting & Security Middleware
 *
 * Compliance: SOC 2 CC6.6, CC6.8 / OWASP API Security Top 10
 * Strategy: sliding window per IP + per API key
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";

interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

// In-memory store — replace with Redis (Upstash) for multi-instance deploys
const store = new Map<string, { count: number; resetAt: number }>();

function getKey(req: NextRequest, prefix: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const apiKey = req.headers.get("x-api-key") ?? "";
  return `${prefix}:${apiKey || ip}`;
}

export function rateLimit(config: RateLimitConfig) {
  return (req: NextRequest): { allowed: boolean; remaining: number; resetAt: number } => {
    const key = getKey(req, config.keyPrefix);
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + config.windowMs });
      return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowMs };
    }

    if (entry.count >= config.max) {
      logger.warn({ key, count: entry.count }, "Rate limit exceeded");
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
  };
}

// Pre-configured limiters
export const apiLimiter = rateLimit({ windowMs: 60_000, max: 100, keyPrefix: "api" });
export const authLimiter = rateLimit({ windowMs: 900_000, max: 10, keyPrefix: "auth" }); // 10 attempts per 15 min
export const predictLimiter = rateLimit({ windowMs: 60_000, max: 300, keyPrefix: "predict" });

export function rateLimitResponse(resetAt: number): NextResponse {
  return NextResponse.json(
    {
      error: "Too Many Requests",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.floor(resetAt / 1000)),
      },
    }
  );
}
