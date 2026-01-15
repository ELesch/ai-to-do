/**
 * AI Context Service
 * Builds and manages context for AI interactions
 */

import { db } from '@/lib/db'
import {
  tasks,
  projects,
  aiContext,
  aiContextTypeEnum,
  type AIContextMetadata,
} from '@/lib/db/schema'
import { eq, and, desc, isNull, sql } from 'drizzle-orm'

// ============================================================================
// TYPES
// ============================================================================

// Type for ai context type enum values
type AIContextType = (typeof aiContextTypeEnum.enumValues)[number]

export interface TaskContext {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  dueDate: Date | null
  scheduledDate: string | null
  estimatedMinutes: number | null
  actualMinutes: number | null
  isRecurring: boolean | null
  subtasks: Array<{
    id: string
    title: string
    status: string
    priority: string
  }>
  tags: string[]
  relatedContext: Array<{
    type: AIContextType
    title: string | null
    content: string
    createdAt: Date
  }>
}

export interface ProjectContext {
  id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  taskCount: number
  completedTaskCount: number
  pendingTaskCount: number
  highPriorityCount: number
  upcomingDeadlines: Array<{
    taskId: string
    title: string
    dueDate: Date
  }>
}

export interface MergedContext {
  task?: TaskContext
  project?: ProjectContext
  additionalContext?: string[]
  summary: string
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class AIContextService {
  // ============================================================================
  // BUILD TASK CONTEXT
  // ============================================================================

  /**
   * Build context from task details
   * Gathers all relevant information about a task for AI context
   */
  async buildTaskContext(taskId: string, userId: string): Promise<TaskContext | null> {
    // Get the main task
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt)
      ),
    })

    if (!task) {
      return null
    }

    // Get subtasks
    const subtasks = await db.query.tasks.findMany({
      where: and(
        eq(tasks.parentTaskId, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt)
      ),
      orderBy: [desc(tasks.sortOrder)],
    })

    // Get related AI context (research, drafts, etc.)
    const relatedContext = await db.query.aiContext.findMany({
      where: and(
        eq(aiContext.taskId, taskId),
        eq(aiContext.isCurrent, true)
      ),
      orderBy: [desc(aiContext.createdAt)],
      limit: 5,
    })

    // Get task tags (would need to join with taskTags table)
    // For now, return empty array - can be enhanced later
    const tags: string[] = []

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      scheduledDate: task.scheduledDate,
      estimatedMinutes: task.estimatedMinutes,
      actualMinutes: task.actualMinutes,
      isRecurring: task.isRecurring,
      subtasks: subtasks.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        priority: s.priority,
      })),
      tags,
      relatedContext: relatedContext.map((c) => ({
        type: c.type,
        title: c.title,
        content: c.content,
        createdAt: c.createdAt,
      })),
    }
  }

  // ============================================================================
  // BUILD PROJECT CONTEXT
  // ============================================================================

  /**
   * Build context from project
   * Gathers all relevant information about a project for AI context
   */
  async buildProjectContext(projectId: string, userId: string): Promise<ProjectContext | null> {
    // Get the project
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectId),
        eq(projects.userId, userId),
        isNull(projects.deletedAt)
      ),
    })

    if (!project) {
      return null
    }

    // Get task statistics for this project
    const taskStats = await db
      .select({
        total: sql<number>`COUNT(*)::int`,
        completed: sql<number>`COUNT(*) FILTER (WHERE status = 'completed')::int`,
        pending: sql<number>`COUNT(*) FILTER (WHERE status = 'pending')::int`,
        highPriority: sql<number>`COUNT(*) FILTER (WHERE priority = 'high' AND status != 'completed')::int`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt)
        )
      )

    const stats = taskStats[0] ?? { total: 0, completed: 0, pending: 0, highPriority: 0 }

    // Get upcoming deadlines (next 7 days)
    const now = new Date()
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const upcomingTasks = await db.query.tasks.findMany({
      where: and(
        eq(tasks.projectId, projectId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        sql`${tasks.dueDate} IS NOT NULL AND ${tasks.dueDate} <= ${nextWeek} AND ${tasks.status} != 'completed'`
      ),
      orderBy: [desc(tasks.dueDate)],
      limit: 5,
    })

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      color: project.color,
      icon: project.icon,
      taskCount: stats.total,
      completedTaskCount: stats.completed,
      pendingTaskCount: stats.pending,
      highPriorityCount: stats.highPriority,
      upcomingDeadlines: upcomingTasks
        .filter((t) => t.dueDate !== null)
        .map((t) => ({
          taskId: t.id,
          title: t.title,
          dueDate: t.dueDate!,
        })),
    }
  }

  // ============================================================================
  // MERGE CONTEXTS
  // ============================================================================

  /**
   * Combine multiple context sources into a unified context
   */
  async mergeContexts(options: {
    taskId?: string
    projectId?: string
    userId: string
    additionalContext?: string[]
  }): Promise<MergedContext> {
    const { taskId, projectId, userId, additionalContext = [] } = options

    let taskContext: TaskContext | undefined
    let projectContext: ProjectContext | undefined

    // Build task context if taskId provided
    if (taskId) {
      const tc = await this.buildTaskContext(taskId, userId)
      if (tc) {
        taskContext = tc
      }
    }

    // Build project context if projectId provided, or get it from task
    if (projectId) {
      const pc = await this.buildProjectContext(projectId, userId)
      if (pc) {
        projectContext = pc
      }
    } else if (taskId) {
      // Try to get project from task
      const task = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, taskId),
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt)
        ),
      })

      if (task?.projectId) {
        const pc = await this.buildProjectContext(task.projectId, userId)
        if (pc) {
          projectContext = pc
        }
      }
    }

    // Generate summary
    const summary = this.generateContextSummary(taskContext, projectContext, additionalContext)

    return {
      task: taskContext,
      project: projectContext,
      additionalContext: additionalContext.length > 0 ? additionalContext : undefined,
      summary,
    }
  }

  /**
   * Generate a text summary of the merged context for AI consumption
   */
  private generateContextSummary(
    task?: TaskContext,
    project?: ProjectContext,
    additional?: string[]
  ): string {
    const parts: string[] = []

    if (task) {
      const taskSummary = [
        `Task: "${task.title}"`,
        task.description ? `Description: ${task.description}` : null,
        `Priority: ${task.priority}`,
        `Status: ${task.status}`,
        task.dueDate ? `Due: ${task.dueDate.toLocaleDateString()}` : null,
        task.subtasks.length > 0
          ? `Subtasks (${task.subtasks.filter((s) => s.status === 'completed').length}/${task.subtasks.length} complete): ${task.subtasks.map((s) => s.title).join(', ')}`
          : null,
        task.relatedContext.length > 0
          ? `Related context: ${task.relatedContext.map((c) => `${c.type}: ${c.title ?? 'Untitled'}`).join(', ')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n')

      parts.push(taskSummary)
    }

    if (project) {
      const projectSummary = [
        `Project: "${project.name}"`,
        project.description ? `Description: ${project.description}` : null,
        `Progress: ${project.completedTaskCount}/${project.taskCount} tasks complete`,
        project.highPriorityCount > 0
          ? `High priority tasks remaining: ${project.highPriorityCount}`
          : null,
        project.upcomingDeadlines.length > 0
          ? `Upcoming deadlines: ${project.upcomingDeadlines.map((d) => `${d.title} (${d.dueDate.toLocaleDateString()})`).join(', ')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n')

      parts.push(projectSummary)
    }

    if (additional && additional.length > 0) {
      parts.push(`Additional context:\n${additional.join('\n')}`)
    }

    return parts.join('\n\n')
  }

  // ============================================================================
  // CONTEXT STORAGE
  // ============================================================================

  /**
   * Save context for a task (research, drafts, etc.)
   */
  async saveContext(
    taskId: string,
    userId: string,
    data: {
      type: AIContextType
      title?: string
      content: string
      conversationId?: string
      metadata?: AIContextMetadata
    }
  ): Promise<{ id: string }> {
    // Verify task belongs to user
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt)
      ),
    })

    if (!task) {
      throw new Error('Task not found')
    }

    // Mark previous context of same type as not current
    await db
      .update(aiContext)
      .set({ isCurrent: false, updatedAt: new Date() })
      .where(and(eq(aiContext.taskId, taskId), eq(aiContext.type, data.type)))

    // Get next version number
    const existingContext = await db.query.aiContext.findMany({
      where: and(eq(aiContext.taskId, taskId), eq(aiContext.type, data.type)),
    })

    const nextVersion = existingContext.length + 1

    // Create new context
    const [context] = await db
      .insert(aiContext)
      .values({
        taskId,
        conversationId: data.conversationId ?? null,
        type: data.type,
        title: data.title ?? null,
        content: data.content,
        version: nextVersion,
        isCurrent: true,
        metadata: data.metadata ?? {},
      })
      .returning({ id: aiContext.id })

    return context
  }

  /**
   * Get current context for a task by type
   */
  async getCurrentContext(
    taskId: string,
    type: AIContextType
  ): Promise<{
    id: string
    title: string | null
    content: string
    version: number
    metadata: AIContextMetadata
    createdAt: Date
  } | null> {
    const context = await db.query.aiContext.findFirst({
      where: and(
        eq(aiContext.taskId, taskId),
        eq(aiContext.type, type),
        eq(aiContext.isCurrent, true)
      ),
    })

    if (!context) {
      return null
    }

    return {
      id: context.id,
      title: context.title,
      content: context.content,
      version: context.version ?? 1,
      metadata: (context.metadata ?? {}) as AIContextMetadata,
      createdAt: context.createdAt,
    }
  }

  /**
   * Get all context versions for a task and type
   */
  async getContextHistory(
    taskId: string,
    type: AIContextType
  ): Promise<
    Array<{
      id: string
      title: string | null
      content: string
      version: number
      isCurrent: boolean
      createdAt: Date
    }>
  > {
    const contexts = await db.query.aiContext.findMany({
      where: and(eq(aiContext.taskId, taskId), eq(aiContext.type, type)),
      orderBy: [desc(aiContext.version)],
    })

    return contexts.map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content,
      version: c.version ?? 1,
      isCurrent: c.isCurrent ?? false,
      createdAt: c.createdAt,
    }))
  }

  /**
   * Delete context
   */
  async deleteContext(contextId: string, userId: string): Promise<void> {
    // Verify ownership through task
    const context = await db.query.aiContext.findFirst({
      where: eq(aiContext.id, contextId),
      with: {
        task: true,
      },
    })

    if (!context) {
      throw new Error('Context not found')
    }

    // Check if the task belongs to the user
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, context.taskId), eq(tasks.userId, userId)),
    })

    if (!task) {
      throw new Error('Unauthorized')
    }

    await db.delete(aiContext).where(eq(aiContext.id, contextId))
  }

  /**
   * Restore a previous context version as current
   */
  async restoreContextVersion(
    contextId: string,
    userId: string
  ): Promise<{ id: string }> {
    // Get the context to restore
    const contextToRestore = await db.query.aiContext.findFirst({
      where: eq(aiContext.id, contextId),
    })

    if (!contextToRestore) {
      throw new Error('Context not found')
    }

    // Verify ownership
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, contextToRestore.taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt)
      ),
    })

    if (!task) {
      throw new Error('Unauthorized')
    }

    // Mark all other versions as not current
    await db
      .update(aiContext)
      .set({ isCurrent: false, updatedAt: new Date() })
      .where(
        and(
          eq(aiContext.taskId, contextToRestore.taskId),
          eq(aiContext.type, contextToRestore.type)
        )
      )

    // Mark this version as current
    await db
      .update(aiContext)
      .set({ isCurrent: true, updatedAt: new Date() })
      .where(eq(aiContext.id, contextId))

    return { id: contextId }
  }
}

export const aiContextService = new AIContextService()
