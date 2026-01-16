/**
 * Single Task API Route
 * GET /api/tasks/[taskId] - Get task details
 * PATCH /api/tasks/[taskId] - Update task
 * DELETE /api/tasks/[taskId] - Delete task (soft delete)
 */

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { taskService } from '@/services/task.service'
import { taskEnrichmentService } from '@/services/task-enrichment.service'
import { uuidSchema, updateTaskSchema } from '@/lib/validation'
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  handleApiError,
} from '@/lib/api/responses'

interface RouteParams {
  params: Promise<{
    taskId: string
  }>
}

/**
 * GET /api/tasks/[taskId] - Get single task
 *
 * Path Parameters:
 * - taskId: UUID of the task
 *
 * Query Parameters:
 * - includeSubtasks: boolean (optional) - Include subtasks in response
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId } = await params

    // Validate taskId format
    const validatedTaskId = uuidSchema.parse(taskId)

    // Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // Check if subtasks should be included
    const includeSubtasks =
      request.nextUrl.searchParams.get('includeSubtasks') === 'true'

    // Fetch task
    let task
    if (includeSubtasks) {
      task = await taskService.getTaskWithSubtasks(validatedTaskId, user.id)
    } else {
      task = await taskService.getTask(validatedTaskId, user.id)
    }

    if (!task) {
      return notFoundResponse('Task')
    }

    return successResponse({ task })
  } catch (error) {
    return handleApiError(error, 'GET /api/tasks/[taskId]')
  }
}

/**
 * PATCH /api/tasks/[taskId] - Update task
 *
 * Path Parameters:
 * - taskId: UUID of the task
 *
 * Request Body (all fields optional):
 * - title: string
 * - description: string | null
 * - status: 'pending' | 'in_progress' | 'completed' | 'deleted'
 * - priority: 'high' | 'medium' | 'low' | 'none'
 * - dueDate: ISO datetime string | null
 * - dueDateHasTime: boolean
 * - scheduledDate: string | null
 * - estimatedMinutes: number | null
 * - actualMinutes: number | null
 * - projectId: UUID | null
 * - parentTaskId: UUID | null
 * - sortOrder: number
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId } = await params

    // Validate taskId format
    const validatedTaskId = uuidSchema.parse(taskId)

    // Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()

    // Validate input
    const validatedData = updateTaskSchema.parse(body)

    // Check if this update is marking the task as completed
    // We need to check the previous status to only trigger on status change to completed
    const previousTask = await taskService.getTask(validatedTaskId, user.id)
    const isBeingCompleted =
      validatedData.status === 'completed' &&
      previousTask?.status !== 'completed'

    // Update task
    const task = await taskService.updateTask(
      validatedTaskId,
      user.id,
      validatedData
    )

    // If task was just marked as completed, record execution history asynchronously
    // This runs in the background and doesn't block the response
    if (isBeingCompleted) {
      // Fire and forget - don't await, handle errors gracefully
      void (async () => {
        try {
          // Only record history for tasks that had enrichment proposals
          const hasProposals =
            await taskEnrichmentService.taskHasEnrichmentProposals(
              validatedTaskId,
              user.id
            )

          if (hasProposals) {
            await taskEnrichmentService.recordExecutionHistory(
              user.id,
              validatedTaskId
            )
          }
        } catch (error) {
          // Log error but don't fail the task update
          console.error(
            '[TaskUpdate] Error recording execution history:',
            error instanceof Error ? error.message : error
          )
        }
      })()
    }

    return successResponse({ task })
  } catch (error) {
    return handleApiError(error, 'PATCH /api/tasks/[taskId]')
  }
}

/**
 * DELETE /api/tasks/[taskId] - Soft delete task
 *
 * Path Parameters:
 * - taskId: UUID of the task
 *
 * Note: This performs a soft delete by setting deletedAt timestamp
 * and status to 'deleted'. Subtasks are also soft deleted.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId } = await params

    // Validate taskId format
    const validatedTaskId = uuidSchema.parse(taskId)

    // Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // Delete task
    await taskService.deleteTask(validatedTaskId, user.id)

    return successResponse({ message: 'Task deleted successfully' })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/tasks/[taskId]')
  }
}
