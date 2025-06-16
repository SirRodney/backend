import { Hono } from 'hono';
import { createKvSessions } from '../utils/kv_sessions';
import { generateAccessToken, generateRefreshToken, validateRefreshToken } from '../utils/jwt';
import { findUserByEmail, createNewUser, findUserBySessionId, verifyPassword } from '../utils/user';

const app = new Hono();

const kv_sessions = createKvSessions(process.env.KV_ID as any);

app.post('/register', async (c) => {
    try {
        const { email, password, role, tenantId } = await c.req.json();
        const existingUser = await findUserByEmail(c, email);
        if (existingUser) {
            return c.json({ error: 'User already exists' }, 409);
        }
        const user = await createNewUser(c, email, password, role, tenantId);
        return c.json({ userId: user.id }, 201);
    } catch (error) {
        console.error('Error in /register:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

app.post('/login', async (c) => {
    try {
        const { email, password } = await c.req.json();
        const user = await findUserByEmail(c, email);
        if (!user || !verifyPassword(user, password)) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }
        const accessToken = await generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        return c.json({ accessToken, refreshToken });
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500);
    }
});

app.post('/refresh', async (c) => {
    try {
        const { refreshToken } = await c.req.json();
        if (!refreshToken) {
            return c.json({ error: 'Refresh token is required' }, 400);
        }
        const session = await validateRefreshToken(refreshToken);
        if (!session) {
            return c.json({ error: 'Invalid or expired refresh token' }, 401);
        }
        const user = await findUserBySessionId(c, session.userId);
        if (!user) {
            return c.json({ error: 'User not found' }, 404);
        }
        const accessToken = generateAccessToken(user);
        return c.json({ accessToken });
    } catch (error) {
        console.error('Error in /refresh:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return c.json({
            error: 'Failed to refresh token',
            details: errorMessage
        }, 500);
    }
});

app.post('/logout', async (c) => {
    try {
        const { refreshToken } = await c.req.json();
        await kv_sessions.delete(refreshToken);
        return c.json({ success: true });
    } catch (error) {
        return c.json({ error: 'Internal server error' }, 500);
    }
});

export default app;