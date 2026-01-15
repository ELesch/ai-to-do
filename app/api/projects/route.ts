/**
 * Projects API Route
 * GET /api/projects - List all projects
 * POST /api/projects - Create a new project
 */

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { projectService } from '@/services/project.service'
import { createProjectSchema, projectFiltersSchema } from '@/lib/validation'
import {
  successResponse,
  createdResponse,
  unauthorizedResponse,
  handleApiError,
} from '@/lib/api/responses'

/**
 * GET /api/projects - List projects with filtering
 *
 * Query Parameters:
 * - includeArchived: boolean (optional, default false) - Include archived projects
 * - sortBy: 'createdAt' | 'name' | 'sortOrder' | 'updatedAt' (optional, default 'sortOrder')
 * - sortOrder: 'asc' | 'desc' (optional, default 'asc')
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

    const includeArchived = searchParams.get('includeArchived')
    if (includeArchived !== null) {
      rawFilters.includeArchived = includeArchived === 'true'
    }

    const sortBy = searchParams.get('sortBy')
    if (sortBy) rawFilters.sortBy = sortBy

    const sortOrder = searchParams.get('sortOrder')
    if (sortOrder) rawFilters.sortOrder = sortOrder

    // Validate filters
    const filters = projectFiltersSchema.parse(rawFilters)

    // Fetch projects
    const projects = await projectService.getUserProjects(user.id, filters)

    return successResponse({
      projects,
      total: projects.length,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/projects')
  }
}

/**
 * POST /api/projects - Create a new project
 *
 * Request Body:
 * - name: string (required)
 * - description: string (optional)
 * - color: string (optional, default '#6366f1') - Hex color code
 * - icon: string (optional)
 * - parentId: UUID (optional) - Parent project for nested projects
 * - isFavorite: boolean (optional, default false)
 * - settings: object (optional) - Project-specific settings
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
    const validatedData = createProjectSchema.parse(body)

    // Create project
    const project = await projectService.createProject(user.id, validatedData)

    return createdResponse({ project })
  } catch (error) {
    return handleApiError(error, 'POST /api/projects')
  }
}
