/**
 * Task Reminders API Route
 * GET /api/tasks/[taskId]/reminders - Get reminders for a task
 * POST /api/tasks/[taskId]/reminders - Create a reminder for a task
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { reminderService, createReminderSchema, reminderPresetSchema } from '@/services/reminder.service'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    taskId: string
  }>
}

// UUID validation schema
const uuidSchema = z.string().uuid('Invalid task ID format')

// Schema for creating reminder with preset option
const createReminderRequestSchema = z.union([
  // Direct reminder creation
  createReminderSchema,
  // Preset-based creation
  z.object({
    preset: reminderPresetSchema,
    customTime: z.string().datetime().optional(),
  }),
])

/**
 * GET /api/tasks/[taskId]/reminders - Get reminders for a task
 *
 * Path Parameters:
 * - taskId: UUID of the task
 *
 * Returns all reminders associated with the task
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId } = await params

    // Validate taskId format
    const validatedTaskId = uuidSchema.parse(taskId)

    // Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch reminders
    const reminders = await reminderService.getTaskReminders(validatedTaskId, user.id)

    return NextResponse.json({
      success: true,
      data: { reminders },
    })
  } catch (error) {
    console.error('Error fetching reminders:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid task ID format',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message === 'Task not found') {
        return NextResponse.json(
          { success: false, error: 'Task not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tasks/[taskId]/reminders - Create a reminder for a task
 *
 * Path Parameters:
 * - taskId: UUID of the task
 *
 * Request Body (option 1 - direct):
 * - remindAt: ISO datetime string
 * - type: 'due_date' | 'scheduled' | 'custom' | 'follow_up'
 * - channels: ('push' | 'email')[] (optional, defaults to ['push'])
 *
 * Request Body (option 2 - preset):
 * - preset: 'tomorrow_morning' | 'one_hour_before' | 'one_day_before' | 'custom'
 * - customTime: ISO datetime string (required if preset is 'custom')
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId } = await params

    // Validate taskId format
    const validatedTaskId = uuidSchema.parse(taskId)

    // Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate input
    const validatedData = createReminderRequestSchema.parse(body)

    let reminder

    // Check if using preset or direct creation
    if ('preset' in validatedData) {
      // Preset-based creation
      const customTime = validatedData.customTime ? new Date(validatedData.customTime) : undefined
      reminder = await reminderService.createReminderFromPreset(
        user.id,
        validatedTaskId,
        validatedData.preset,
        customTime
      )
    } else {
      // Direct creation
      reminder = await reminderService.createReminder(
        user.id,
        validatedTaskId,
        validatedData
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: { reminder },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating reminder:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message === 'Task not found') {
        return NextResponse.json(
          { success: false, error: 'Task not found' },
          { status: 404 }
        )
      }
      if (error.message === 'Reminder time must be in the future') {
        return NextResponse.json(
          { success: false, error: 'Reminder time must be in the future' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tasks/[taskId]/reminders - Delete a specific reminder
 *
 * Query Parameters:
 * - reminderId: UUID of the reminder to delete
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId } = await params

    // Validate taskId format
    uuidSchema.parse(taskId)

    // Get reminderId from query params
    const reminderId = request.nextUrl.searchParams.get('reminderId')
    if (!reminderId) {
      return NextResponse.json(
        { success: false, error: 'reminderId query parameter is required' },
        { status: 400 }
      )
    }

    const validatedReminderId = uuidSchema.parse(reminderId)

    // Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Delete reminder
    await reminderService.deleteReminder(validatedReminderId, user.id)

    return NextResponse.json({
      success: true,
      data: { message: 'Reminder deleted successfully' },
    })
  } catch (error) {
    console.error('Error deleting reminder:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid ID format',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message === 'Reminder not found') {
        return NextResponse.json(
          { success: false, error: 'Reminder not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
