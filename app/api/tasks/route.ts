/**
 * Tasks API Route
 * GET /api/tasks - List tasks with optional filters
 * POST /api/tasks - Create a new task
 */

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { taskService } from '@/services/task.service'
import { createTaskSchema, taskFiltersSchema } from '@/lib/validation'
import {
  successResponse,
  createdResponse,
  unauthorizedResponse,
  handleApiError,
} from '@/lib/api/responses'

/**
 * GET /api/tasks - List tasks with filtering
 *
 * Query Parameters:
 * - status: 'pending' | 'in_progress' | 'completed' | 'deleted'
 * - projectId: UUID of project to filter by
 * - priority: 'high' | 'medium' | 'low' | 'none'
 * - dueBefore: ISO datetime string
 * - dueAfter: ISO datetime string
 * - search: Search term for title/description
 * - sortBy: 'createdAt' | 'dueDate' | 'priority' | 'sortOrder' | 'updatedAt'
 * - sortOrder: 'asc' | 'desc'
 * - limit: Number (1-100, default 50)
 * - offset: Number (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // Extract and parse query parameters
    const searchParams = request.nextUrl.searchParams
    const rawFilters: Record<string, unknown> = {}

    // Parse string parameters
    const status = searchParams.get('status')
    if (status) rawFilters.status = status

    const projectId = searchParams.get('projectId')
    if (projectId !== null) {
      rawFilters.projectId = projectId === '' ? null : projectId
    }

    const priority = searchParams.get('priority')
    if (priority) rawFilters.priority = priority

    const dueBefore = searchParams.get('dueBefore')
    if (dueBefore) rawFilters.dueBefore = dueBefore

    const dueAfter = searchParams.get('dueAfter')
    if (dueAfter) rawFilters.dueAfter = dueAfter

    const search = searchParams.get('search')
    if (search) rawFilters.search = search

    const sortBy = searchParams.get('sortBy')
    if (sortBy) rawFilters.sortBy = sortBy

    const sortOrder = searchParams.get('sortOrder')
    if (sortOrder) rawFilters.sortOrder = sortOrder

    const limit = searchParams.get('limit')
    if (limit) rawFilters.limit = limit

    const offset = searchParams.get('offset')
    if (offset) rawFilters.offset = offset

    const parentTaskId = searchParams.get('parentTaskId')
    if (parentTaskId !== null) {
      rawFilters.parentTaskId = parentTaskId === '' ? null : parentTaskId
    }

    const includeDeleted = searchParams.get('includeDeleted')
    if (includeDeleted) rawFilters.includeDeleted = includeDeleted === 'true'

    // Validate filters
    const filters = taskFiltersSchema.parse(rawFilters)

    // Fetch tasks
    const result = await taskService.getUserTasks(user.id, filters)

    return successResponse({
      tasks: result.tasks,
      total: result.total,
      hasMore: result.hasMore,
      limit: filters.limit,
      offset: filters.offset,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/tasks')
  }
}

/**
 * POST /api/tasks - Create a new task
 *
 * Request Body:
 * - title: string (required)
 * - description: string (optional)
 * - priority: 'high' | 'medium' | 'low' | 'none' (optional, default 'none')
 * - dueDate: ISO datetime string (optional)
 * - dueDateHasTime: boolean (optional, default false)
 * - scheduledDate: string (optional)
 * - estimatedMinutes: number (optional)
 * - projectId: UUID (optional)
 * - parentTaskId: UUID (optional)
 * - sortOrder: number (optional, default 0)
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()

    // Validate input
    const validatedData = createTaskSchema.parse(body)

    // Create task
    const task = await taskService.createTask(user.id, validatedData)

    return createdResponse({ task })
  } catch (error) {
    return handleApiError(error, 'POST /api/tasks')
  }
}
