import { Hono } from 'hono';
import { z } from 'zod';
import { validator } from 'hono/validator';
import { eq, and } from 'drizzle-orm';
import { projects } from '../db/schema';
import { auth, AuthUser } from '../middleware/authorizeRBAC';

const projectSchema = z.object({
  name: z.string().min(3).max(100).trim(),
});

const app = new Hono<{
  Variables: {
    user: AuthUser;
    db: any;
  },
  Bindings: {
    DB: D1Database;
  }
}>();

/**
 * GET /projects
 * Lists all projects for the current tenant.
 * Authorization: admin, member, viewer
 */
app.get('/', auth.listProjects, async (c) => {
  try {
    const user = c.get('user');

    const projectsList = await c.get('db')
      .select()
      .from(projects)
      .where(eq(projects.tenant_id, user.tenant_id));

    return c.json({
      success: true,
      data: projectsList
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return c.json({
      success: false,
      message: 'Failed to fetch projects'
    }, 500);
  }
});

/**
 * POST /projects
 * Creates a new project for the current tenant.
 * Authorization: admin, member
 */
app.post('/', auth.createProject, validator('json', async (value, c) => {
    const parsed = projectSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({
        success: false,
        message: 'Invalid project data',
        errors: parsed.error.errors
      }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    try {
      const user = c.get('user');
      const data = c.req.valid('json');

      const [newProject] = await c.get('db')
        .insert(projects)
        .values({
          name: data.name,
          tenant_id: user.tenant_id,
          owner_user_id: user.id
        })
        .returning();

      return c.json({
        success: true,
        data: newProject
      }, 201);
    } catch (error) {
      console.error('Error creating project:', error);
      return c.json({
        success: false,
        message: 'Failed to create project'
      }, 500);
    }
  }
);

/**
 * GET /projects/:id
 * Get a specific project by ID.
 * Authorization: admin, member, viewer (only their tenant)
 */
app.get('/:id', auth.listProjects, async (c) => {
  try {
    const user = c.get('user');
    const id = parseInt(c.req.param('id'), 10);

    if (isNaN(id)) {
      return c.json({
        success: false,
        message: 'Invalid project ID'
      }, 400);
    }

    const project = await c.get('db')
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, id),
          eq(projects.tenant_id, user.tenant_id)
        )
      )
      .get();

    if (!project) {
      return c.json({
        success: false,
        message: 'Project not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return c.json({
      success: false,
      message: 'Failed to fetch project'
    }, 500);
  }
});

export default app;
