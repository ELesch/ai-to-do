/**
 * Project Service
 * Business logic for project CRUD operations with database integration
 */

import { db } from '@/lib/db'
import { projects, tasks } from '@/lib/db/schema'
import { eq, and, asc, desc, isNull, sql, inArray } from 'drizzle-orm'
import { z } from 'zod'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(10000).nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional().default('#6366f1'),
  icon: z.string().max(50).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  isFavorite: z.boolean().optional().default(false),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export const updateProjectSchema = createProjectSchema.partial().extend({
  isArchived: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
})

export const projectFiltersSchema = z.object({
  includeArchived: z.boolean().optional().default(false),
  sortBy: z.enum(['createdAt', 'name', 'sortOrder', 'updatedAt']).optional().default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

export const reorderProjectsSchema = z.object({
  projectIds: z.array(z.string().uuid()).min(1),
})

// ============================================================================
// TYPES
// ============================================================================

export type CreateProjectInput = z.input<typeof createProjectSchema>
export type UpdateProjectInput = z.input<typeof updateProjectSchema>
export type ProjectFilters = z.input<typeof projectFiltersSchema>
export type ProjectFiltersOutput = z.output<typeof projectFiltersSchema>
export type ReorderProjectsInput = z.infer<typeof reorderProjectsSchema>

export interface Project {
  id: string
  userId: string
  parentId: string | null
  name: string
  description: string | null
  color: string | null
  icon: string | null
  sortOrder: number | null
  isArchived: boolean | null
  isFavorite: boolean | null
  settings: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
  archivedAt: Date | null
  deletedAt: Date | null
}

export interface ProjectWithCounts extends Project {
  taskCount: number
  completedTaskCount: number
}

export interface ProjectStats {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  inProgressTasks: number
  highPriorityTasks: number
  mediumPriorityTasks: number
  lowPriorityTasks: number
  noPriorityTasks: number
  overdueTasks: number
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class ProjectService {
  /**
   * Create a new project
   */
  async createProject(userId: string, input: CreateProjectInput): Promise<Project> {
    const validatedInput = createProjectSchema.parse(input)

    // If parent project specified, verify it exists and belongs to user
    if (validatedInput.parentId) {
      const parentProject = await this.getProject(validatedInput.parentId, userId)
      if (!parentProject) {
        throw new Error('Parent project not found')
      }
    }

    // Get the max sort order for user's projects
    const maxSortOrderResult = await db
      .select({ maxSortOrder: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))

    const nextSortOrder = (maxSortOrderResult[0]?.maxSortOrder ?? -1) + 1

    const [project] = await db
      .insert(projects)
      .values({
        userId,
        name: validatedInput.name,
        description: validatedInput.description ?? null,
        color: validatedInput.color,
        icon: validatedInput.icon ?? null,
        parentId: validatedInput.parentId ?? null,
        isFavorite: validatedInput.isFavorite,
        settings: validatedInput.settings ?? {},
        sortOrder: nextSortOrder,
        isArchived: false,
      })
      .returning()

    return project as Project
  }

  /**
   * Get a single project by ID with user validation
   */
  async getProject(projectId: string, userId: string): Promise<Project | null> {
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectId),
        eq(projects.userId, userId),
        isNull(projects.deletedAt)
      ),
    })

    return project as Project | null
  }

  /**
   * Get a single project with task counts
   */
  async getProjectWithCounts(projectId: string, userId: string): Promise<ProjectWithCounts | null> {
    const project = await this.getProject(projectId, userId)
    if (!project) return null

    const counts = await this.getProjectTaskCounts(projectId, userId)

    return {
      ...project,
      taskCount: counts.total,
      completedTaskCount: counts.completed,
    }
  }

  /**
   * Get all projects for a user with filtering
   */
  async getUserProjects(userId: string, filters: ProjectFilters = {}): Promise<ProjectWithCounts[]> {
    const validatedFilters = projectFiltersSchema.parse(filters)
    const conditions = [eq(projects.userId, userId), isNull(projects.deletedAt)]

    // Filter by archived status
    if (!validatedFilters.includeArchived) {
      conditions.push(eq(projects.isArchived, false))
    }

    // Determine sort order
    const sortColumn = {
      createdAt: projects.createdAt,
      name: projects.name,
      sortOrder: projects.sortOrder,
      updatedAt: projects.updatedAt,
    }[validatedFilters.sortBy]

    const orderFn = validatedFilters.sortOrder === 'asc' ? asc : desc

    // Get projects
    const projectResults = await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn!))

    // Get task counts for each project
    const projectsWithCounts: ProjectWithCounts[] = await Promise.all(
      projectResults.map(async (project) => {
        const counts = await this.getProjectTaskCounts(project.id, userId)
        return {
          ...(project as Project),
          taskCount: counts.total,
          completedTaskCount: counts.completed,
        }
      })
    )

    return projectsWithCounts
  }

  /**
   * Update a project
   */
  async updateProject(
    projectId: string,
    userId: string,
    input: UpdateProjectInput
  ): Promise<Project> {
    const validatedInput = updateProjectSchema.parse(input)

    // Verify project exists and belongs to user
    const existingProject = await this.getProject(projectId, userId)
    if (!existingProject) {
      throw new Error('Project not found')
    }

    // If parent project is being changed, verify it exists
    if (validatedInput.parentId !== undefined && validatedInput.parentId !== null) {
      if (validatedInput.parentId === projectId) {
        throw new Error('Project cannot be its own parent')
      }
      const parentProject = await this.getProject(validatedInput.parentId, userId)
      if (!parentProject) {
        throw new Error('Parent project not found')
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (validatedInput.name !== undefined) updateData.name = validatedInput.name
    if (validatedInput.description !== undefined) updateData.description = validatedInput.description
    if (validatedInput.color !== undefined) updateData.color = validatedInput.color
    if (validatedInput.icon !== undefined) updateData.icon = validatedInput.icon
    if (validatedInput.parentId !== undefined) updateData.parentId = validatedInput.parentId
    if (validatedInput.isFavorite !== undefined) updateData.isFavorite = validatedInput.isFavorite
    if (validatedInput.settings !== undefined) updateData.settings = validatedInput.settings
    if (validatedInput.isArchived !== undefined) {
      updateData.isArchived = validatedInput.isArchived
      updateData.archivedAt = validatedInput.isArchived ? new Date() : null
    }

    const [updatedProject] = await db
      .update(projects)
      .set(updateData)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .returning()

    return updatedProject as Project
  }

  /**
   * Soft delete a project - moves tasks to inbox (projectId = null)
   */
  async deleteProject(projectId: string, userId: string): Promise<void> {
    // Verify project exists and belongs to user
    const existingProject = await this.getProject(projectId, userId)
    if (!existingProject) {
      throw new Error('Project not found')
    }

    // Move all tasks in this project to inbox (projectId = null)
    await db
      .update(tasks)
      .set({
        projectId: null,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.projectId, projectId), eq(tasks.userId, userId)))

    // Soft delete the project
    await db
      .update(projects)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
  }

  /**
   * Archive or unarchive a project
   */
  async archiveProject(projectId: string, userId: string, archive: boolean = true): Promise<Project> {
    // Verify project exists and belongs to user
    const existingProject = await this.getProject(projectId, userId)
    if (!existingProject) {
      throw new Error('Project not found')
    }

    const [updatedProject] = await db
      .update(projects)
      .set({
        isArchived: archive,
        archivedAt: archive ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .returning()

    return updatedProject as Project
  }

  /**
   * Reorder projects
   */
  async reorderProjects(userId: string, projectIds: string[]): Promise<void> {
    // Verify all projects exist and belong to user
    const existingProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          inArray(projects.id, projectIds),
          eq(projects.userId, userId),
          isNull(projects.deletedAt)
        )
      )

    if (existingProjects.length !== projectIds.length) {
      throw new Error('Some projects not found or do not belong to user')
    }

    // Update sort order for each project
    for (let i = 0; i < projectIds.length; i++) {
      await db
        .update(projects)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(and(eq(projects.id, projectIds[i]), eq(projects.userId, userId)))
    }
  }

  /**
   * Get project task counts
   */
  async getProjectTaskCounts(
    projectId: string,
    userId: string
  ): Promise<{ total: number; completed: number }> {
    const result = await db
      .select({
        total: sql<number>`COUNT(*)::int`,
        completed: sql<number>`COUNT(*) FILTER (WHERE status = 'completed')::int`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt)
        )
      )

    return {
      total: result[0]?.total ?? 0,
      completed: result[0]?.completed ?? 0,
    }
  }

  /**
   * Get detailed project statistics
   */
  async getProjectStats(projectId: string, userId: string): Promise<ProjectStats> {
    // Verify project exists and belongs to user
    const existingProject = await this.getProject(projectId, userId)
    if (!existingProject) {
      throw new Error('Project not found')
    }

    const now = new Date()

    const result = await db
      .select({
        totalTasks: sql<number>`COUNT(*)::int`,
        completedTasks: sql<number>`COUNT(*) FILTER (WHERE status = 'completed')::int`,
        pendingTasks: sql<number>`COUNT(*) FILTER (WHERE status = 'pending')::int`,
        inProgressTasks: sql<number>`COUNT(*) FILTER (WHERE status = 'in_progress')::int`,
        highPriorityTasks: sql<number>`COUNT(*) FILTER (WHERE priority = 'high' AND status != 'completed')::int`,
        mediumPriorityTasks: sql<number>`COUNT(*) FILTER (WHERE priority = 'medium' AND status != 'completed')::int`,
        lowPriorityTasks: sql<number>`COUNT(*) FILTER (WHERE priority = 'low' AND status != 'completed')::int`,
        noPriorityTasks: sql<number>`COUNT(*) FILTER (WHERE priority = 'none' AND status != 'completed')::int`,
        overdueTasks: sql<number>`COUNT(*) FILTER (WHERE due_date < ${now} AND status != 'completed')::int`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt)
        )
      )

    return {
      totalTasks: result[0]?.totalTasks ?? 0,
      completedTasks: result[0]?.completedTasks ?? 0,
      pendingTasks: result[0]?.pendingTasks ?? 0,
      inProgressTasks: result[0]?.inProgressTasks ?? 0,
      highPriorityTasks: result[0]?.highPriorityTasks ?? 0,
      mediumPriorityTasks: result[0]?.mediumPriorityTasks ?? 0,
      lowPriorityTasks: result[0]?.lowPriorityTasks ?? 0,
      noPriorityTasks: result[0]?.noPriorityTasks ?? 0,
      overdueTasks: result[0]?.overdueTasks ?? 0,
    }
  }
}

export const projectService = new ProjectService()
