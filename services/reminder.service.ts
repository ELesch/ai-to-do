/**
 * Reminder Service
 * Business logic for task reminders with database integration
 */

import { db } from '@/lib/db'
import { reminders, tasks } from '@/lib/db/schema'
import { eq, and, lte, isNull, asc, desc } from 'drizzle-orm'
import { z } from 'zod'
import {
  addMinutes,
  addHours,
  addDays,
  startOfTomorrow,
  setHours,
  setMinutes,
  isBefore,
} from 'date-fns'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createReminderSchema = z.object({
  remindAt: z.string().datetime(),
  type: z.enum(['due_date', 'scheduled', 'custom', 'follow_up']),
  channels: z.array(z.enum(['push', 'email'])).optional().default(['push']),
})

export const reminderPresetSchema = z.enum([
  'tomorrow_morning',
  'one_hour_before',
  'one_day_before',
  'custom',
])

// ============================================================================
// TYPES
// ============================================================================

export type CreateReminderInput = z.infer<typeof createReminderSchema>
export type ReminderPreset = z.infer<typeof reminderPresetSchema>

export interface ReminderWithTask {
  id: string
  taskId: string
  userId: string
  remindAt: Date
  type: string
  isSent: boolean
  sentAt: Date | null
  channels: string[] | null
  createdAt: Date
  task?: {
    id: string
    title: string
    dueDate: Date | null
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate reminder time based on preset and task due date
 */
export function calculateReminderTime(
  preset: ReminderPreset,
  taskDueDate?: Date | null
): Date {
  const now = new Date()

  switch (preset) {
    case 'tomorrow_morning':
      // Tomorrow at 9:00 AM
      return setMinutes(setHours(startOfTomorrow(), 9), 0)

    case 'one_hour_before':
      if (!taskDueDate) {
        // If no due date, remind in 1 hour from now
        return addHours(now, 1)
      }
      return addHours(taskDueDate, -1)

    case 'one_day_before':
      if (!taskDueDate) {
        // If no due date, remind tomorrow at 9 AM
        return setMinutes(setHours(startOfTomorrow(), 9), 0)
      }
      return addDays(taskDueDate, -1)

    case 'custom':
    default:
      // For custom, return now (caller should provide actual time)
      return now
  }
}

/**
 * Validate that reminder time is in the future
 */
export function isValidReminderTime(remindAt: Date): boolean {
  return isBefore(new Date(), remindAt)
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class ReminderService {
  /**
   * Create a reminder for a task
   */
  async createReminder(
    userId: string,
    taskId: string,
    input: CreateReminderInput
  ): Promise<ReminderWithTask> {
    const validatedInput = createReminderSchema.parse(input)

    // Verify task exists and belongs to user
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

    const remindAt = new Date(validatedInput.remindAt)

    // Validate reminder time is in the future
    if (!isValidReminderTime(remindAt)) {
      throw new Error('Reminder time must be in the future')
    }

    const [reminder] = await db
      .insert(reminders)
      .values({
        userId,
        taskId,
        remindAt,
        type: validatedInput.type,
        channels: validatedInput.channels,
        isSent: false,
      })
      .returning()

    return {
      ...reminder,
      task: {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
      },
    } as ReminderWithTask
  }

  /**
   * Create a reminder using a preset
   */
  async createReminderFromPreset(
    userId: string,
    taskId: string,
    preset: ReminderPreset,
    customTime?: Date
  ): Promise<ReminderWithTask> {
    // Get task to check for due date
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

    let remindAt: Date
    let type: 'due_date' | 'scheduled' | 'custom' | 'follow_up'

    if (preset === 'custom' && customTime) {
      remindAt = customTime
      type = 'custom'
    } else {
      remindAt = calculateReminderTime(preset, task.dueDate)
      type = preset === 'one_hour_before' || preset === 'one_day_before' ? 'due_date' : 'scheduled'
    }

    return this.createReminder(userId, taskId, {
      remindAt: remindAt.toISOString(),
      type,
      channels: ['push'],
    })
  }

  /**
   * Get all reminders for a specific task
   */
  async getTaskReminders(taskId: string, userId: string): Promise<ReminderWithTask[]> {
    // Verify task exists and belongs to user
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

    const reminderResults = await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.taskId, taskId), eq(reminders.userId, userId)))
      .orderBy(asc(reminders.remindAt))

    return reminderResults.map((reminder) => ({
      ...reminder,
      task: {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
      },
    })) as ReminderWithTask[]
  }

  /**
   * Get all pending (unsent) reminders for a user
   */
  async getUserPendingReminders(userId: string): Promise<ReminderWithTask[]> {
    const reminderResults = await db.query.reminders.findMany({
      where: and(
        eq(reminders.userId, userId),
        eq(reminders.isSent, false)
      ),
      orderBy: [asc(reminders.remindAt)],
      with: {
        task: {
          columns: {
            id: true,
            title: true,
            dueDate: true,
          },
        },
      },
    })

    return reminderResults.map((r) => ({
      id: r.id,
      taskId: r.taskId,
      userId: r.userId,
      remindAt: r.remindAt,
      type: r.type,
      isSent: r.isSent ?? false,
      sentAt: r.sentAt,
      channels: r.channels,
      createdAt: r.createdAt,
      task: r.task ? {
        id: r.task.id,
        title: r.task.title,
        dueDate: r.task.dueDate,
      } : undefined,
    })) as ReminderWithTask[]
  }

  /**
   * Get reminders that are due to be sent
   */
  async getDueReminders(): Promise<ReminderWithTask[]> {
    const now = new Date()

    const reminderResults = await db.query.reminders.findMany({
      where: and(
        eq(reminders.isSent, false),
        lte(reminders.remindAt, now)
      ),
      orderBy: [asc(reminders.remindAt)],
      with: {
        task: {
          columns: {
            id: true,
            title: true,
            dueDate: true,
          },
        },
      },
    })

    return reminderResults.map((r) => ({
      id: r.id,
      taskId: r.taskId,
      userId: r.userId,
      remindAt: r.remindAt,
      type: r.type,
      isSent: r.isSent ?? false,
      sentAt: r.sentAt,
      channels: r.channels,
      createdAt: r.createdAt,
      task: r.task ? {
        id: r.task.id,
        title: r.task.title,
        dueDate: r.task.dueDate,
      } : undefined,
    })) as ReminderWithTask[]
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(reminderId: string, userId: string): Promise<void> {
    // Verify reminder exists and belongs to user
    const reminder = await db.query.reminders.findFirst({
      where: and(eq(reminders.id, reminderId), eq(reminders.userId, userId)),
    })

    if (!reminder) {
      throw new Error('Reminder not found')
    }

    await db.delete(reminders).where(eq(reminders.id, reminderId))
  }

  /**
   * Mark a reminder as sent
   */
  async markReminderSent(reminderId: string): Promise<void> {
    await db
      .update(reminders)
      .set({
        isSent: true,
        sentAt: new Date(),
      })
      .where(eq(reminders.id, reminderId))
  }

  /**
   * Get a single reminder by ID
   */
  async getReminder(reminderId: string, userId: string): Promise<ReminderWithTask | null> {
    const reminder = await db.query.reminders.findFirst({
      where: and(eq(reminders.id, reminderId), eq(reminders.userId, userId)),
      with: {
        task: {
          columns: {
            id: true,
            title: true,
            dueDate: true,
          },
        },
      },
    })

    if (!reminder) {
      return null
    }

    return {
      id: reminder.id,
      taskId: reminder.taskId,
      userId: reminder.userId,
      remindAt: reminder.remindAt,
      type: reminder.type,
      isSent: reminder.isSent ?? false,
      sentAt: reminder.sentAt,
      channels: reminder.channels,
      createdAt: reminder.createdAt,
      task: reminder.task ? {
        id: reminder.task.id,
        title: reminder.task.title,
        dueDate: reminder.task.dueDate,
      } : undefined,
    } as ReminderWithTask
  }

  /**
   * Delete all reminders for a task
   */
  async deleteTaskReminders(taskId: string, userId: string): Promise<void> {
    await db
      .delete(reminders)
      .where(and(eq(reminders.taskId, taskId), eq(reminders.userId, userId)))
  }

  /**
   * Update a reminder time
   */
  async updateReminder(
    reminderId: string,
    userId: string,
    remindAt: Date
  ): Promise<ReminderWithTask> {
    // Verify reminder exists and belongs to user
    const existingReminder = await this.getReminder(reminderId, userId)
    if (!existingReminder) {
      throw new Error('Reminder not found')
    }

    // Validate reminder time is in the future
    if (!isValidReminderTime(remindAt)) {
      throw new Error('Reminder time must be in the future')
    }

    const [updated] = await db
      .update(reminders)
      .set({ remindAt })
      .where(eq(reminders.id, reminderId))
      .returning()

    return {
      ...updated,
      task: existingReminder.task,
    } as ReminderWithTask
  }
}

export const reminderService = new ReminderService()
