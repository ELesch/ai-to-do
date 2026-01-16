/**
 * Services Index
 * Re-exports all services for convenient imports
 */

export {
  taskService,
  createTaskSchema,
  updateTaskSchema,
  taskFiltersSchema,
  reorderTasksSchema,
} from './task.service'
export type {
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  ReorderTasksInput,
  TaskWithSubtasks,
} from './task.service'

export {
  projectService,
  createProjectSchema,
  updateProjectSchema,
  projectFiltersSchema,
  reorderProjectsSchema,
} from './project.service'
export type {
  Project,
  ProjectWithCounts,
  ProjectStats,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFilters,
  ReorderProjectsInput,
} from './project.service'

export { aiService } from './ai.service'

export { aiUsageService } from './ai-usage.service'

export { aiContextService } from './ai-context.service'
export type {
  TaskContext,
  ProjectContext,
  MergedContext,
} from './ai-context.service'

export {
  userService,
  updateUserProfileSchema,
  updateUserPreferencesSchema,
  defaultUserPreferences,
} from './user.service'
export type {
  UserPreferences,
  UpdateUserProfileInput,
  UpdateUserPreferencesInput,
} from './user.service'

export { notificationService } from './notification.service'
export type { Notification, CreateReminderInput } from './notification.service'

export {
  reminderService,
  createReminderSchema,
  reminderPresetSchema,
  calculateReminderTime,
  isValidReminderTime,
} from './reminder.service'
export type {
  CreateReminderInput as ReminderInput,
  ReminderPreset,
  ReminderWithTask,
} from './reminder.service'

export {
  createRecurrenceRule,
  calculateNextOccurrence,
  generateOccurrences,
  describeRecurrenceRule,
  isValidRecurrenceRule,
  RECURRENCE_PRESETS,
} from './recurring.service'
export type {
  RecurrenceFrequency,
  DayOfWeek,
  CreateRecurrenceRuleOptions,
  NextOccurrenceResult,
  RecurrencePreset,
} from './recurring.service'

export { searchService, searchQuerySchema } from './search.service'
export type {
  SearchQuery,
  TaskSearchResult,
  ProjectSearchResult,
  SearchResults,
  RecentItem,
} from './search.service'

export { dashboardService } from './dashboard.service'
export type {
  ProductivityStats,
  PriorityBreakdown,
  RecentCompletion,
  DashboardAnalytics,
} from './dashboard.service'
