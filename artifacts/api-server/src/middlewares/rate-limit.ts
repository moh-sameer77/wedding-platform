import type { NextFunction, Request, Response } from "express";

type RateBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  id: string;
  max: number;
  windowMs: number;
  key?: (req: Request) => string;
  skip?: (req: Request) => boolean;
};

const buckets = new Map<string, RateBucket>();

function defaultKey(req: Request): string {
  const auth = req.headers.authorization?.slice(0, 96) ?? "";
  return `${req.ip}|${auth}|${req.method}|${req.baseUrl}${req.path}`;
}

function sweepExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function createRateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (options.skip?.(req)) {
      next();
      return;
    }

    const now = Date.now();
    if (buckets.size > 5000) sweepExpired(now);

    const identity = (options.key ?? defaultKey)(req);
    const bucketKey = `${options.id}:${identity}`;
    const current = buckets.get(bucketKey);

    if (!current || current.resetAt <= now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + options.windowMs });
      res.setHeader("X-RateLimit-Limit", String(options.max));
      res.setHeader("X-RateLimit-Remaining", String(options.max - 1));
      next();
      return;
    }

    if (current.count >= options.max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
      );
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.setHeader("X-RateLimit-Limit", String(options.max));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.status(429).json({
        error: "Too many requests. Please slow down and try again shortly.",
      });
      return;
    }

    current.count += 1;
    res.setHeader("X-RateLimit-Limit", String(options.max));
    res.setHeader("X-RateLimit-Remaining", String(options.max - current.count));
    next();
  };
}
