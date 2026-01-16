// lib/db/schema.ts

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
  inet,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================================================
// ENUMS
// ============================================================================

export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'in_progress',
  'completed',
  'deleted',
])

export const taskPriorityEnum = pgEnum('task_priority', [
  'high',
  'medium',
  'low',
  'none',
])

export const messageRoleEnum = pgEnum('message_role', [
  'user',
  'assistant',
  'system',
])

export const conversationTypeEnum = pgEnum('conversation_type', [
  'general',
  'decompose',
  'research',
  'draft',
  'planning',
  'coaching',
])

export const aiContextTypeEnum = pgEnum('ai_context_type', [
  'research',
  'draft',
  'outline',
  'summary',
  'suggestion',
  'note',
])

export const reminderTypeEnum = pgEnum('reminder_type', [
  'due_date',
  'scheduled',
  'custom',
  'follow_up',
])

// ============================================================================
// CORE ENTITIES
// ============================================================================

// Users
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }),
    passwordHash: varchar('password_hash', { length: 255 }),
    emailVerified: timestamp('email_verified', { withTimezone: true }),
    image: text('image'),
    preferences: jsonb('preferences').$type<UserPreferences>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
  })
)

// Projects
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'), // Self-reference handled via relations
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 7 }).default('#6366f1'),
    icon: varchar('icon', { length: 50 }),
    sortOrder: integer('sort_order').default(0),
    isArchived: boolean('is_archived').default(false),
    isFavorite: boolean('is_favorite').default(false),
    settings: jsonb('settings').$type<ProjectSettings>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index('projects_user_id_idx').on(table.userId),
    parentIdIdx: index('projects_parent_id_idx').on(table.parentId),
  })
)

// Tasks
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    parentTaskId: uuid('parent_task_id'), // Self-reference handled via relations

    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    status: taskStatusEnum('status').default('pending').notNull(),
    priority: taskPriorityEnum('priority').default('none').notNull(),

    dueDate: timestamp('due_date', { withTimezone: true }),
    dueDateHasTime: boolean('due_date_has_time').default(false),
    scheduledDate: date('scheduled_date'),
    startDate: date('start_date'),

    estimatedMinutes: integer('estimated_minutes'),
    actualMinutes: integer('actual_minutes'),

    sortOrder: integer('sort_order').default(0),

    isRecurring: boolean('is_recurring').default(false),
    recurrenceRule: jsonb('recurrence_rule').$type<RecurrenceRule>(),
    recurrenceParentId: uuid('recurrence_parent_id'), // Self-reference handled via relations

    metadata: jsonb('metadata').$type<TaskMetadata>().default({}),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    userIdStatusIdx: index('tasks_user_id_status_idx').on(
      table.userId,
      table.status
    ),
    projectIdIdx: index('tasks_project_id_idx').on(table.projectId),
    parentTaskIdIdx: index('tasks_parent_task_id_idx').on(table.parentTaskId),
    dueDateIdx: index('tasks_due_date_idx').on(table.userId, table.dueDate),
    scheduledDateIdx: index('tasks_scheduled_date_idx').on(
      table.userId,
      table.scheduledDate
    ),
  })
)

// Tags
export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 7 }).default('#6b7280'),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index('tags_user_id_idx').on(table.userId),
    uniqueNamePerUser: uniqueIndex('tags_user_name_idx').on(
      table.userId,
      table.name
    ),
  })
)

// Task Tags (Junction)
export const taskTags = pgTable(
  'task_tags',
  {
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.taskId, table.tagId] }),
    taskIdIdx: index('task_tags_task_id_idx').on(table.taskId),
    tagIdIdx: index('task_tags_tag_id_idx').on(table.tagId),
  })
)

// Reminders
export const reminders = pgTable(
  'reminders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),
    type: reminderTypeEnum('type').notNull(),
    isSent: boolean('is_sent').default(false),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    channels: text('channels').array().default(['push']),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    remindAtIdx: index('reminders_remind_at_idx').on(table.remindAt),
    taskIdIdx: index('reminders_task_id_idx').on(table.taskId),
  })
)

// Activity Log
export const activityLog = pgTable(
  'activity_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    changes: jsonb('changes').$type<ActivityChanges>(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    entityIdx: index('activity_log_entity_idx').on(
      table.entityType,
      table.entityId
    ),
    userCreatedIdx: index('activity_log_user_created_idx').on(
      table.userId,
      table.createdAt
    ),
  })
)

// ============================================================================
// AI ENTITIES
// ============================================================================

// AI Conversations
export const aiConversations = pgTable(
  'ai_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 255 }),
    type: conversationTypeEnum('type').default('general').notNull(),
    isArchived: boolean('is_archived').default(false),
    totalTokens: integer('total_tokens').default(0),
    messageCount: integer('message_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index('ai_conversations_user_id_idx').on(table.userId),
    taskIdIdx: index('ai_conversations_task_id_idx').on(table.taskId),
  })
)

// AI Messages
export const aiMessages = pgTable(
  'ai_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => aiConversations.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),
    content: text('content').notNull(),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    model: varchar('model', { length: 100 }),
    provider: varchar('provider', { length: 50 }),
    metadata: jsonb('metadata').$type<MessageMetadata>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    conversationIdIdx: index('ai_messages_conversation_id_idx').on(
      table.conversationId
    ),
  })
)

// AI Context
export const aiContext = pgTable(
  'ai_context',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id').references(
      () => aiConversations.id,
      { onDelete: 'set null' }
    ),
    type: aiContextTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }),
    content: text('content').notNull(),
    version: integer('version').default(1),
    isCurrent: boolean('is_current').default(true),
    metadata: jsonb('metadata').$type<AIContextMetadata>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    taskIdIdx: index('ai_context_task_id_idx').on(table.taskId),
    typeIdx: index('ai_context_type_idx').on(table.type),
  })
)

// AI Usage
export const aiUsage = pgTable(
  'ai_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    requests: integer('requests').default(0),
    inputTokens: integer('input_tokens').default(0),
    outputTokens: integer('output_tokens').default(0),
    usageByFeature: jsonb('usage_by_feature')
      .$type<UsageByFeature>()
      .default({}),
    usageByProvider: jsonb('usage_by_provider')
      .$type<UsageByProvider>()
      .default({}),
    estimatedCostUsd: varchar('estimated_cost_usd', { length: 20 }).default(
      '0'
    ),
    costByProvider: jsonb('cost_by_provider')
      .$type<CostByProvider>()
      .default({}),
    warningsSent: jsonb('warnings_sent').$type<WarningsSent>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userPeriodIdx: uniqueIndex('ai_usage_user_period_idx').on(
      table.userId,
      table.periodStart,
      table.periodEnd
    ),
  })
)

// ============================================================================
// AUTH ENTITIES
// ============================================================================

// Accounts (OAuth)
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    providerAccountId: varchar('provider_account_id', {
      length: 255,
    }).notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'),
    tokenType: varchar('token_type', { length: 50 }),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    providerAccountIdx: uniqueIndex('accounts_provider_account_idx').on(
      table.provider,
      table.providerAccountId
    ),
    userIdIdx: index('accounts_user_id_idx').on(table.userId),
  })
)

// Sessions
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
    expiresIdx: index('sessions_expires_idx').on(table.expires),
  })
)

// Verification Tokens
export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  })
)

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  tasks: many(tasks),
  tags: many(tags),
  aiConversations: many(aiConversations),
  aiUsage: many(aiUsage),
  accounts: many(accounts),
  sessions: many(sessions),
  activityLog: many(activityLog),
  reminders: many(reminders),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  parent: one(projects, {
    fields: [projects.parentId],
    references: [projects.id],
    relationName: 'projectParentChild',
  }),
  children: many(projects, { relationName: 'projectParentChild' }),
  tasks: many(tasks),
  aiConversations: many(aiConversations),
}))

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: 'taskParentChild',
  }),
  subtasks: many(tasks, { relationName: 'taskParentChild' }),
  recurrenceParent: one(tasks, {
    fields: [tasks.recurrenceParentId],
    references: [tasks.id],
    relationName: 'taskRecurrence',
  }),
  recurrenceInstances: many(tasks, { relationName: 'taskRecurrence' }),
  taskTags: many(taskTags),
  reminders: many(reminders),
  aiConversations: many(aiConversations),
  aiContext: many(aiContext),
}))

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, { fields: [tags.userId], references: [users.id] }),
  taskTags: many(taskTags),
}))

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, { fields: [taskTags.taskId], references: [tasks.id] }),
  tag: one(tags, { fields: [taskTags.tagId], references: [tags.id] }),
}))

export const remindersRelations = relations(reminders, ({ one }) => ({
  task: one(tasks, { fields: [reminders.taskId], references: [tasks.id] }),
  user: one(users, { fields: [reminders.userId], references: [users.id] }),
}))

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, { fields: [activityLog.userId], references: [users.id] }),
}))

export const aiConversationsRelations = relations(
  aiConversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [aiConversations.userId],
      references: [users.id],
    }),
    task: one(tasks, {
      fields: [aiConversations.taskId],
      references: [tasks.id],
    }),
    project: one(projects, {
      fields: [aiConversations.projectId],
      references: [projects.id],
    }),
    messages: many(aiMessages),
    aiContext: many(aiContext),
  })
)

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}))

export const aiContextRelations = relations(aiContext, ({ one }) => ({
  task: one(tasks, { fields: [aiContext.taskId], references: [tasks.id] }),
  conversation: one(aiConversations, {
    fields: [aiContext.conversationId],
    references: [aiConversations.id],
  }),
}))

export const aiUsageRelations = relations(aiUsage, ({ one }) => ({
  user: one(users, { fields: [aiUsage.userId], references: [users.id] }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UserPreferences {
  // Display
  theme?: 'light' | 'dark' | 'system'
  defaultView?: 'today' | 'upcoming' | 'inbox'
  sidebarCollapsed?: boolean

  // Date & Time
  timezone?: string
  weekStartsOn?: 0 | 1 | 6
  timeFormat?: '12h' | '24h'
  dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'

  // Notifications
  emailNotifications?: boolean
  pushNotifications?: boolean
  dailyDigestTime?: string
  quietHoursStart?: string
  quietHoursEnd?: string

  // AI Settings
  aiEnabled?: boolean
  aiSuggestionsEnabled?: boolean
  aiSuggestionFrequency?: 'low' | 'medium' | 'high'
  aiCommunicationStyle?: 'concise' | 'detailed'
  aiDataLearning?: boolean

  // Provider preferences
  aiPreferredProvider?: string
  aiPreferredModel?: string
  aiCostWarningsEnabled?: boolean
  aiMonthlyCostLimit?: number

  // Task Defaults
  defaultPriority?: 'high' | 'medium' | 'low' | 'none'
  defaultProjectId?: string | null
  autoArchiveCompleted?: boolean
  autoArchiveDays?: number
}

export interface ProjectSettings {
  defaultPriority?: 'high' | 'medium' | 'low' | 'none'
  defaultTags?: string[]
  aiContextPrompt?: string
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number

  // Weekly options
  daysOfWeek?: number[]

  // Monthly options
  dayOfMonth?: number
  weekOfMonth?: number
  dayOfWeekInMonth?: number

  // End conditions (one of)
  endDate?: string
  count?: number

  // Metadata
  createdAt: string
  lastGeneratedAt?: string
  nextOccurrence?: string
}

export interface TaskMetadata {
  // Source tracking
  source?: 'manual' | 'ai_suggested' | 'recurring' | 'import'
  importedFrom?: string

  // AI interaction
  aiGenerated?: boolean
  aiDecomposedFrom?: string

  // Attachments
  attachments?: Array<{
    id: string
    name: string
    url: string
    type: string
    size: number
    uploadedAt: string
  }>

  // Links
  links?: Array<{
    url: string
    title?: string
    favicon?: string
  }>

  // Related tasks
  relatedTaskIds?: string[]
  blockedByTaskIds?: string[]
  blockingTaskIds?: string[]

  // Time tracking sessions
  timeSessions?: Array<{
    startedAt: string
    endedAt?: string
    minutes: number
  }>
}

export interface MessageMetadata {
  // Processing info
  processingTimeMs?: number

  // Provider info
  provider?: string | null

  // For assistant messages
  finishReason?: 'stop' | 'max_tokens' | 'error'

  // For user messages
  attachedFiles?: string[]

  // Actions taken
  actions?: Array<{
    type: 'created_subtask' | 'saved_research' | 'saved_draft'
    entityId: string
  }>

  // Feedback
  userRating?: 'helpful' | 'not_helpful'
  userFeedback?: string
}

export interface AIContextMetadata {
  // For research
  sources?: Array<{
    url?: string
    title?: string
    snippet?: string
  }>

  // For drafts
  draftType?: 'email' | 'document' | 'outline' | 'general'
  wordCount?: number

  // For suggestions
  suggestionType?: 'subtask' | 'priority' | 'deadline' | 'approach'
  applied?: boolean
  appliedAt?: string

  // Generation info
  model?: string
  promptVersion?: string
}

export interface UsageByFeature {
  chat?: { requests: number; tokens: number }
  decompose?: { requests: number; tokens: number }
  research?: { requests: number; tokens: number }
  draft?: { requests: number; tokens: number }
  suggestions?: { requests: number; tokens: number }
}

export interface UsageByProvider {
  [provider: string]: {
    requests: number
    inputTokens: number
    outputTokens: number
    byModel: {
      [model: string]: {
        requests: number
        inputTokens: number
        outputTokens: number
      }
    }
  }
}

export interface CostByProvider {
  [provider: string]: number
}

export interface WarningsSent {
  quota80Percent?: string
  quota90Percent?: string
  quota95Percent?: string
  dailyCostWarning?: string
  monthlyCostWarning?: string
}

export interface ActivityChanges {
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  fields?: string[]
}

// ============================================================================
// TYPE EXPORTS FOR TABLE INFERENCE
// ============================================================================

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert

export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert

export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert

export type TaskTag = typeof taskTags.$inferSelect
export type NewTaskTag = typeof taskTags.$inferInsert

export type Reminder = typeof reminders.$inferSelect
export type NewReminder = typeof reminders.$inferInsert

export type ActivityLogEntry = typeof activityLog.$inferSelect
export type NewActivityLogEntry = typeof activityLog.$inferInsert

export type AIConversation = typeof aiConversations.$inferSelect
export type NewAIConversation = typeof aiConversations.$inferInsert

export type AIMessage = typeof aiMessages.$inferSelect
export type NewAIMessage = typeof aiMessages.$inferInsert

export type AIContext = typeof aiContext.$inferSelect
export type NewAIContext = typeof aiContext.$inferInsert

export type AIUsage = typeof aiUsage.$inferSelect
export type NewAIUsage = typeof aiUsage.$inferInsert

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert

export type VerificationToken = typeof verificationTokens.$inferSelect
export type NewVerificationToken = typeof verificationTokens.$inferInsert
