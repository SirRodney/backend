import { KVNamespace } from '@cloudflare/workers-types';

export const createKvSessions = (kvNamespace: KVNamespace) => {
    return {
        async set(token: string, session: { userId: number; exp: number } | any) {
            const ttl = session.exp - Math.floor(Date.now() / 1000);

            let sessionData = session;
            try {
                sessionData = JSON.stringify(session);
            } catch (e) {
                console.error("Error stringifying session data:", e);
            }

            await kvNamespace.put(token, sessionData, { expirationTtl: ttl });
        },
        async get(token: string) {
            const data = await kvNamespace.get(token);
            if (!data) return null;

            try {
                return JSON.parse(data);
            } catch (error) {
                console.error("Error parsing session data:", error);
                return data;
            }
        },
        async delete(token: string) {
            await kvNamespace.delete(token);
        }
    };
};