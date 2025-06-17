import { MiddlewareHandler } from 'hono';
import { KVNamespace } from '@cloudflare/workers-types';
import { createKvSessions } from '../utils/kv_sessions';

export const withKvSessions: MiddlewareHandler = async (c, next) => {
  const kv = c.env.KV as KVNamespace;
  c.set('sessions', createKvSessions(kv));
  await next();
};
