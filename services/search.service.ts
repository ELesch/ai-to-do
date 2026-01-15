/**
 * Search Service
 * Full-text search functionality for tasks and projects
 */

import { db } from '@/lib/db'
import { tasks, projects } from '@/lib/db/schema'
import { eq, and, or, ilike, isNull, desc, sql } from 'drizzle-orm'
import { z } from 'zod'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const searchQuerySchema = z.object({
  query: z.string().min(1, 'Search query is required').max(500),
  limit: z.number().int().positive().max(50).optional().default(10),
})

// ============================================================================
// TYPES
// ============================================================================

export type SearchQuery = z.input<typeof searchQuerySchema>

export interface TaskSearchResult {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: Date | null
  projectId: string | null
  projectName: string | null
  projectColor: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ProjectSearchResult {
  id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  taskCount: number
  isArchived: boolean | null
  isFavorite: boolean | null
  createdAt: Date
  updatedAt: Date
}

export interface SearchResults {
  tasks: TaskSearchResult[]
  projects: ProjectSearchResult[]
  totalTasks: number
  totalProjects: number
}

export interface RecentItem {
  id: string
  type: 'task' | 'project'
  title: string
  description: string | null
  color?: string | null
  icon?: string | null
  status?: string
  priority?: string
  dueDate?: Date | null
  updatedAt: Date
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class SearchService {
  /**
   * Search tasks by title and description
   */
  async searchTasks(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<{ tasks: TaskSearchResult[]; total: number }> {
    const searchTerm = `%${query}%`

    // Get matching tasks with project info
    const matchingTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        projectId: tasks.projectId,
        projectName: projects.name,
        projectColor: projects.color,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
          or(
            ilike(tasks.title, searchTerm),
            ilike(tasks.description, searchTerm)
          )
        )
      )
      .orderBy(desc(tasks.updatedAt))
      .limit(limit)

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
          or(
            ilike(tasks.title, searchTerm),
            ilike(tasks.description, searchTerm)
          )
        )
      )

    return {
      tasks: matchingTasks as TaskSearchResult[],
      total: countResult[0]?.count ?? 0,
    }
  }

  /**
   * Search projects by name and description
   */
  async searchProjects(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<{ projects: ProjectSearchResult[]; total: number }> {
    const searchTerm = `%${query}%`

    // Get matching projects with task counts
    const matchingProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        color: projects.color,
        icon: projects.icon,
        isArchived: projects.isArchived,
        isFavorite: projects.isFavorite,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        taskCount: sql<number>`(
          SELECT COUNT(*)::int FROM tasks
          WHERE tasks.project_id = ${projects.id}
          AND tasks.deleted_at IS NULL
        )`,
      })
      .from(projects)
      .where(
        and(
          eq(projects.userId, userId),
          isNull(projects.deletedAt),
          or(
            ilike(projects.name, searchTerm),
            ilike(projects.description, searchTerm)
          )
        )
      )
      .orderBy(desc(projects.updatedAt))
      .limit(limit)

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(
        and(
          eq(projects.userId, userId),
          isNull(projects.deletedAt),
          or(
            ilike(projects.name, searchTerm),
            ilike(projects.description, searchTerm)
          )
        )
      )

    return {
      projects: matchingProjects as ProjectSearchResult[],
      total: countResult[0]?.count ?? 0,
    }
  }

  /**
   * Combined search across tasks and projects
   */
  async searchAll(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<SearchResults> {
    // Run both searches in parallel
    const [taskResults, projectResults] = await Promise.all([
      this.searchTasks(userId, query, limit),
      this.searchProjects(userId, query, limit),
    ])

    return {
      tasks: taskResults.tasks,
      projects: projectResults.projects,
      totalTasks: taskResults.total,
      totalProjects: projectResults.total,
    }
  }

  /**
   * Get recent tasks and projects for the command palette
   */
  async getRecent(userId: string, limit: number = 5): Promise<RecentItem[]> {
    // Get recent tasks
    const recentTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt)
        )
      )
      .orderBy(desc(tasks.updatedAt))
      .limit(limit)

    // Get recent projects
    const recentProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        color: projects.color,
        icon: projects.icon,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(
        and(
          eq(projects.userId, userId),
          isNull(projects.deletedAt),
          eq(projects.isArchived, false)
        )
      )
      .orderBy(desc(projects.updatedAt))
      .limit(limit)

    // Combine and sort by updatedAt
    const combined: RecentItem[] = [
      ...recentTasks.map((task) => ({
        id: task.id,
        type: 'task' as const,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        updatedAt: task.updatedAt,
      })),
      ...recentProjects.map((project) => ({
        id: project.id,
        type: 'project' as const,
        title: project.name,
        description: project.description,
        color: project.color,
        icon: project.icon,
        updatedAt: project.updatedAt,
      })),
    ]

    // Sort by updatedAt descending and limit
    combined.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    return combined.slice(0, limit)
  }
}

export const searchService = new SearchService()
