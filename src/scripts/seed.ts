import { getDb, users, tenants } from '../db/schema';
import { D1Database as CloudflareD1Database } from '@cloudflare/workers-types';
import bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';

const db = (c: any = { env: { DB: process.env.DB } }) => getDb(c.env.DB as CloudflareD1Database);

async function seed() {
    const database = db();
    console.log('Seeding database...');
    const [tenant] = await database
        .select()
        .from(tenants)
        .where(eq(tenants.name, 'Acme Corp'));
    console.log('Found tenant:', tenant?.name ?? 'none, creating one...');

    const tenantId = tenant?.id ?? (
        await database.insert(tenants).values({ name: 'Acme Corp' }).returning()
    )[0].id;
    console.log('Using tenant ID:', tenantId);

    // Ensure admin user exists
    const email = 'admin@acme.com';
    const passwordHash = bcrypt.hashSync('!Admin1234', 10);

    const [user] = await database
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.tenant_id, tenantId)));

    console.log('Found user:', user?.email ?? 'none, creating one...');

    if (!user) {
        await database.insert(users).values({
            email,
            password_hash: passwordHash,
            role: 'admin',
            tenant_id: tenantId,
        });
        console.log('Created admin user:', email);
    } else {
        console.log('Admin user already exists:', email);
    }

    console.log('Seed complete!');
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
