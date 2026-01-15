/**
 * Centralized Validation Schemas
 * Provides reusable Zod schemas and validation utilities for the application
 */

import { z } from 'zod'

// =============================================================================
// COMMON PATTERNS
// =============================================================================

/**
 * UUID v4 pattern for validation
 */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Hex color pattern (#RRGGBB)
 */
export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/

/**
 * Email pattern (simplified but practical)
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// =============================================================================
// BASE SCHEMAS (Primitives)
// =============================================================================

/**
 * UUID schema with validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format')

/**
 * Optional UUID schema
 */
export const optionalUuidSchema = z.string().uuid().optional()

/**
 * Nullable UUID schema
 */
export const nullableUuidSchema = z.string().uuid().nullable().optional()

/**
 * Email schema with normalization
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .transform((email) => email.toLowerCase().trim())

/**
 * URL schema with protocol validation
 */
export const urlSchema = z.string().url('Invalid URL format').refine(
  (url) => {
    try {
      const parsed = new URL(url)
      return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
      return false
    }
  },
  { message: 'URL must use http or https protocol' }
)

/**
 * Optional URL schema
 */
export const optionalUrlSchema = z.string().url().optional().nullable()

/**
 * Hex color schema
 */
export const hexColorSchema = z
  .string()
  .regex(HEX_COLOR_PATTERN, 'Invalid hex color format (use #RRGGBB)')

/**
 * ISO datetime string schema
 */
export const isoDateTimeSchema = z.string().datetime('Invalid ISO datetime format')

/**
 * Optional ISO datetime schema
 */
export const optionalDateTimeSchema = z.string().datetime().nullable().optional()

/**
 * Date string schema (YYYY-MM-DD)
 */
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')

/**
 * Positive integer schema
 */
export const positiveIntSchema = z.coerce.number().int().positive()

/**
 * Non-negative integer schema
 */
export const nonNegativeIntSchema = z.coerce.number().int().nonnegative()

/**
 * Pagination limit schema (1-100)
 */
export const paginationLimitSchema = z.coerce.number().int().positive().max(100).default(50)

/**
 * Pagination offset schema
 */
export const paginationOffsetSchema = z.coerce.number().int().nonnegative().default(0)

// =============================================================================
// ENTITY SCHEMAS
// =============================================================================

/**
 * Task priority enum
 */
export const taskPrioritySchema = z.enum(['high', 'medium', 'low', 'none'])
export type TaskPriority = z.infer<typeof taskPrioritySchema>

/**
 * Task status enum
 */
export const taskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'deleted'])
export type TaskStatus = z.infer<typeof taskStatusSchema>

/**
 * Sort order enum
 */
export const sortOrderSchema = z.enum(['asc', 'desc'])
export type SortOrder = z.infer<typeof sortOrderSchema>

/**
 * Task sort by options
 */
export const taskSortBySchema = z.enum(['createdAt', 'dueDate', 'priority', 'sortOrder', 'updatedAt'])
export type TaskSortBy = z.infer<typeof taskSortBySchema>

/**
 * Project sort by options
 */
export const projectSortBySchema = z.enum(['createdAt', 'name', 'sortOrder', 'updatedAt'])
export type ProjectSortBy = z.infer<typeof projectSortBySchema>

/**
 * Theme preference
 */
export const themeSchema = z.enum(['light', 'dark', 'system'])
export type Theme = z.infer<typeof themeSchema>

/**
 * Default view preference
 */
export const defaultViewSchema = z.enum(['today', 'upcoming', 'inbox'])
export type DefaultView = z.infer<typeof defaultViewSchema>

/**
 * Time format preference
 */
export const timeFormatSchema = z.enum(['12h', '24h'])
export type TimeFormat = z.infer<typeof timeFormatSchema>

/**
 * Date format preference
 */
export const dateFormatSchema = z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'])
export type DateFormat = z.infer<typeof dateFormatSchema>

/**
 * AI suggestion frequency
 */
export const aiSuggestionFrequencySchema = z.enum(['low', 'medium', 'high'])
export type AISuggestionFrequency = z.infer<typeof aiSuggestionFrequencySchema>

/**
 * AI communication style
 */
export const aiCommunicationStyleSchema = z.enum(['concise', 'detailed'])
export type AICommunicationStyle = z.infer<typeof aiCommunicationStyleSchema>

/**
 * AI conversation type
 */
export const aiConversationTypeSchema = z.enum([
  'general',
  'decompose',
  'research',
  'draft',
  'planning',
  'coaching',
])
export type AIConversationType = z.infer<typeof aiConversationTypeSchema>

/**
 * AI context type
 */
export const aiContextTypeSchema = z.enum([
  'research',
  'draft',
  'outline',
  'summary',
  'suggestion',
  'note',
])
export type AIContextType = z.infer<typeof aiContextTypeSchema>

// =============================================================================
// TASK SCHEMAS
// =============================================================================

/**
 * Create task input schema
 */
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be 500 characters or less'),
  description: z.string().max(10000, 'Description must be 10000 characters or less').nullable().optional(),
  priority: taskPrioritySchema.optional().default('none'),
  dueDate: isoDateTimeSchema.nullable().optional(),
  dueDateHasTime: z.boolean().optional().default(false),
  scheduledDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  projectId: nullableUuidSchema,
  parentTaskId: nullableUuidSchema,
  sortOrder: z.number().int().optional().default(0),
  isRecurring: z.boolean().optional().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>

/**
 * Update task input schema
 */
export const updateTaskSchema = createTaskSchema.partial().extend({
  status: taskStatusSchema.optional(),
  actualMinutes: z.number().int().positive().nullable().optional(),
})

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

/**
 * Task filters schema
 */
export const taskFiltersSchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  projectId: nullableUuidSchema,
  dueBefore: isoDateTimeSchema.optional(),
  dueAfter: isoDateTimeSchema.optional(),
  hasNoDueDate: z.boolean().optional(),
  search: z.string().max(255).optional(),
  parentTaskId: nullableUuidSchema,
  includeDeleted: z.boolean().optional().default(false),
  sortBy: taskSortBySchema.optional().default('sortOrder'),
  sortOrder: sortOrderSchema.optional().default('asc'),
  limit: paginationLimitSchema,
  offset: paginationOffsetSchema,
})

export type TaskFilters = z.infer<typeof taskFiltersSchema>

/**
 * Reorder tasks schema
 */
export const reorderTasksSchema = z.object({
  taskIds: z.array(uuidSchema).min(1, 'At least one task ID is required'),
})

export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>

// =============================================================================
// PROJECT SCHEMAS
// =============================================================================

/**
 * Create project input schema
 */
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  description: z.string().max(10000, 'Description must be 10000 characters or less').nullable().optional(),
  color: hexColorSchema.optional().default('#6366f1'),
  icon: z.string().max(50).nullable().optional(),
  parentId: nullableUuidSchema,
  isFavorite: z.boolean().optional().default(false),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>

/**
 * Update project input schema
 */
export const updateProjectSchema = createProjectSchema.partial().extend({
  isArchived: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
})

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>

/**
 * Project filters schema
 */
export const projectFiltersSchema = z.object({
  includeArchived: z.boolean().optional().default(false),
  sortBy: projectSortBySchema.optional().default('sortOrder'),
  sortOrder: sortOrderSchema.optional().default('asc'),
})

export type ProjectFilters = z.infer<typeof projectFiltersSchema>

/**
 * Reorder projects schema
 */
export const reorderProjectsSchema = z.object({
  projectIds: z.array(uuidSchema).min(1, 'At least one project ID is required'),
})

export type ReorderProjectsInput = z.infer<typeof reorderProjectsSchema>

// =============================================================================
// USER SCHEMAS
// =============================================================================

/**
 * Update user profile schema
 */
export const updateUserProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  image: urlSchema.optional().nullable(),
})

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>

/**
 * User preferences schema
 */
export const userPreferencesSchema = z.object({
  // Display
  theme: themeSchema.optional(),
  defaultView: defaultViewSchema.optional(),
  sidebarCollapsed: z.boolean().optional(),

  // Date & Time
  timezone: z.string().optional(),
  weekStartsOn: z.union([z.literal(0), z.literal(1), z.literal(6)]).optional(),
  timeFormat: timeFormatSchema.optional(),
  dateFormat: dateFormatSchema.optional(),

  // Notifications
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  dailyDigestTime: z.string().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),

  // AI Settings
  aiEnabled: z.boolean().optional(),
  aiSuggestionsEnabled: z.boolean().optional(),
  aiSuggestionFrequency: aiSuggestionFrequencySchema.optional(),
  aiCommunicationStyle: aiCommunicationStyleSchema.optional(),
  aiDataLearning: z.boolean().optional(),

  // Task Defaults
  defaultPriority: taskPrioritySchema.optional(),
  defaultProjectId: nullableUuidSchema,
  autoArchiveCompleted: z.boolean().optional(),
  autoArchiveDays: z.number().int().min(1).max(365).optional(),
})

export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>

// =============================================================================
// AI SCHEMAS
// =============================================================================

/**
 * Chat message role
 */
export const messageRoleSchema = z.enum(['user', 'assistant', 'system'])
export type MessageRole = z.infer<typeof messageRoleSchema>

/**
 * Conversation history message schema
 */
export const conversationHistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

export type ConversationHistoryMessage = z.infer<typeof conversationHistoryMessageSchema>

/**
 * AI chat request schema
 */
export const chatRequestSchema = z.object({
  taskId: optionalUuidSchema,
  projectId: optionalUuidSchema,
  conversationId: optionalUuidSchema,
  message: z.string().min(1, 'Message is required').max(10000, 'Message must be 10000 characters or less'),
  conversationType: aiConversationTypeSchema.optional().default('general'),
  conversationHistory: z.array(conversationHistoryMessageSchema).max(50).optional(),
  stream: z.boolean().optional().default(true),
})

export type ChatRequestInput = z.infer<typeof chatRequestSchema>

/**
 * AI context metadata schema
 */
export const aiContextMetadataSchema = z.object({
  sources: z
    .array(
      z.object({
        url: z.string().optional(),
        title: z.string().optional(),
        snippet: z.string().optional(),
      })
    )
    .optional(),
  draftType: z.enum(['email', 'document', 'outline', 'general']).optional(),
  wordCount: z.number().optional(),
  suggestionType: z.enum(['subtask', 'priority', 'deadline', 'approach']).optional(),
  applied: z.boolean().optional(),
  appliedAt: z.string().optional(),
  model: z.string().optional(),
  promptVersion: z.string().optional(),
})

export type AIContextMetadata = z.infer<typeof aiContextMetadataSchema>

/**
 * Create AI context schema
 */
export const createAIContextSchema = z.object({
  taskId: uuidSchema,
  conversationId: optionalUuidSchema,
  type: aiContextTypeSchema,
  title: z.string().max(255).optional(),
  content: z.string().min(1, 'Content is required'),
  metadata: aiContextMetadataSchema.optional(),
})

export type CreateAIContextInput = z.infer<typeof createAIContextSchema>

/**
 * Update AI context schema
 */
export const updateAIContextSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().min(1).optional(),
  isCurrent: z.boolean().optional(),
  metadata: aiContextMetadataSchema.optional(),
})

export type UpdateAIContextInput = z.infer<typeof updateAIContextSchema>

/**
 * AI context query schema
 */
export const aiContextQuerySchema = z.object({
  taskId: uuidSchema,
  type: aiContextTypeSchema.optional(),
  currentOnly: z.coerce.boolean().optional().default(true),
})

export type AIContextQuery = z.infer<typeof aiContextQuerySchema>

// =============================================================================
// SEARCH SCHEMAS
// =============================================================================

/**
 * Search query schema
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(255),
  type: z.enum(['all', 'tasks', 'projects']).optional().default('all'),
  limit: paginationLimitSchema.default(20),
})

export type SearchQuery = z.infer<typeof searchQuerySchema>

// =============================================================================
// REMINDER SCHEMAS
// =============================================================================

/**
 * Reminder type
 */
export const reminderTypeSchema = z.enum(['at_time', 'before_due'])
export type ReminderType = z.infer<typeof reminderTypeSchema>

/**
 * Create reminder schema
 */
export const createReminderSchema = z.object({
  taskId: uuidSchema,
  type: reminderTypeSchema,
  reminderAt: isoDateTimeSchema,
  minutesBefore: z.number().int().nonnegative().optional(),
})

export type CreateReminderInput = z.infer<typeof createReminderSchema>

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate a value against a schema and return typed result
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(value)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * Validate or throw
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, value: unknown): T {
  return schema.parse(value)
}

/**
 * Create a partial version of a schema where all fields are optional
 */
export function makePartial<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.partial()
}

/**
 * Format Zod error for API response
 */
export function formatZodError(error: z.ZodError): Array<{
  path: string
  message: string
  code: string
}> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }))
}
