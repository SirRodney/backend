import { MiddlewareHandler } from 'hono';
import type { KVNamespace } from '@cloudflare/workers-types';

interface Env {
  DB: any;
  KV: KVNamespace;
  BUCKET: any;
}

// Type for the rate limit bucket stored in KV
interface RateLimitBucket {
  count: number;
  resetTime: number;
}

/**
 * Generic rate limiting function, applies rate limiting based on a key (API key or IP address).
 * It checks the current count against the limit and resets the bucket if the time window has expired.
 * If the limit is exceeded, it returns a 429 response with appropriate headers.
 */
async function applyRateLimit(
  c: any,
  next: () => Promise<void>,
  key: string,
  windowMs: number,
  limit: number,
  errorMessage: string
): Promise<Response | undefined> {
  const now = Date.now();
  let bucket: RateLimitBucket;

  try {
    const storedData = await c.env.KV.get(key, 'json') as RateLimitBucket | null;
    bucket = storedData || { count: 0, resetTime: now + windowMs };

    // If bucket is expired, reset it
    if (bucket.resetTime <= now) {
      bucket = { count: 0, resetTime: now + windowMs };
    }

    bucket.count++;

    await c.env.KV.put(key, JSON.stringify(bucket), {
      expirationTtl: Math.ceil(windowMs / 1000)
    });

    if (bucket.count > limit) {
      c.header('X-RateLimit-Limit', limit.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', Math.ceil(bucket.resetTime / 1000).toString());
      c.header('Retry-After', Math.ceil((bucket.resetTime - now) / 1000).toString());
      return c.json({
        success: false,
        message: errorMessage
      }, 429);
    }
    c.header('X-RateLimit-Limit', limit.toString());
    c.header('X-RateLimit-Remaining', (limit - bucket.count).toString());
    c.header('X-RateLimit-Reset', Math.ceil(bucket.resetTime / 1000).toString());

    await next();
    return undefined;
  } catch (error) {
    console.error('Rate limiting error:', error);
    await next();
    return undefined;
  }
}

/**
 * Combined rate limiting middleware that applies:
 * 1. API-Key rate limiting: 1,000 requests per day (if X-API-Key header is present)
 * 2. IP-based rate limiting: 60 requests per minute
 */
export const rateLimit: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const apiKey = c.req.header('X-API-Key');

  if (apiKey) {
    // If API key is provided, apply API key rate limiting
    const key = `apikey-rate-limit:${apiKey}`;
    const windowMs = 24 * 60 * 60 * 1000; // 24 hour window
    const limit = 1000; // 1,000 requests per day
    const errorMessage = 'API key rate limit exceeded. Daily limit is 1,000 requests.';

    return applyRateLimit(c, next, key, windowMs, limit, errorMessage);
  } else {
    // Otherwise apply IP-based rate limiting
    const ip = c.req.header('CF-Connecting-IP') ||
               c.req.header('x-forwarded-for') ||
               'unknown-ip';

    const key = `ip-rate-limit:${ip}`;
    const windowMs = 60 * 1000; // 1 minute window
    const limit = 60; // 60
    const errorMessage = 'Too many requests. Please try again in a minute.';

    return applyRateLimit(c, next, key, windowMs, limit, errorMessage);
  }
};