/**
 * Search API Route
 * GET /api/search - Search tasks and projects
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { searchService, searchQuerySchema } from '@/services/search.service'
import { z } from 'zod'

/**
 * GET /api/search - Search tasks and projects
 *
 * Query Parameters:
 * - q: Search query string (required)
 * - limit: Maximum results per category (optional, default 10, max 50)
 * - type: 'all' | 'tasks' | 'projects' | 'recent' (optional, default 'all')
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all'
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 10

    // Handle recent items request (no search query needed)
    if (type === 'recent') {
      const recentItems = await searchService.getRecent(user.id, limit)
      return NextResponse.json({
        success: true,
        data: {
          recent: recentItems,
        },
      })
    }

    // Validate search query for search operations
    if (!query.trim()) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      )
    }

    // Validate input
    const validatedInput = searchQuerySchema.parse({ query, limit })

    // Perform search based on type
    let result
    switch (type) {
      case 'tasks':
        const taskResults = await searchService.searchTasks(
          user.id,
          validatedInput.query,
          validatedInput.limit
        )
        result = {
          tasks: taskResults.tasks,
          totalTasks: taskResults.total,
          projects: [],
          totalProjects: 0,
        }
        break

      case 'projects':
        const projectResults = await searchService.searchProjects(
          user.id,
          validatedInput.query,
          validatedInput.limit
        )
        result = {
          tasks: [],
          totalTasks: 0,
          projects: projectResults.projects,
          totalProjects: projectResults.total,
        }
        break

      case 'all':
      default:
        result = await searchService.searchAll(
          user.id,
          validatedInput.query,
          validatedInput.limit
        )
        break
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        query: validatedInput.query,
      },
    })
  } catch (error) {
    console.error('Error performing search:', error)

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

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
