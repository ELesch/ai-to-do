/**
 * Project Archive API Route
 * POST /api/projects/[projectId]/archive - Archive or unarchive a project
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { projectService } from '@/services/project.service'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    projectId: string
  }>
}

// UUID validation schema
const uuidSchema = z.string().uuid('Invalid project ID format')

// Request body schema
const archiveRequestSchema = z.object({
  archive: z.boolean().optional().default(true),
})

/**
 * POST /api/projects/[projectId]/archive - Archive or unarchive project
 *
 * Path Parameters:
 * - projectId: UUID of the project
 *
 * Request Body:
 * - archive: boolean (optional, default true) - Set to false to unarchive
 *
 * Examples:
 * - Archive: POST /api/projects/123/archive with { "archive": true } or {}
 * - Unarchive: POST /api/projects/123/archive with { "archive": false }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Parse and validate request body
    let body = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is valid, defaults to archive: true
    }

    const { archive } = archiveRequestSchema.parse(body)

    // Archive or unarchive the project
    const project = await projectService.archiveProject(validatedProjectId, user.id, archive)

    return NextResponse.json({
      success: true,
      data: {
        project,
        message: archive ? 'Project archived successfully' : 'Project unarchived successfully',
      },
    })
  } catch (error) {
    console.error('Error archiving project:', error)

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
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
