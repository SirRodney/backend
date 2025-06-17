import { Hono } from 'hono'
import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types';
import authEndpoints from './api/auth';
import projectsEndpoints from './api/projects';
import tasksEndpoints from './api/tasks';
import { withDb } from './middleware/withDb';
import { withKvSessions } from './middleware/withKvSessions';
import { verifyJWT } from './middleware/verifyJWT';
import { rateLimit } from './middleware/rateLimit';
import { corsPolicy } from './middleware/corsPolicy';

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  BUCKET: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>()

// Apply strict CORS policy to all routes
app.use('*', corsPolicy);

// Apply rate limiting to all API endpoints
app.use('/api/*', rateLimit);

// Attach Drizzle DB instance to context for all routes
app.use('*', withDb);

app.use('/api/auth/*', withKvSessions);

app.use('/api/projects/*', withKvSessions, verifyJWT);

app.get('/', (c) => c.redirect('/api/'))
app.get('/api/', (c) => c.text('Hello, World!'));
app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.route('/api/auth/', authEndpoints);
app.route('/api/projects/', projectsEndpoints);
app.route('/api/projects/', tasksEndpoints);

app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

export default app