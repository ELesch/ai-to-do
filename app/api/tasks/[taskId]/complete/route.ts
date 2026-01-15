/**
 * Task Complete API Route
 * POST /api/tasks/[taskId]/complete - Mark task as complete or incomplete
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { taskService } from '@/services/task.service'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    taskId: string
  }>
}

// UUID validation schema
const uuidSchema = z.string().uuid('Invalid task ID format')

// Request body schema
const completeTaskSchema = z.object({
  complete: z.boolean().default(true),
})

/**
 * POST /api/tasks/[taskId]/complete - Complete or uncomplete a task
 *
 * Path Parameters:
 * - taskId: UUID of the task
 *
 * Request Body:
 * - complete: boolean (optional, default true) - true to mark complete, false to mark incomplete
 *
 * Response:
 * - task: The updated task object
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

    // Parse and validate request body
    let complete = true
    try {
      const body = await request.json()
      const validatedBody = completeTaskSchema.parse(body)
      complete = validatedBody.complete
    } catch {
      // If no body or invalid JSON, default to complete: true
      complete = true
    }

    // Complete or uncomplete the task
    const task = await taskService.completeTask(validatedTaskId, user.id, complete)

    return NextResponse.json({
      success: true,
      data: { task },
    })
  } catch (error) {
    console.error('Error completing task:', error)

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
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
