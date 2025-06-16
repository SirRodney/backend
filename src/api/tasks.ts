import { Hono } from 'hono';
import { z } from 'zod';
import { validator } from 'hono/validator';
import { eq, and } from 'drizzle-orm';
import { projects, tasks } from '../db/schema';
import { auth, AuthUser } from '../middleware/authorizeRBAC';
import { Context } from 'hono';

// Task validation schemas
const taskSchema = z.object({
  title: z.string().min(3).max(100).trim(),
  status: z.enum(['todo', 'in_progress', 'completed', 'blocked']).default('todo'),
  assignee_user_id: z.number().optional().nullable(),
});

const taskUpdateSchema = taskSchema.partial();

// Parameter validation schema
const projectIdSchema = z.object({
  projectId: z.string().refine((val) => !isNaN(Number(val)), {
    message: "Project ID must be a valid number",
  }),
});

const taskIdSchema = z.object({
  taskId: z.string().refine((val) => !isNaN(Number(val)), {
    message: "Task ID must be a valid number",
  }),
});

// Create a typed Hono app
const app = new Hono<{
  Variables: {
    user: AuthUser;
    db: any;
  },
  Bindings: {
    DB: D1Database;
  }
}>();

async function validateProjectAccess(c: Context, projectId: number): Promise<boolean> {
  try {
    const user = c.get('user');
    const db = c.get('db');

    const project = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.tenant_id, user.tenant_id)
        )
      )
      .get();

    return !!project;
  } catch (error) {
    console.error('Error validating project access:', error);
    return false;
  }
}

/**
 * GET /projects/:projectId/tasks
 * Lists all tasks for a specific project
 * Authorization: admin, member, viewer (of the same tenant)
 */
app.get('/:projectId/tasks',
  validator('param', (value, c) => {
    const result = projectIdSchema.safeParse(value);
    if (!result.success) {
      return c.json({
        success: false,
        message: 'Invalid project ID'
      }, 400);
    }
    return result.data;
  }),
  auth.listProjects,
  async (c) => {
    try {
      const { projectId } = c.req.valid('param');
      const numericProjectId = parseInt(projectId, 10);

      if (!(await validateProjectAccess(c, numericProjectId))) {
        return c.json({
          success: false,
          message: 'Project not found or Access denied'
        }, 404);
      }

      const tasksList = await c.get('db')
        .select()
        .from(tasks)
        .where(eq(tasks.project_id, numericProjectId));

      return c.json({
        success: true,
        data: tasksList
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return c.json({
        success: false,
        message: 'Failed to fetch tasks'
      }, 500);
    }
  }
);

/**
 * GET /projects/:projectId/tasks/:taskId
 * Gets a specific task by ID
 * Authorization: admin, member, viewer (of the same tenant)
 */
app.get('/:projectId/tasks/:taskId',
  validator('param', (value, c) => {
    const result = z.object({
      ...projectIdSchema.shape,
      ...taskIdSchema.shape
    }).safeParse(value);

    if (!result.success) {
      return c.json({
        success: false,
        message: 'Invalid parameters'
      }, 400);
    }
    return result.data;
  }),
  auth.listProjects,
  async (c) => {
    try {
      const { projectId, taskId } = c.req.valid('param');
      const numericProjectId = parseInt(projectId, 10);
      const numericTaskId = parseInt(taskId, 10);

      // Validate project access
      if (!(await validateProjectAccess(c, numericProjectId))) {
        return c.json({
          success: false,
          message: 'Access denied'
        }, 403);
      }

      const task = await c.get('db')
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.id, numericTaskId),
            eq(tasks.project_id, numericProjectId)
          )
        )
        .get();

      if (!task) {
        return c.json({
          success: false,
          message: 'Task not found'
        }, 404);
      }

      return c.json({
        success: true,
        data: task
      });
    } catch (error) {
      console.error('Error fetching task:', error);
      return c.json({
        success: false,
        message: 'Failed to fetch task'
      }, 500);
    }
  }
);

/**
 * POST /projects/:projectId/tasks
 * Creates a new task in a specific project
 * Authorization: admin, member (of the same tenant)
 */
app.post('/:projectId/tasks',
  validator('param', (value, c) => {
    const result = projectIdSchema.safeParse(value);
    if (!result.success) {
      return c.json({
        success: false,
        message: 'Invalid project ID'
      }, 400);
    }
    return result.data;
  }),
  validator('json', (value, c) => {
    const result = taskSchema.safeParse(value);
    if (!result.success) {
      return c.json({
        success: false,
        message: 'Invalid task data',
        errors: result.error.errors
      }, 400);
    }
    return result.data;
  }),
  auth.createProject,
  async (c) => {
    try {
      const { projectId } = c.req.valid('param');
      const taskData = c.req.valid('json');
      const numericProjectId = parseInt(projectId, 10);
      const user = c.get('user');

      // Validate project access
      if (!(await validateProjectAccess(c, numericProjectId))) {
        return c.json({
          success: false,
          message: 'Access denied'
        }, 403);
      }

      const [newTask] = await c.get('db')
        .insert(tasks)
        .values({
          title: taskData.title,
          status: taskData.status,
          project_id: numericProjectId,
          assignee_user_id: taskData.assignee_user_id || user.id
        })
        .returning();

      return c.json({
        success: true,
        data: newTask
      }, 201);
    } catch (error) {
      console.error('Error creating task:', error);
      return c.json({
        success: false,
        message: 'Failed to create task'
      }, 500);
    }
  }
);

/**
 * PUT /projects/:projectId/tasks/:taskId
 * Updates an existing task
 * Authorization: admin, member (of the same tenant)
 */
app.put('/:projectId/tasks/:taskId',
  validator('param', (value, c) => {
    const result = z.object({
      ...projectIdSchema.shape,
      ...taskIdSchema.shape
    }).safeParse(value);

    if (!result.success) {
      return c.json({
        success: false,
        message: 'Invalid parameters'
      }, 400);
    }
    return result.data;
  }),
  validator('json', (value, c) => {
    const result = taskUpdateSchema.safeParse(value);
    if (!result.success) {
      return c.json({
        success: false,
        message: 'Invalid task data',
        errors: result.error.errors
      }, 400);
    }
    return result.data;
  }),
  auth.createProject, // Same permissions as creating projects (admin, member)
  async (c) => {
    try {
      const { projectId, taskId } = c.req.valid('param');
      const updateData = c.req.valid('json');
      const numericProjectId = parseInt(projectId, 10);
      const numericTaskId = parseInt(taskId, 10);

      // Validate project access
      if (!(await validateProjectAccess(c, numericProjectId))) {
        return c.json({
          success: false,
          message: 'Access denied'
        }, 403);
      }

      // Check if task exists and belongs to the project
      const existingTask = await c.get('db')
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.id, numericTaskId),
            eq(tasks.project_id, numericProjectId)
          )
        )
        .get();

      if (!existingTask) {
        return c.json({
          success: false,
          message: 'Task not found or does not belong to the specified project'
        }, 404);
      }

      // Update the task
      const [updatedTask] = await c.get('db')
        .update(tasks)
        .set(updateData)
        .where(
          and(
            eq(tasks.id, numericTaskId),
            eq(tasks.project_id, numericProjectId)
          )
        )
        .returning();

      return c.json({
        success: true,
        data: updatedTask
      });
    } catch (error) {
      console.error('Error updating task:', error);
      return c.json({
        success: false,
        message: 'Failed to update task'
      }, 500);
    }
  }
);

/**
 * DELETE /projects/:projectId/tasks/:taskId
 * Deletes a specific task
 * Authorization: admin, member (of the same tenant)
 */
app.delete('/:projectId/tasks/:taskId',
  validator('param', (value, c) => {
    const result = z.object({
      ...projectIdSchema.shape,
      ...taskIdSchema.shape
    }).safeParse(value);

    if (!result.success) {
      return c.json({
        success: false,
        message: 'Invalid parameters'
      }, 400);
    }
    return result.data;
  }),
  auth.createProject, // Same permissions as creating projects (admin, member)
  async (c) => {
    try {
      const { projectId, taskId } = c.req.valid('param');
      const numericProjectId = parseInt(projectId, 10);
      const numericTaskId = parseInt(taskId, 10);

      // Validate project access
      if (!(await validateProjectAccess(c, numericProjectId))) {
        return c.json({
          success: false,
          message: 'Access denied'
        }, 404);
      }

      // Check if task exists and belongs to the project
      const existingTask = await c.get('db')
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.id, numericTaskId),
            eq(tasks.project_id, numericProjectId)
          )
        )
        .get();

      if (!existingTask) {
        return c.json({
          success: false,
          message: 'Task not found or does not belong to the specified project'
        }, 404);
      }

      // Delete the task
      await c.get('db')
        .delete(tasks)
        .where(
          and(
            eq(tasks.id, numericTaskId),
            eq(tasks.project_id, numericProjectId)
          )
        );

      return c.json({
        success: true,
        message: 'Task deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      return c.json({
        success: false,
        message: 'Failed to delete task'
      }, 500);
    }
  }
);

export default app;
