import { SignJWT } from 'jose';
import { nanoid } from 'nanoid';

const ACCESS_TOKEN_EXP = 60 * 15; // 15 min
const REFRESH_TOKEN_EXP = 60 * 60 * 24 * 7; // 7 days

export async function generateAccessToken(c: any, user: any) {
    const JWT_SECRET = c.env.JWT_SECRET;
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not set in environment variables');
    }

    const payload = { userId: user.id, role: user.role, tenant_id: user.tenant_id };
    const exp = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXP;
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setExpirationTime(exp)
        .sign(new TextEncoder().encode(JWT_SECRET));
}

export function generateRefreshToken(c: any, user: any) {
    const sessions = c.get('sessions');
    const token = nanoid(64);
    const exp = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXP;
    sessions.set(token, { userId: user.id, exp });
    return token;
}

export async function validateRefreshToken(c: any, token: string) {
    const sessions = c.get('sessions');
    const session = await sessions.get(token);
    if (!session) return null;
    // Check if token is expired
    if (session.exp < Math.floor(Date.now() / 1000)) {
        await sessions.delete(token);
        return null;
    }
    return session;
}

export async function revokeRefreshToken(c: any, token: string): Promise<boolean> {
    const sessions = c.get('sessions');
    try {
        await sessions.delete(token);
        return true;
    } catch (error) {
        return false;
    }
}
