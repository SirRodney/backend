import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';

export function getDb(d1: D1Database) {
    return drizzle(d1);
}

export const tenants = sqliteTable('tenants', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
});

export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull().unique(),
    password_hash: text('password_hash').notNull(),
    role: text('role').notNull(),
    tenant_id: integer('tenant_id')
        .notNull()
        .references(() => tenants.id, { onDelete: 'cascade' }),
});

export const projects = sqliteTable('projects', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    tenant_id: integer('tenant_id')
        .notNull()
        .references(() => tenants.id, { onDelete: 'cascade' }),
    owner_user_id: integer('owner_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
});

export const tasks = sqliteTable('tasks', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    status: text('status').notNull(),
    project_id: integer('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade' }),
    assignee_user_id: integer('assignee_user_id')
        .references(() => users.id, { onDelete: 'set null' }),
});

export const attachments = sqliteTable('attachments', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    filename: text('filename').notNull(),
    url_r2: text('url_r2').notNull(),
    task_id: integer('task_id')
        .notNull()
        .references(() => tasks.id, { onDelete: 'cascade' }),
});