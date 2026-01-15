/**
 * Task Type Definitions
 */

import { z } from 'zod'

/**
 * Task priority levels
 */
export type TaskPriority = 'high' | 'medium' | 'low' | 'none'

/**
 * Task status values
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deleted'

/**
 * Base task schema with validation
 */
export const taskSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(10000).nullable().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'deleted']),
  priority: z.enum(['high', 'medium', 'low', 'none']),
  dueDate: z.date().nullable().optional(),
  dueDateHasTime: z.boolean().default(false),
  scheduledDate: z.string().nullable().optional(), // Date string
  startDate: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  actualMinutes: z.number().int().positive().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isRecurring: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().nullable().optional(),
  deletedAt: z.date().nullable().optional(),
})

export type Task = z.infer<typeof taskSchema>

/**
 * Schema for creating a new task
 */
export const createTaskSchema = taskSchema
  .pick({
    title: true,
    description: true,
    priority: true,
    dueDate: true,
    dueDateHasTime: true,
    scheduledDate: true,
    estimatedMinutes: true,
    projectId: true,
    parentTaskId: true,
  })
  .partial({
    description: true,
    priority: true,
    dueDate: true,
    dueDateHasTime: true,
    scheduledDate: true,
    estimatedMinutes: true,
    projectId: true,
    parentTaskId: true,
  })

export type CreateTaskInput = z.infer<typeof createTaskSchema>

/**
 * Schema for updating a task
 */
export const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(['pending', 'in_progress', 'completed', 'deleted']).optional(),
})

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

/**
 * Task filters for querying
 */
export const taskFiltersSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'deleted']).optional(),
  priority: z.enum(['high', 'medium', 'low', 'none']).optional(),
  projectId: z.string().uuid().optional(),
  dueDateFrom: z.date().optional(),
  dueDateTo: z.date().optional(),
  hasNoDueDate: z.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'dueDate', 'priority', 'sortOrder']).default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
})

export type TaskFilters = z.infer<typeof taskFiltersSchema>

/**
 * Task with subtasks included
 */
export interface TaskWithSubtasks extends Task {
  subtasks: Task[]
}

/**
 * Task with project included
 */
export interface TaskWithProject extends Task {
  project: {
    id: string
    name: string
    color: string
  } | null
}
