/**
 * Hono RBAC Authorization Middleware
 *
 * This middleware enforces role-based access control for multi-tenant applications:
 * - admin: Full control over tenant
 * - member: CRUD tasks + read projects
 * - viewer: Read-only access
 *
 * Prerequisites:
 * - User object must be set in context by verifyJWT middleware
 * - User shape: { id: number, role: string, tenant_id: number }
 */

import { MiddlewareHandler } from 'hono';
import type { Context } from 'hono';

export interface AuthUser {
  id: number;
  role: string;
  tenant_id: number;
  email?: string;
}

export interface AuthorizeOptions {
  checkTenant?: boolean;
  getTenantId?: (c: Context) => number | undefined;
}

/**
 * RBAC middleware for Hono
 * @param allowedRoles Array of allowed roles (e.g., ['admin', 'member', 'viewer'])
 * @param options Options for tenant-based access control
 */
export function authorize(allowedRoles: string[], options?: AuthorizeOptions): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user') as AuthUser | undefined;

    if (!user) {
      return c.json({
        success: false,
        message: 'Unauthorized: Authentication required'
      }, 401);
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json({
        success: false,
        message: `Forbidden: Required role: ${allowedRoles.join(' or ')}`
      }, 403);
    }

    if (user.role === 'admin' || !options?.checkTenant) {
      await next();
      return;
    }

    if (options?.getTenantId) {
      const requestTenantId = options.getTenantId(c);

      if (requestTenantId !== undefined && user.tenant_id !== requestTenantId) {
        return c.json({
          success: false,
          message: 'Forbidden: No access to this tenant'
        }, 403);
      }
    }

    await next();
  };
}

/**
 * Helper to extract tenant ID from path parameters
 * @param paramName Name of the parameter (default: 'tenantId')
 */
export function getTenantFromParam(paramName: string = 'tenantId') {
  return (c: Context): number | undefined => {
    const param = c.req.param(paramName);
    return param ? parseInt(param, 10) : undefined;
  };
}

/**
 * Helper to extract tenant ID from query parameters
 * @param queryName Name of the query parameter (default: 'tenantId')
 */
export function getTenantFromQuery(queryName: string = 'tenantId') {
  return (c: Context): number | undefined => {
    const query = c.req.query(queryName);
    return query ? parseInt(query, 10) : undefined;
  };
}

/**
 * Helper to extract tenant ID from request body
 * @param bodyField Name of the field in the request body (default: 'tenantId')
 */
export function getTenantFromBody(bodyField: string = 'tenantId') {
  return async (c: Context): Promise<number | undefined> => {
    try {
      const body = await c.req.json();
      return body && body[bodyField] ? parseInt(body[bodyField], 10) : undefined;
    } catch (e) {
      return undefined;
    }
  };
}

/**
 * Common authorization patterns based on the specified permission requirements
 */
export const auth = {
  // Any authenticated user, no tenant check
  anyUser: authorize(['admin', 'member', 'viewer']),

  // List projects - All roles can access (admin, member, viewer), but must be in their tenant
  listProjects: authorize(['admin', 'member', 'viewer'], {
    checkTenant: true,
    getTenantId: (c) => c.get('user')?.tenant_id
  }),

  // Create project - Only admin and member can create, in their tenant
  createProject: authorize(['admin', 'member'], {
    checkTenant: true,
    getTenantId: (c) => c.get('user')?.tenant_id
  }),

  // Admin-only operations, any tenant
  adminOnly: authorize(['admin']),

  // Create custom authorization middleware
  custom: (roles: string[], tenantCheck: boolean, tenantExtractor?: (c: Context) => number | undefined) => {
    return authorize(roles, {
      checkTenant: tenantCheck,
      getTenantId: tenantExtractor
    });
  }
};
