/**
 * Date Utilities
 * Helper functions for date manipulation and formatting
 */

/**
 * Format a date for display
 */
export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  })
}

/**
 * Format a date relative to today (Today, Tomorrow, etc.)
 */
export function formatRelativeDate(date: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const target = new Date(date)
  target.setHours(0, 0, 0, 0)

  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`

  return formatDate(date)
}

/**
 * Get start of day
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Get end of day
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
  return date < new Date()
}

/**
 * Check if a date is overdue (past and not today)
 */
export function isOverdue(date: Date): boolean {
  return isPast(date) && !isToday(date)
}

/**
 * Get the start of the current week
 */
export function startOfWeek(date: Date, weekStartsOn: 0 | 1 | 6 = 0): Date {
  const result = new Date(date)
  const day = result.getDay()
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn
  result.setDate(result.getDate() - diff)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}
