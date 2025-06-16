import { SignJWT } from 'jose';
import { nanoid } from 'nanoid';
import { createKvSessions } from './kv_sessions';

const kv_sessions = createKvSessions(process.env.KV_ID as any);

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in environment variables');
}

const ACCESS_TOKEN_EXP = 60 * 15; // 15 min
const REFRESH_TOKEN_EXP = 60 * 60 * 24 * 7; // 7 days

export async function generateAccessToken(user: any) {
    const payload = { userId: user.id, role: user.role, tenant_id: user.tenant_id };
    const exp = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXP;
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setExpirationTime(exp)
        .sign(new TextEncoder().encode(JWT_SECRET));
}

export function generateRefreshToken(user: any) {
    const token = nanoid(64);
    const exp = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXP;
    kv_sessions.set(token, { userId: user.id, exp });
    return token;
}

export async function validateRefreshToken(token: string) {
    const session = await kv_sessions.get(token);
    if (!session) return null;
    if (session.exp < Math.floor(Date.now() / 1000)) {
        await kv_sessions.delete(token);
        return null;
    }
    return session;
}

export async function revokeRefreshToken(token: string) {
    await kv_sessions.delete(token);
}