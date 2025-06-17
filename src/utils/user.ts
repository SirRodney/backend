import { eq } from "drizzle-orm";
import { users } from '../db/schema';
import bcrypt from 'bcryptjs';

export async function findUserByEmail(c: any, email: string) {
    try {
        return await c.get('db').select().from(users).where(eq(users.email, email)).get();
    } catch (error) {
        console.error('Error in findUserByEmail:', error);
        throw error;
    }
}
export async function createNewUser(c: any, email: string, password: string, role: string, tenantId: number) {
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = await c.get('db').insert(users).values({
      email,
      password_hash: hashedPassword,
      role,
      tenant_id: tenantId
    }).returning();
    return newUser[0];
  } catch (error) {
    console.error('Error in createNewUser:', error);
    throw error;
  }
}

export async function findUserBySessionId(c: any, userId: number) {
    try {
        return await c.get('db').select().from(users).where(eq(users.id, userId)).get();
    } catch (error) {
        console.error('Error in findUserBySessionId:', error);
        throw error;
    }
}

export function verifyPassword(user: any, password: string): boolean {
    try {
        return bcrypt.compareSync(password, user.password_hash);
    } catch (error) {
        console.error('Error in verifyPassword:', error);
        return false;
    }
}