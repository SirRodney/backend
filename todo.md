# TODO List for Deliverables (from README.md)

## 1. Project Setup
- [x] Create a GitHub repository and branch
- [x] Set up Node.js (>=18), Wrangler CLI (3.x), and Cloudflare account
- [x] Configure wrangler.toml/jsonc with D1, KV, (optional R2), and environment variables
- [x] Set up Drizzle ORM and Drizzle Kit
- [x] Set up Hono framework

## 2. Data Model & Migrations
- [x] Define tables: tenants, users, projects, tasks, (optional: attachments)
- [x] Ensure all tables are scoped by tenant_id
- [x] Generate migrations with Drizzle Kit
- [x] Add npm script: `db:seed` to insert example data (admin@acme.com / Passw0rd! in a sample tenant)

## 3. Authentication & Authorization
- [x] Implement POST /auth/login (returns JWT + Refresh-Token)
- [x] Implement POST /auth/refresh (returns new Access-Token)
- [x] Implement POST /auth/logout (revokes Refresh-Token)
- [ ] Store refresh tokens in Workers KV (kv_sessions)
- [ ] Implement verifyJWT middleware (injects user into context)
- [ ] Implement authorize(role[]) middleware (checks user role and tenant_id)

## 4. Protected API Endpoints
- [ ] GET /projects (admin, member, viewer)
- [ ] POST /projects (admin, member)
- [ ] CRUD /projects/:id/tasks (role-based, Zod validation)
- [ ] Ensure all SELECTs filter by tenant_id

## 5. Security & Best Practices
- [ ] Rate-limit by IP: 60 req/min (using @hono/ratelimit + KV)
- [ ] Rate-limit by API-Key: 1,000 req/day (header X-API-Key)
- [ ] Strict CORS (whitelist Origin)
- [ ] Validate schemas with Zod (body, params, query)

## 6. Deployment
- [ ] Deploy with wrangler deploy
- [ ] Verify public URL is operational

## 7. Documentation & Presentation
- [ ] Add instructions for testing API (headers, seed credentials, etc.)
- [ ] Open Pull Request with observations, production URL, and improvements
- [ ] List any missing features or limitations

---

*This list is auto-generated from the README deliverables. Check off items as you complete them!*
