/**
 * User Type Definitions
 */

import { z } from 'zod'

/**
 * User preferences schema
 */
export const userPreferencesSchema = z.object({
  // Display
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  defaultView: z.enum(['today', 'upcoming', 'inbox']).default('today'),
  sidebarCollapsed: z.boolean().default(false),

  // Date & Time
  timezone: z.string().optional(),
  weekStartsOn: z.union([z.literal(0), z.literal(1), z.literal(6)]).default(0),
  timeFormat: z.enum(['12h', '24h']).default('12h'),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).default('MM/DD/YYYY'),

  // Notifications
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  dailyDigestTime: z.string().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),

  // AI Settings
  aiEnabled: z.boolean().default(true),
  aiSuggestionsEnabled: z.boolean().default(true),
  aiSuggestionFrequency: z.enum(['low', 'medium', 'high']).default('medium'),
  aiCommunicationStyle: z.enum(['concise', 'detailed']).default('concise'),
  aiDataLearning: z.boolean().default(true),

  // Task Defaults
  defaultPriority: z.enum(['high', 'medium', 'low', 'none']).default('none'),
  defaultProjectId: z.string().uuid().nullable().optional(),
  autoArchiveCompleted: z.boolean().default(false),
  autoArchiveDays: z.number().int().positive().default(30),
})

export type UserPreferences = z.infer<typeof userPreferencesSchema>

/**
 * Base user schema
 */
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  image: z.string().url().nullable().optional(),
  emailVerified: z.date().nullable().optional(),
  preferences: userPreferencesSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
})

export type User = z.infer<typeof userSchema>

/**
 * Schema for updating user profile
 */
export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  image: z.string().url().optional(),
  preferences: userPreferencesSchema.partial().optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

/**
 * User statistics
 */
export interface UserStats {
  totalTasks: number
  completedTasks: number
  totalProjects: number
  aiInteractions: number
  streakDays: number
}

/**
 * User session data
 */
export interface SessionUser {
  id: string
  email: string
  name: string | null
  image: string | null
}
