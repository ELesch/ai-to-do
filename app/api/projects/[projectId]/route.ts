/**
 * Single Project API Route
 * GET /api/projects/[projectId] - Get project details with stats
 * PATCH /api/projects/[projectId] - Update project
 * DELETE /api/projects/[projectId] - Delete project (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { projectService, updateProjectSchema } from '@/services/project.service'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    projectId: string
  }>
}

// UUID validation schema
const uuidSchema = z.string().uuid('Invalid project ID format')

/**
 * GET /api/projects/[projectId] - Get single project with stats
 *
 * Path Parameters:
 * - projectId: UUID of the project
 *
 * Query Parameters:
 * - includeStats: boolean (optional, default false) - Include detailed statistics
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params

    // Validate projectId format
    const validatedProjectId = uuidSchema.parse(projectId)

    // Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if stats should be included
    const includeStats = request.nextUrl.searchParams.get('includeStats') === 'true'

    // Fetch project with counts
    const project = await projectService.getProjectWithCounts(validatedProjectId, user.id)

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Include detailed stats if requested
    let stats = null
    if (includeStats) {
      stats = await projectService.getProjectStats(validatedProjectId, user.id)
    }

    return NextResponse.json({
      success: true,
      data: {
        project,
        ...(stats && { stats }),
      },
    })
  } catch (error) {
    console.error('Error fetching project:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid project ID format',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/projects/[projectId] - Update project
 *
 * Path Parameters:
 * - projectId: UUID of the project
 *
 * Request Body (all fields optional):
 * - name: string
 * - description: string | null
 * - color: string (hex color code)
 * - icon: string | null
 * - parentId: UUID | null
 * - isFavorite: boolean
 * - isArchived: boolean
 * - settings: object
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params

    // Validate projectId format
    const validatedProjectId = uuidSchema.parse(projectId)

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
    const validatedData = updateProjectSchema.parse(body)

    // Update project
    const project = await projectService.updateProject(validatedProjectId, user.id, validatedData)

    return NextResponse.json({
      success: true,
      data: { project },
    })
  } catch (error) {
    console.error('Error updating project:', error)

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
      if (error.message === 'Project not found') {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        )
      }
      if (error.message === 'Parent project not found') {
        return NextResponse.json(
          { success: false, error: 'Parent project not found' },
          { status: 404 }
        )
      }
      if (error.message === 'Project cannot be its own parent') {
        return NextResponse.json(
          { success: false, error: 'Project cannot be its own parent' },
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
 * DELETE /api/projects/[projectId] - Soft delete project
 *
 * Path Parameters:
 * - projectId: UUID of the project
 *
 * Note: This performs a soft delete by setting deletedAt timestamp.
 * All tasks in the project will be moved to the inbox (projectId = null).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params

    // Validate projectId format
    const validatedProjectId = uuidSchema.parse(projectId)

    // Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Delete project
    await projectService.deleteProject(validatedProjectId, user.id)

    return NextResponse.json({
      success: true,
      data: { message: 'Project deleted successfully. Tasks have been moved to inbox.' },
    })
  } catch (error) {
    console.error('Error deleting project:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid project ID format',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message === 'Project not found') {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
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
