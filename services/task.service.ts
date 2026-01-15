/**
 * Task Service
 * Business logic for task CRUD operations with database integration
 */

import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { eq, and, gte, lte, desc, asc, or, isNull, ilike, sql, inArray } from 'drizzle-orm'
import { z } from 'zod'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(10000).nullable().optional(),
  priority: z.enum(['high', 'medium', 'low', 'none']).optional().default('none'),
  dueDate: z.string().datetime().nullable().optional(),
  dueDateHasTime: z.boolean().optional().default(false),
  scheduledDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional().default(0),
  isRecurring: z.boolean().optional().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(['pending', 'in_progress', 'completed', 'deleted']).optional(),
  actualMinutes: z.number().int().positive().nullable().optional(),
})

export const taskFiltersSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'deleted']).optional(),
  priority: z.enum(['high', 'medium', 'low', 'none']).optional(),
  projectId: z.string().uuid().nullable().optional(),
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
  hasNoDueDate: z.boolean().optional(),
  search: z.string().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  includeDeleted: z.boolean().optional().default(false),
  sortBy: z.enum(['createdAt', 'dueDate', 'priority', 'sortOrder', 'updatedAt']).optional().default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
})

export const reorderTasksSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1),
})

// ============================================================================
// TYPES
// ============================================================================

export type CreateTaskInput = z.input<typeof createTaskSchema>
export type UpdateTaskInput = z.input<typeof updateTaskSchema>
export type TaskFilters = z.input<typeof taskFiltersSchema>
export type TaskFiltersOutput = z.output<typeof taskFiltersSchema>
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>

export interface TaskWithSubtasks {
  id: string
  userId: string
  projectId: string | null
  parentTaskId: string | null
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: Date | null
  dueDateHasTime: boolean | null
  scheduledDate: string | null
  startDate: string | null
  estimatedMinutes: number | null
  actualMinutes: number | null
  sortOrder: number | null
  isRecurring: boolean | null
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
  deletedAt: Date | null
  subtasks?: TaskWithSubtasks[]
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class TaskService {
  /**
   * Create a new task
   */
  async createTask(userId: string, input: CreateTaskInput): Promise<TaskWithSubtasks> {
    const validatedInput = createTaskSchema.parse(input)

    // If parent task specified, verify it exists and belongs to user
    if (validatedInput.parentTaskId) {
      const parentTask = await this.getTask(validatedInput.parentTaskId, userId)
      if (!parentTask) {
        throw new Error('Parent task not found')
      }
    }

    // If project specified, verify it exists (could add project validation here)

    const [task] = await db
      .insert(tasks)
      .values({
        userId,
        title: validatedInput.title,
        description: validatedInput.description ?? null,
        priority: validatedInput.priority,
        dueDate: validatedInput.dueDate ? new Date(validatedInput.dueDate) : null,
        dueDateHasTime: validatedInput.dueDateHasTime,
        scheduledDate: validatedInput.scheduledDate ?? null,
        startDate: validatedInput.startDate ?? null,
        estimatedMinutes: validatedInput.estimatedMinutes ?? null,
        projectId: validatedInput.projectId ?? null,
        parentTaskId: validatedInput.parentTaskId ?? null,
        sortOrder: validatedInput.sortOrder,
        isRecurring: validatedInput.isRecurring,
        metadata: validatedInput.metadata ?? {},
        status: 'pending',
      })
      .returning()

    return task as TaskWithSubtasks
  }

  /**
   * Get a single task by ID with user validation
   */
  async getTask(taskId: string, userId: string): Promise<TaskWithSubtasks | null> {
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt)
      ),
    })

    return task as TaskWithSubtasks | null
  }

  /**
   * Get tasks for a user with filtering
   */
  async getUserTasks(userId: string, filters: TaskFilters = {}): Promise<{
    tasks: TaskWithSubtasks[]
    total: number
    hasMore: boolean
  }> {
    const validatedFilters = taskFiltersSchema.parse(filters)
    const conditions = [eq(tasks.userId, userId)]

    // Filter by status
    if (validatedFilters.status) {
      conditions.push(eq(tasks.status, validatedFilters.status))
    }

    // Filter by deleted status
    if (!validatedFilters.includeDeleted) {
      conditions.push(isNull(tasks.deletedAt))
    }

    // Filter by priority
    if (validatedFilters.priority) {
      conditions.push(eq(tasks.priority, validatedFilters.priority))
    }

    // Filter by project
    if (validatedFilters.projectId !== undefined) {
      if (validatedFilters.projectId === null) {
        conditions.push(isNull(tasks.projectId))
      } else {
        conditions.push(eq(tasks.projectId, validatedFilters.projectId))
      }
    }

    // Filter by parent task (for getting root tasks only)
    if (validatedFilters.parentTaskId !== undefined) {
      if (validatedFilters.parentTaskId === null) {
        conditions.push(isNull(tasks.parentTaskId))
      } else {
        conditions.push(eq(tasks.parentTaskId, validatedFilters.parentTaskId))
      }
    }

    // Filter by due date range
    if (validatedFilters.dueBefore) {
      conditions.push(lte(tasks.dueDate, new Date(validatedFilters.dueBefore)))
    }
    if (validatedFilters.dueAfter) {
      conditions.push(gte(tasks.dueDate, new Date(validatedFilters.dueAfter)))
    }

    // Filter for tasks with no due date
    if (validatedFilters.hasNoDueDate === true) {
      conditions.push(isNull(tasks.dueDate))
    }

    // Search by title or description
    if (validatedFilters.search) {
      const searchTerm = `%${validatedFilters.search}%`
      conditions.push(
        or(
          ilike(tasks.title, searchTerm),
          ilike(tasks.description, searchTerm)
        )!
      )
    }

    // Determine sort order
    const sortColumn = {
      createdAt: tasks.createdAt,
      dueDate: tasks.dueDate,
      priority: tasks.priority,
      sortOrder: tasks.sortOrder,
      updatedAt: tasks.updatedAt,
    }[validatedFilters.sortBy]

    const orderFn = validatedFilters.sortOrder === 'asc' ? asc : desc

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(...conditions))

    const total = countResult[0]?.count ?? 0

    // Get paginated tasks
    const taskResults = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn!))
      .limit(validatedFilters.limit)
      .offset(validatedFilters.offset)

    return {
      tasks: taskResults as TaskWithSubtasks[],
      total,
      hasMore: validatedFilters.offset + taskResults.length < total,
    }
  }

  /**
   * Update a task
   */
  async updateTask(
    taskId: string,
    userId: string,
    input: UpdateTaskInput
  ): Promise<TaskWithSubtasks> {
    const validatedInput = updateTaskSchema.parse(input)

    // Verify task exists and belongs to user
    const existingTask = await this.getTask(taskId, userId)
    if (!existingTask) {
      throw new Error('Task not found')
    }

    // If parent task is being changed, verify it exists
    if (validatedInput.parentTaskId !== undefined && validatedInput.parentTaskId !== null) {
      const parentTask = await this.getTask(validatedInput.parentTaskId, userId)
      if (!parentTask) {
        throw new Error('Parent task not found')
      }
      // Prevent circular reference
      if (validatedInput.parentTaskId === taskId) {
        throw new Error('Task cannot be its own parent')
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (validatedInput.title !== undefined) updateData.title = validatedInput.title
    if (validatedInput.description !== undefined) updateData.description = validatedInput.description
    if (validatedInput.priority !== undefined) updateData.priority = validatedInput.priority
    if (validatedInput.status !== undefined) {
      updateData.status = validatedInput.status
      // Set completedAt when status changes to completed
      if (validatedInput.status === 'completed' && existingTask.status !== 'completed') {
        updateData.completedAt = new Date()
      } else if (validatedInput.status !== 'completed') {
        updateData.completedAt = null
      }
    }
    if (validatedInput.dueDate !== undefined) {
      updateData.dueDate = validatedInput.dueDate ? new Date(validatedInput.dueDate) : null
    }
    if (validatedInput.dueDateHasTime !== undefined) updateData.dueDateHasTime = validatedInput.dueDateHasTime
    if (validatedInput.scheduledDate !== undefined) updateData.scheduledDate = validatedInput.scheduledDate
    if (validatedInput.startDate !== undefined) updateData.startDate = validatedInput.startDate
    if (validatedInput.estimatedMinutes !== undefined) updateData.estimatedMinutes = validatedInput.estimatedMinutes
    if (validatedInput.actualMinutes !== undefined) updateData.actualMinutes = validatedInput.actualMinutes
    if (validatedInput.projectId !== undefined) updateData.projectId = validatedInput.projectId
    if (validatedInput.parentTaskId !== undefined) updateData.parentTaskId = validatedInput.parentTaskId
    if (validatedInput.sortOrder !== undefined) updateData.sortOrder = validatedInput.sortOrder
    if (validatedInput.isRecurring !== undefined) updateData.isRecurring = validatedInput.isRecurring
    if (validatedInput.metadata !== undefined) updateData.metadata = validatedInput.metadata

    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning()

    return updatedTask as TaskWithSubtasks
  }

  /**
   * Soft delete a task
   */
  async deleteTask(taskId: string, userId: string): Promise<void> {
    // Verify task exists and belongs to user
    const existingTask = await this.getTask(taskId, userId)
    if (!existingTask) {
      throw new Error('Task not found')
    }

    await db
      .update(tasks)
      .set({
        status: 'deleted',
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))

    // Also soft delete all subtasks
    await db
      .update(tasks)
      .set({
        status: 'deleted',
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.parentTaskId, taskId), eq(tasks.userId, userId)))
  }

  /**
   * Complete or uncomplete a task
   */
  async completeTask(
    taskId: string,
    userId: string,
    complete: boolean = true
  ): Promise<TaskWithSubtasks> {
    // Verify task exists and belongs to user
    const existingTask = await this.getTask(taskId, userId)
    if (!existingTask) {
      throw new Error('Task not found')
    }

    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: complete ? 'completed' : 'pending',
        completedAt: complete ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning()

    return updatedTask as TaskWithSubtasks
  }

  /**
   * Create a subtask
   */
  async createSubtask(
    parentTaskId: string,
    userId: string,
    input: CreateTaskInput
  ): Promise<TaskWithSubtasks> {
    // Verify parent task exists and belongs to user
    const parentTask = await this.getTask(parentTaskId, userId)
    if (!parentTask) {
      throw new Error('Parent task not found')
    }

    // Create subtask with parent reference
    return this.createTask(userId, {
      ...input,
      parentTaskId,
      projectId: input.projectId ?? parentTask.projectId, // Inherit project if not specified
    })
  }

  /**
   * Get subtasks for a task
   */
  async getSubtasks(taskId: string, userId: string): Promise<TaskWithSubtasks[]> {
    // Verify parent task exists and belongs to user
    const parentTask = await this.getTask(taskId, userId)
    if (!parentTask) {
      throw new Error('Parent task not found')
    }

    const subtasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.parentTaskId, taskId),
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt)
        )
      )
      .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt))

    return subtasks as TaskWithSubtasks[]
  }

  /**
   * Reorder tasks
   */
  async reorderTasks(userId: string, taskIds: string[]): Promise<void> {
    // Verify all tasks exist and belong to user
    const existingTasks = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          inArray(tasks.id, taskIds),
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt)
        )
      )

    if (existingTasks.length !== taskIds.length) {
      throw new Error('Some tasks not found or do not belong to user')
    }

    // Update sort order for each task
    for (let i = 0; i < taskIds.length; i++) {
      await db
        .update(tasks)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(and(eq(tasks.id, taskIds[i]), eq(tasks.userId, userId)))
    }
  }

  /**
   * Get tasks due today
   */
  async getTodayTasks(userId: string): Promise<TaskWithSubtasks[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const result = await this.getUserTasks(userId, {
      dueAfter: today.toISOString(),
      dueBefore: tomorrow.toISOString(),
      status: 'pending',
    })

    return result.tasks
  }

  /**
   * Get upcoming tasks (next 7 days)
   */
  async getUpcomingTasks(userId: string): Promise<TaskWithSubtasks[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const result = await this.getUserTasks(userId, {
      dueAfter: today.toISOString(),
      dueBefore: nextWeek.toISOString(),
      status: 'pending',
      sortBy: 'dueDate',
      sortOrder: 'asc',
    })

    return result.tasks
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(userId: string): Promise<TaskWithSubtasks[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const result = await this.getUserTasks(userId, {
      dueBefore: today.toISOString(),
      status: 'pending',
    })

    return result.tasks
  }

  /**
   * Get task with all subtasks recursively
   */
  async getTaskWithSubtasks(taskId: string, userId: string): Promise<TaskWithSubtasks | null> {
    const task = await this.getTask(taskId, userId)
    if (!task) return null

    const subtasks = await this.getSubtasks(taskId, userId)

    // Recursively get subtasks of subtasks
    const subtasksWithChildren = await Promise.all(
      subtasks.map(async (subtask) => {
        const children = await this.getSubtasks(subtask.id, userId)
        return { ...subtask, subtasks: children }
      })
    )

    return { ...task, subtasks: subtasksWithChildren }
  }
}

export const taskService = new TaskService()
