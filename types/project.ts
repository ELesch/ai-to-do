/**
 * Project Type Definitions
 */

import { z } from 'zod'

/**
 * Base project schema with validation
 */
export const projectSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(2000).nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#6366f1'),
  icon: z.string().max(50).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isArchived: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
  archivedAt: z.date().nullable().optional(),
  deletedAt: z.date().nullable().optional(),
})

export type Project = z.infer<typeof projectSchema>

/**
 * Schema for creating a new project
 */
export const createProjectSchema = projectSchema
  .pick({
    name: true,
    description: true,
    color: true,
    icon: true,
    parentId: true,
  })
  .partial({
    description: true,
    color: true,
    icon: true,
    parentId: true,
  })

export type CreateProjectInput = z.infer<typeof createProjectSchema>

/**
 * Schema for updating a project
 */
export const updateProjectSchema = createProjectSchema.partial().extend({
  isArchived: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
})

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>

/**
 * Project with task counts
 */
export interface ProjectWithCounts extends Project {
  taskCount: number
  completedTaskCount: number
}

/**
 * Project tree structure
 */
export interface ProjectTreeNode extends Project {
  children: ProjectTreeNode[]
}
