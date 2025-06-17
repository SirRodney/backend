import { MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';

const ALLOWED_ORIGINS = [
  'http://localhost:8787', // Local development backend
  'https://prueba-backend-multitenant.luis-leivag23.workers.dev', // Production backend
];

/**
 * Checks if an origin is in the whitelist
 * @param origin Origin to check
 * @returns Boolean indicating if the origin is allowed
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}


export const corsPolicy: MiddlewareHandler = cors({
  origin: (origin) => {
    if (isOriginAllowed(origin)) {
      return origin;
    }
    return ALLOWED_ORIGINS[0];
  },
  credentials: true,
  maxAge: 3600,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Requested-With',
  ],
  exposeHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Retry-After',
  ],
});
