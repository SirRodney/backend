import { Hono } from 'hono'
import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types';
import authEndpoints from './api/auth';
import { withDb } from './middleware/withDb';
import { withKvSessions } from './middleware/withKvSessions';

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  BUCKET: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>()

// Attach Drizzle DB instance to context for all routes
app.use('*', withDb);

// Add KV sessions middleware for authentication routes
app.use('/api/auth/*', withKvSessions);


app.get('/', (c) => c.redirect('/api/'))
app.get('/api/', (c) => c.text('Hello, World!'));
app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.route('/api/auth', authEndpoints);

app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

export default app