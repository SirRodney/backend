import { drizzle } from 'drizzle-orm/d1';
import type { MiddlewareHandler } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';

export const withDb: MiddlewareHandler = async (c, next) => {
  const d1 = c.env.DB as D1Database;
  c.set('db', drizzle(d1));
  await next();
};
