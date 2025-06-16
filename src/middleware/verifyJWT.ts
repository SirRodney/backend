import { MiddlewareHandler } from 'hono';
import { jwtVerify } from 'jose';
import { findUserBySessionId } from '../utils/user';

export const verifyJWT: MiddlewareHandler = async (c, next) => {
  const JWT_SECRET = c.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not set in environment variables');
    return c.json({ message: 'Server configuration error' }, 500);
  }

  let auth: string | undefined;
  try {
    auth = c.req.header('authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return c.json({ message: 'Missing or invalid Authorization header' }, 401);
    }
  } catch (e) {
    return c.json({ message: 'Error reading Authorization header' }, 401);
  }

  const token = auth.slice(7);
  let payload: any;
  try {
    const result = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    payload = result.payload;
  } catch (e) {
    return c.json({ message: 'Invalid or expired token' }, 401);
  }
  try {
    if (!payload) {
      return c.json({ message: 'Token payload is missing' }, 401);
    }
    if (!payload.userId) {
      return c.json({ message: 'Token payload missing userId' }, 401);
    }
    const user = await findUserBySessionId(c, payload.userId);
    if (!user) {
      return c.json({ message: 'User not found' }, 401);
    }
    c.set('user', {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
    });
    await next();
  } catch (e) {
    console.error('Error in verifyJWT middleware:', e);
    return c.json({ message: 'Error processing authentication' }, 401);
  }
};
