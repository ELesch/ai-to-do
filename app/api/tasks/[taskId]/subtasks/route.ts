/**
 * Task Subtasks API Route
 * GET /api/tasks/[taskId]/subtasks - List subtasks of a task
 * POST /api/tasks/[taskId]/subtasks - Create a subtask
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { taskService, createTaskSchema } from '@/services/task.service'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    taskId: string
  }>
}

// UUID validation schema
const uuidSchema = z.string().uuid('Invalid task ID format')

/**
 * GET /api/tasks/[taskId]/subtasks - List subtasks of a task
 *
 * Path Parameters:
 * - taskId: UUID of the parent task
 *
 * Response:
 * - subtasks: Array of subtask objects
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

    // Fetch subtasks
    const subtasks = await taskService.getSubtasks(validatedTaskId, user.id)

    return NextResponse.json({
      success: true,
      data: {
        subtasks,
        count: subtasks.length,
      },
    })
  } catch (error) {
    console.error('Error fetching subtasks:', error)

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
      if (error.message === 'Parent task not found') {
        return NextResponse.json(
          { success: false, error: 'Parent task not found' },
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
 * POST /api/tasks/[taskId]/subtasks - Create a subtask
 *
 * Path Parameters:
 * - taskId: UUID of the parent task
 *
 * Request Body:
 * - title: string (required)
 * - description: string (optional)
 * - priority: 'high' | 'medium' | 'low' | 'none' (optional, default 'none')
 * - dueDate: ISO datetime string (optional)
 * - dueDateHasTime: boolean (optional, default false)
 * - scheduledDate: string (optional)
 * - estimatedMinutes: number (optional)
 * - projectId: UUID (optional, defaults to parent task's project)
 * - sortOrder: number (optional, default 0)
 *
 * Note: parentTaskId is automatically set to the route parameter
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

    // Remove parentTaskId from body if provided (it's set from the route)
    const { parentTaskId: _, ...subtaskData } = body

    // Validate input
    const validatedData = createTaskSchema.parse(subtaskData)

    // Create subtask
    const subtask = await taskService.createSubtask(validatedTaskId, user.id, validatedData)

    return NextResponse.json(
      {
        success: true,
        data: { subtask },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating subtask:', error)

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
      if (error.message === 'Parent task not found') {
        return NextResponse.json(
          { success: false, error: 'Parent task not found' },
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
