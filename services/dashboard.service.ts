/**
 * Dashboard Analytics Service
 * Computes productivity metrics and insights for the dashboard
 */

import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { eq, and, gte, lte, isNull, sql, desc } from 'drizzle-orm'

// ============================================================================
// TYPES
// ============================================================================

export interface ProductivityStats {
  completedThisWeek: number
  completedLastWeek: number
  weekOverWeekChange: number // percentage change
  streak: number // consecutive days with completions
  totalPending: number
  totalCompleted: number
}

export interface PriorityBreakdown {
  high: number
  medium: number
  low: number
  none: number
}

export interface RecentCompletion {
  id: string
  title: string
  completedAt: Date
  priority: string
}

export interface DashboardAnalytics {
  productivity: ProductivityStats
  priorityBreakdown: PriorityBreakdown
  recentCompletions: RecentCompletion[]
  onTimeRate: number // percentage of tasks completed by due date
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class DashboardService {
  /**
   * Get comprehensive dashboard analytics for a user
   */
  async getAnalytics(userId: string): Promise<DashboardAnalytics> {
    const [productivity, priorityBreakdown, recentCompletions, onTimeRate] =
      await Promise.all([
        this.getProductivityStats(userId),
        this.getPriorityBreakdown(userId),
        this.getRecentCompletions(userId),
        this.getOnTimeRate(userId),
      ])

    return {
      productivity,
      priorityBreakdown,
      recentCompletions,
      onTimeRate,
    }
  }

  /**
   * Get productivity statistics
   */
  async getProductivityStats(userId: string): Promise<ProductivityStats> {
    const now = new Date()

    // Calculate week boundaries
    const startOfThisWeek = new Date(now)
    startOfThisWeek.setHours(0, 0, 0, 0)
    startOfThisWeek.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)

    const startOfLastWeek = new Date(startOfThisWeek)
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

    // Get completed this week
    const thisWeekResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'completed'),
          gte(tasks.completedAt, startOfThisWeek),
          isNull(tasks.deletedAt)
        )
      )

    // Get completed last week
    const lastWeekResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'completed'),
          gte(tasks.completedAt, startOfLastWeek),
          lte(tasks.completedAt, startOfThisWeek),
          isNull(tasks.deletedAt)
        )
      )

    // Get total pending
    const pendingResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'pending'),
          isNull(tasks.deletedAt)
        )
      )

    // Get total completed (all time)
    const totalCompletedResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'completed'),
          isNull(tasks.deletedAt)
        )
      )

    const completedThisWeek = thisWeekResult[0]?.count ?? 0
    const completedLastWeek = lastWeekResult[0]?.count ?? 0
    const totalPending = pendingResult[0]?.count ?? 0
    const totalCompleted = totalCompletedResult[0]?.count ?? 0

    // Calculate week-over-week change
    let weekOverWeekChange = 0
    if (completedLastWeek > 0) {
      weekOverWeekChange = Math.round(
        ((completedThisWeek - completedLastWeek) / completedLastWeek) * 100
      )
    } else if (completedThisWeek > 0) {
      weekOverWeekChange = 100
    }

    // Calculate streak
    const streak = await this.calculateStreak(userId)

    return {
      completedThisWeek,
      completedLastWeek,
      weekOverWeekChange,
      streak,
      totalPending,
      totalCompleted,
    }
  }

  /**
   * Calculate consecutive days with task completions
   */
  private async calculateStreak(userId: string): Promise<number> {
    // Get all completion dates in the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const completions = await db
      .select({
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'completed'),
          gte(tasks.completedAt, thirtyDaysAgo),
          isNull(tasks.deletedAt)
        )
      )

    if (completions.length === 0) return 0

    // Get unique dates with completions
    const completionDates = new Set<string>()
    completions.forEach((c) => {
      if (c.completedAt) {
        const dateStr = c.completedAt.toISOString().split('T')[0]
        completionDates.add(dateStr)
      }
    })

    // Calculate streak starting from today or yesterday
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Start counting from today or yesterday
    let streak = 0
    let currentDate = new Date(today)

    // Check if streak should start from today or yesterday
    if (!completionDates.has(todayStr)) {
      if (!completionDates.has(yesterdayStr)) {
        return 0 // Streak broken
      }
      currentDate = new Date(yesterday)
    }

    // Count consecutive days
    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0]
      if (completionDates.has(dateStr)) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  }

  /**
   * Get breakdown of pending tasks by priority
   */
  async getPriorityBreakdown(userId: string): Promise<PriorityBreakdown> {
    const result = await db
      .select({
        priority: tasks.priority,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'pending'),
          isNull(tasks.deletedAt)
        )
      )
      .groupBy(tasks.priority)

    const breakdown: PriorityBreakdown = {
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    }

    result.forEach((row) => {
      if (row.priority in breakdown) {
        breakdown[row.priority as keyof PriorityBreakdown] = row.count
      }
    })

    return breakdown
  }

  /**
   * Get recently completed tasks
   */
  async getRecentCompletions(
    userId: string,
    limit: number = 5
  ): Promise<RecentCompletion[]> {
    const result = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        completedAt: tasks.completedAt,
        priority: tasks.priority,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'completed'),
          isNull(tasks.deletedAt)
        )
      )
      .orderBy(desc(tasks.completedAt))
      .limit(limit)

    return result
      .filter((r) => r.completedAt !== null)
      .map((r) => ({
        id: r.id,
        title: r.title,
        completedAt: r.completedAt!,
        priority: r.priority,
      }))
  }

  /**
   * Calculate percentage of tasks completed on time
   */
  async getOnTimeRate(userId: string): Promise<number> {
    // Get tasks that had a due date and are completed
    const result = await db
      .select({
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'completed'),
          isNull(tasks.deletedAt)
        )
      )

    const tasksWithDueDate = result.filter(
      (t) => t.dueDate !== null && t.completedAt !== null
    )

    if (tasksWithDueDate.length === 0) return 100 // No tasks with due dates

    const onTimeCount = tasksWithDueDate.filter((t) => {
      const dueDate = new Date(t.dueDate!)
      dueDate.setHours(23, 59, 59, 999) // End of due date
      return t.completedAt! <= dueDate
    }).length

    return Math.round((onTimeCount / tasksWithDueDate.length) * 100)
  }
}

export const dashboardService = new DashboardService()
