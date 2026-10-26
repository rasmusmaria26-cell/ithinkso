/**
 * Per-IP rate limiting. Deliberately dependency-free: one limiter, one route,
 * no need for express-rate-limit's surface area.
 *
 * The limit is per IP per hour, counted only on POST /api/check. Search fan-out
 * is additionally capped globally inside the adapters (GitHub 20/min, iTunes
 * 20/min) so N concurrent users cannot trip provider quotas — per-IP limiting
 * alone does not do that.
 *
 * `req.ip` is only the real client IP when `trust proxy` is set correctly; that
 * is configured from env (TRUST_PROXY) in index.ts before this middleware runs.
 */

import type { NextFunction, Request, Response } from "express";

type Bucket = { count: number; resetAt: number };

export type RateLimiterOptions = {
  max: number;
  windowMs: number;
  /** Injectable clock so tests do not sleep. */
  now?: () => number;
};

export function createRateLimiter(options: RateLimiterOptions) {
  const { max, windowMs, now = Date.now } = options;
  const buckets = new Map<string, Bucket>();

  // Sweep periodically rather than on every request, capped so a long-running
  // process cannot grow the map without bound.
  const sweeper = setInterval(() => {
    const t = now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= t) buckets.delete(key);
    }
  }, Math.min(windowMs, 60_000));
  sweeper.unref?.();

  return function rateLimit(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const t = now();
    const existing = buckets.get(ip);

    if (!existing || existing.resetAt <= t) {
      buckets.set(ip, { count: 1, resetAt: t + windowMs });
      next();
      return;
    }

    if (existing.count >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - t) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({
        error: "rate_limited",
        message: "You've filed enough cases today. Come back later.",
        retry_after_seconds: retryAfterSec,
      });
      return;
    }

    existing.count += 1;
    next();
  };
}
