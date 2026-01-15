/**
 * User Service
 * Business logic for user operations
 */

import { db } from '@/lib/db'
import { users, tasks, projects, aiConversations, sessions, accounts, reminders, taskTags, tags, activityLog, aiUsage, aiMessages, aiContext } from '@/lib/db/schema'
import { eq, sql, and, isNull, count } from 'drizzle-orm'
import { z } from 'zod'
import type { UserPreferences } from '@/lib/db/schema'

// Re-export the UserPreferences type from schema for consistency
export type { UserPreferences } from '@/lib/db/schema'

// Schema for updating user profile
export const updateUserProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  image: z.string().url().optional().nullable(),
})

// Schema for updating user preferences
export const updateUserPreferencesSchema = z.object({
  // Display
  theme: z.enum(['light', 'dark', 'system']).optional(),
  defaultView: z.enum(['today', 'upcoming', 'inbox']).optional(),
  sidebarCollapsed: z.boolean().optional(),

  // Date & Time
  timezone: z.string().optional(),
  weekStartsOn: z.union([z.literal(0), z.literal(1), z.literal(6)]).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).optional(),

  // Notifications
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  dailyDigestTime: z.string().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),

  // AI Settings
  aiEnabled: z.boolean().optional(),
  aiSuggestionsEnabled: z.boolean().optional(),
  aiSuggestionFrequency: z.enum(['low', 'medium', 'high']).optional(),
  aiCommunicationStyle: z.enum(['concise', 'detailed']).optional(),
  aiDataLearning: z.boolean().optional(),

  // Task Defaults
  defaultPriority: z.enum(['high', 'medium', 'low', 'none']).optional(),
  defaultProjectId: z.string().uuid().optional().nullable(),
  autoArchiveCompleted: z.boolean().optional(),
  autoArchiveDays: z.number().int().min(1).max(365).optional(),
})

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>
export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesSchema>

// Default preferences for new users
export const defaultUserPreferences: UserPreferences = {
  theme: 'system',
  defaultView: 'today',
  sidebarCollapsed: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  weekStartsOn: 0, // Sunday
  timeFormat: '12h',
  dateFormat: 'MM/DD/YYYY',
  emailNotifications: true,
  pushNotifications: true,
  aiEnabled: true,
  aiSuggestionsEnabled: true,
  aiSuggestionFrequency: 'medium',
  aiCommunicationStyle: 'concise',
  aiDataLearning: true,
  defaultPriority: 'none',
  defaultProjectId: null,
  autoArchiveCompleted: false,
  autoArchiveDays: 30,
}

class UserService {
  /**
   * Get user by ID
   */
  async getUser(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })
    return user ?? null
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    })
    return user ?? null
  }

  /**
   * Get user with full preferences (merged with defaults)
   */
  async getUserWithPreferences(userId: string) {
    const user = await this.getUser(userId)
    if (!user) return null

    return {
      ...user,
      preferences: {
        ...defaultUserPreferences,
        ...(user.preferences || {}),
      },
    }
  }

  /**
   * Update user profile (name, image)
   */
  async updateUserProfile(userId: string, data: UpdateUserProfileInput) {
    const [updated] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning()

    if (!updated) {
      throw new Error('User not found')
    }

    return updated
  }

  /**
   * Update user preferences (partial update, merges with existing)
   */
  async updateUserPreferences(userId: string, preferences: UpdateUserPreferencesInput) {
    const user = await this.getUser(userId)
    if (!user) {
      throw new Error('User not found')
    }

    const currentPreferences = (user.preferences || {}) as UserPreferences
    const mergedPreferences: UserPreferences = {
      ...currentPreferences,
      ...preferences,
    }

    const [updated] = await db
      .update(users)
      .set({
        preferences: mergedPreferences,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning()

    if (!updated) {
      throw new Error('Failed to update preferences')
    }

    // Return merged with defaults for consistent response
    return {
      ...defaultUserPreferences,
      ...mergedPreferences,
    }
  }

  /**
   * Delete user account and all associated data
   */
  async deleteUserAccount(userId: string): Promise<void> {
    // Due to cascade deletes set up in the schema, deleting the user
    // will automatically delete all associated data (tasks, projects, etc.)
    // However, we'll soft delete by setting deletedAt for data recovery options

    const user = await this.getUser(userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Soft delete - set deletedAt timestamp
    await db
      .update(users)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
  }

  /**
   * Permanently delete user account (hard delete)
   * This removes all user data from the database
   */
  async permanentlyDeleteUserAccount(userId: string): Promise<void> {
    const user = await this.getUser(userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Hard delete - this will cascade to all related tables
    await db.delete(users).where(eq(users.id, userId))
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    totalTasks: number
    completedTasks: number
    pendingTasks: number
    totalProjects: number
    aiInteractions: number
  }> {
    // Get task counts
    const [taskStats] = await db
      .select({
        total: count(),
        completed: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'completed' THEN 1 END)`,
        pending: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'pending' OR ${tasks.status} = 'in_progress' THEN 1 END)`,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))

    // Get project count
    const [projectStats] = await db
      .select({ total: count() })
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))

    // Get AI conversation count
    const [aiStats] = await db
      .select({ total: count() })
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))

    return {
      totalTasks: taskStats?.total ?? 0,
      completedTasks: Number(taskStats?.completed ?? 0),
      pendingTasks: Number(taskStats?.pending ?? 0),
      totalProjects: projectStats?.total ?? 0,
      aiInteractions: aiStats?.total ?? 0,
    }
  }

  /**
   * Check if email is available for registration
   */
  async isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean> {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    })

    if (!existingUser) return true
    if (excludeUserId && existingUser.id === excludeUserId) return true
    return false
  }
}

export const userService = new UserService()
