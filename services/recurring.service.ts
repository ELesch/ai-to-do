/**
 * Recurring Service
 * Business logic for recurring tasks with recurrence rule calculations
 *
 * NOTE: This is a basic structure implementation. Full functionality
 * for generating recurring task instances will be implemented in a later sprint.
 */

import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfDay,
  isBefore,
  isAfter,
  setDate,
  getDay,
  setDay,
  getWeekOfMonth,
  parseISO,
} from 'date-fns'
import type { RecurrenceRule } from '@/lib/db/schema'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Recurrence frequency options
 */
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

/**
 * Day of week (0 = Sunday, 6 = Saturday)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

/**
 * Options for creating a recurrence rule
 */
export interface CreateRecurrenceRuleOptions {
  frequency: RecurrenceFrequency
  interval?: number

  // Weekly options
  daysOfWeek?: DayOfWeek[]

  // Monthly options
  dayOfMonth?: number
  weekOfMonth?: number
  dayOfWeekInMonth?: DayOfWeek

  // End conditions (one of)
  endDate?: Date | string
  count?: number
}

/**
 * Result of calculating next occurrence
 */
export interface NextOccurrenceResult {
  nextDate: Date
  isComplete: boolean // True if no more occurrences
  occurrenceNumber: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a date is a valid occurrence based on days of week
 */
function isValidDayOfWeek(date: Date, daysOfWeek?: number[]): boolean {
  if (!daysOfWeek || daysOfWeek.length === 0) {
    return true
  }
  return daysOfWeek.includes(getDay(date))
}

/**
 * Get the next valid day of week from a given date
 */
function getNextValidDayOfWeek(
  startDate: Date,
  daysOfWeek: number[],
  skipCurrent = false
): Date {
  let current = startDate
  if (skipCurrent) {
    current = addDays(current, 1)
  }

  for (let i = 0; i < 7; i++) {
    if (daysOfWeek.includes(getDay(current))) {
      return current
    }
    current = addDays(current, 1)
  }

  return current
}

/**
 * Get the nth occurrence of a day of week in a month
 * e.g., 2nd Tuesday of the month
 */
function getNthDayOfWeekInMonth(
  year: number,
  month: number,
  dayOfWeek: number,
  weekNumber: number
): Date {
  // Start from the first day of the month
  const firstOfMonth = new Date(year, month, 1)

  // Find the first occurrence of the day of week
  let firstOccurrence = firstOfMonth
  while (getDay(firstOccurrence) !== dayOfWeek) {
    firstOccurrence = addDays(firstOccurrence, 1)
  }

  // Add weeks to get to the nth occurrence
  return addDays(firstOccurrence, (weekNumber - 1) * 7)
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Create a recurrence rule from options
 */
export function createRecurrenceRule(options: CreateRecurrenceRuleOptions): RecurrenceRule {
  const rule: RecurrenceRule = {
    frequency: options.frequency,
    interval: options.interval ?? 1,
    createdAt: new Date().toISOString(),
  }

  // Weekly options
  if (options.daysOfWeek && options.daysOfWeek.length > 0) {
    rule.daysOfWeek = options.daysOfWeek
  }

  // Monthly options
  if (options.dayOfMonth !== undefined) {
    rule.dayOfMonth = options.dayOfMonth
  }
  if (options.weekOfMonth !== undefined) {
    rule.weekOfMonth = options.weekOfMonth
  }
  if (options.dayOfWeekInMonth !== undefined) {
    rule.dayOfWeekInMonth = options.dayOfWeekInMonth
  }

  // End conditions
  if (options.endDate) {
    rule.endDate = typeof options.endDate === 'string'
      ? options.endDate
      : options.endDate.toISOString()
  }
  if (options.count !== undefined) {
    rule.count = options.count
  }

  return rule
}

/**
 * Calculate the next occurrence date based on a recurrence rule
 */
export function calculateNextOccurrence(
  rule: RecurrenceRule,
  fromDate: Date,
  occurrenceCount = 0
): NextOccurrenceResult | null {
  const { frequency, interval } = rule

  // Check if we've exceeded the count limit
  if (rule.count !== undefined && occurrenceCount >= rule.count) {
    return {
      nextDate: fromDate,
      isComplete: true,
      occurrenceNumber: occurrenceCount,
    }
  }

  // Check if we've passed the end date
  if (rule.endDate) {
    const endDate = parseISO(rule.endDate)
    if (isAfter(fromDate, endDate)) {
      return {
        nextDate: fromDate,
        isComplete: true,
        occurrenceNumber: occurrenceCount,
      }
    }
  }

  let nextDate: Date

  switch (frequency) {
    case 'daily':
      nextDate = addDays(startOfDay(fromDate), interval)
      break

    case 'weekly':
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        // Find the next valid day of week
        const nextValidDay = getNextValidDayOfWeek(fromDate, rule.daysOfWeek, true)

        // If we've moved to a new week, add the interval weeks
        const currentWeekStart = addDays(fromDate, -getDay(fromDate))
        const nextWeekStart = addDays(nextValidDay, -getDay(nextValidDay))

        if (isAfter(nextWeekStart, currentWeekStart)) {
          nextDate = addWeeks(nextValidDay, interval - 1)
        } else {
          nextDate = nextValidDay
        }
      } else {
        nextDate = addWeeks(fromDate, interval)
      }
      break

    case 'monthly':
      if (rule.weekOfMonth !== undefined && rule.dayOfWeekInMonth !== undefined) {
        // Nth day of week in month (e.g., 2nd Tuesday)
        let nextMonth = addMonths(fromDate, interval)
        nextDate = getNthDayOfWeekInMonth(
          nextMonth.getFullYear(),
          nextMonth.getMonth(),
          rule.dayOfWeekInMonth,
          rule.weekOfMonth
        )
      } else if (rule.dayOfMonth !== undefined) {
        // Specific day of month
        let nextMonth = addMonths(fromDate, interval)
        const daysInMonth = new Date(
          nextMonth.getFullYear(),
          nextMonth.getMonth() + 1,
          0
        ).getDate()
        const day = Math.min(rule.dayOfMonth, daysInMonth)
        nextDate = setDate(nextMonth, day)
      } else {
        // Same day of month as original
        nextDate = addMonths(fromDate, interval)
      }
      break

    case 'yearly':
      nextDate = addYears(fromDate, interval)
      break

    default:
      return null
  }

  // Final check against end date
  if (rule.endDate) {
    const endDate = parseISO(rule.endDate)
    if (isAfter(nextDate, endDate)) {
      return {
        nextDate: fromDate,
        isComplete: true,
        occurrenceNumber: occurrenceCount,
      }
    }
  }

  return {
    nextDate: startOfDay(nextDate),
    isComplete: false,
    occurrenceNumber: occurrenceCount + 1,
  }
}

/**
 * Generate multiple occurrences from a recurrence rule
 */
export function generateOccurrences(
  rule: RecurrenceRule,
  startDate: Date,
  maxOccurrences: number = 10,
  untilDate?: Date
): Date[] {
  const occurrences: Date[] = [startOfDay(startDate)]
  let currentDate = startDate
  let count = 1

  while (count < maxOccurrences) {
    const result = calculateNextOccurrence(rule, currentDate, count)

    if (!result || result.isComplete) {
      break
    }

    // Check if we've passed the until date
    if (untilDate && isAfter(result.nextDate, untilDate)) {
      break
    }

    occurrences.push(result.nextDate)
    currentDate = result.nextDate
    count++
  }

  return occurrences
}

/**
 * Get human-readable description of a recurrence rule
 */
export function describeRecurrenceRule(rule: RecurrenceRule): string {
  const { frequency, interval } = rule
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  let description = ''

  // Frequency and interval
  if (interval === 1) {
    switch (frequency) {
      case 'daily':
        description = 'Daily'
        break
      case 'weekly':
        description = 'Weekly'
        break
      case 'monthly':
        description = 'Monthly'
        break
      case 'yearly':
        description = 'Yearly'
        break
    }
  } else {
    switch (frequency) {
      case 'daily':
        description = `Every ${interval} days`
        break
      case 'weekly':
        description = `Every ${interval} weeks`
        break
      case 'monthly':
        description = `Every ${interval} months`
        break
      case 'yearly':
        description = `Every ${interval} years`
        break
    }
  }

  // Weekly days of week
  if (frequency === 'weekly' && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    const days = rule.daysOfWeek.map((d) => dayNames[d]).join(', ')
    description += ` on ${days}`
  }

  // Monthly day of month
  if (frequency === 'monthly') {
    if (rule.weekOfMonth !== undefined && rule.dayOfWeekInMonth !== undefined) {
      const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th']
      const ordinal = ordinals[rule.weekOfMonth] || `${rule.weekOfMonth}th`
      description += ` on the ${ordinal} ${dayNames[rule.dayOfWeekInMonth]}`
    } else if (rule.dayOfMonth !== undefined) {
      const suffix = getDaySuffix(rule.dayOfMonth)
      description += ` on the ${rule.dayOfMonth}${suffix}`
    }
  }

  // End conditions
  if (rule.endDate) {
    const endDate = parseISO(rule.endDate)
    description += ` until ${endDate.toLocaleDateString()}`
  } else if (rule.count !== undefined) {
    description += `, ${rule.count} times`
  }

  return description
}

/**
 * Get day suffix (st, nd, rd, th)
 */
function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th'
  }
  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

/**
 * Check if a recurrence rule is valid
 */
export function isValidRecurrenceRule(rule: RecurrenceRule): boolean {
  // Must have frequency
  if (!rule.frequency) {
    return false
  }

  // Interval must be positive
  if (rule.interval !== undefined && rule.interval < 1) {
    return false
  }

  // Days of week must be valid (0-6)
  if (rule.daysOfWeek) {
    for (const day of rule.daysOfWeek) {
      if (day < 0 || day > 6) {
        return false
      }
    }
  }

  // Day of month must be valid (1-31)
  if (rule.dayOfMonth !== undefined && (rule.dayOfMonth < 1 || rule.dayOfMonth > 31)) {
    return false
  }

  // Week of month must be valid (1-5)
  if (rule.weekOfMonth !== undefined && (rule.weekOfMonth < 1 || rule.weekOfMonth > 5)) {
    return false
  }

  // Day of week in month must be valid (0-6)
  if (rule.dayOfWeekInMonth !== undefined && (rule.dayOfWeekInMonth < 0 || rule.dayOfWeekInMonth > 6)) {
    return false
  }

  // Count must be positive
  if (rule.count !== undefined && rule.count < 1) {
    return false
  }

  return true
}

// ============================================================================
// PRESET RULES
// ============================================================================

/**
 * Common recurrence presets
 */
export const RECURRENCE_PRESETS = {
  daily: createRecurrenceRule({ frequency: 'daily' }),
  weekdays: createRecurrenceRule({ frequency: 'weekly', daysOfWeek: [1, 2, 3, 4, 5] }),
  weekly: createRecurrenceRule({ frequency: 'weekly' }),
  biweekly: createRecurrenceRule({ frequency: 'weekly', interval: 2 }),
  monthly: createRecurrenceRule({ frequency: 'monthly' }),
  yearly: createRecurrenceRule({ frequency: 'yearly' }),
} as const

export type RecurrencePreset = keyof typeof RECURRENCE_PRESETS
