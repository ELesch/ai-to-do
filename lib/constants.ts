/**
 * Application Constants
 * Centralized configuration values used throughout the app
 */

/**
 * Task priority levels with display properties
 */
export const TASK_PRIORITIES = {
  high: {
    value: 'high',
    label: 'High',
    color: 'red',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
  },
  medium: {
    value: 'medium',
    label: 'Medium',
    color: 'yellow',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-700',
  },
  low: {
    value: 'low',
    label: 'Low',
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
  },
  none: {
    value: 'none',
    label: 'None',
    color: 'gray',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
  },
} as const

export type TaskPriority = keyof typeof TASK_PRIORITIES

/**
 * Task status values
 */
export const TASK_STATUSES = {
  pending: { value: 'pending', label: 'Pending' },
  in_progress: { value: 'in_progress', label: 'In Progress' },
  completed: { value: 'completed', label: 'Completed' },
  deleted: { value: 'deleted', label: 'Deleted' },
} as const

export type TaskStatus = keyof typeof TASK_STATUSES

/**
 * Default project colors
 */
export const PROJECT_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
] as const

/**
 * AI model configuration
 */
export const AI_CONFIG = {
  defaultModel: 'claude-3-sonnet-20240229',
  fallbackModel: 'gpt-4-turbo-preview',
  maxTokens: {
    chat: 1024,
    decompose: 512,
    research: 2048,
    draft: 2048,
  },
  temperature: {
    default: 0.7,
    creative: 0.9,
    precise: 0.3,
  },
  rateLimit: {
    requestsPerMinute: 20,
    tokensPerDay: 100000,
  },
} as const

/**
 * Pagination defaults
 */
export const PAGINATION = {
  defaultLimit: 50,
  maxLimit: 100,
} as const

/**
 * Cache TTL values (in seconds)
 */
export const CACHE_TTL = {
  short: 60, // 1 minute
  medium: 300, // 5 minutes
  long: 3600, // 1 hour
  day: 86400, // 24 hours
} as const

/**
 * Application routes
 */
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  today: '/today',
  upcoming: '/upcoming',
  projects: '/projects',
  settings: '/settings',
  task: (id: string) => `/task/${id}`,
  project: (id: string) => `/projects/${id}`,
} as const

/**
 * Keyboard shortcuts
 */
export const KEYBOARD_SHORTCUTS = {
  commandPalette: 'cmd+k',
  newTask: 'n',
  search: '/',
  goToToday: 'g t',
  goToUpcoming: 'g u',
  goToProjects: 'g p',
  toggleAI: 'cmd+j',
  toggleSidebar: 'cmd+b',
} as const
