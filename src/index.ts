import { Hono } from 'hono'
import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  BUCKET: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>()

app.get('/api/', (c) => c.text('Hello, World!'));
app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

export default app