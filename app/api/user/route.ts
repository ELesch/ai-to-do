/**
 * User API Route
 * GET /api/user - Get current user profile with preferences
 * PATCH /api/user - Update user profile
 * DELETE /api/user - Delete user account
 */

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { userService } from '@/services/user.service'
import { updateUserProfileSchema } from '@/lib/validation'
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  handleApiError,
} from '@/lib/api/responses'

/**
 * GET /api/user - Get current user profile with preferences
 */
export async function GET() {
  try {
    const sessionUser = await getCurrentUser()
    if (!sessionUser) {
      return unauthorizedResponse()
    }

    const user = await userService.getUserWithPreferences(sessionUser.id)
    if (!user) {
      return notFoundResponse('User')
    }

    // Get user statistics
    const stats = await userService.getUserStats(sessionUser.id)

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      preferences: user.preferences,
      stats,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/user')
  }
}

/**
 * PATCH /api/user - Update user profile
 *
 * Request Body:
 * - name: string (optional)
 * - image: string URL (optional)
 */
export async function PATCH(request: NextRequest) {
  try {
    const sessionUser = await getCurrentUser()
    if (!sessionUser) {
      return unauthorizedResponse()
    }

    const body = await request.json()

    // Validate input
    const validatedData = updateUserProfileSchema.parse(body)

    // Update user profile
    const updatedUser = await userService.updateUserProfile(sessionUser.id, validatedData)

    return successResponse({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        image: updatedUser.image,
        emailVerified: updatedUser.emailVerified,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    })
  } catch (error) {
    return handleApiError(error, 'PATCH /api/user')
  }
}

/**
 * DELETE /api/user - Delete user account (soft delete)
 */
export async function DELETE() {
  try {
    const sessionUser = await getCurrentUser()
    if (!sessionUser) {
      return unauthorizedResponse()
    }

    await userService.deleteUserAccount(sessionUser.id)

    return successResponse({ message: 'Account deleted successfully' })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/user')
  }
}
