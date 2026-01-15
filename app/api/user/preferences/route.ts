/**
 * User Preferences API Route
 * GET /api/user/preferences - Get user preferences
 * PATCH /api/user/preferences - Update user preferences (partial update)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { userService, updateUserPreferencesSchema, defaultUserPreferences } from '@/services/user.service'
import { z } from 'zod'

/**
 * GET /api/user/preferences - Get user preferences
 * Returns preferences merged with defaults
 */
export async function GET() {
  try {
    const sessionUser = await getCurrentUser()
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await userService.getUserWithPreferences(sessionUser.id)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        preferences: user.preferences,
      },
    })
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/user/preferences - Update user preferences
 * Supports partial updates - only sends fields that need to be changed
 *
 * Request Body (all fields optional):
 * Display:
 * - theme: 'light' | 'dark' | 'system'
 * - defaultView: 'today' | 'upcoming' | 'inbox'
 * - sidebarCollapsed: boolean
 *
 * Date & Time:
 * - timezone: string (e.g., 'America/New_York')
 * - weekStartsOn: 0 | 1 | 6 (Sunday, Monday, Saturday)
 * - timeFormat: '12h' | '24h'
 * - dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
 *
 * Notifications:
 * - emailNotifications: boolean
 * - pushNotifications: boolean
 * - dailyDigestTime: string (e.g., '09:00')
 * - quietHoursStart: string (e.g., '22:00')
 * - quietHoursEnd: string (e.g., '07:00')
 *
 * AI Settings:
 * - aiEnabled: boolean
 * - aiSuggestionsEnabled: boolean
 * - aiSuggestionFrequency: 'low' | 'medium' | 'high'
 * - aiCommunicationStyle: 'concise' | 'detailed'
 * - aiDataLearning: boolean
 *
 * Task Defaults:
 * - defaultPriority: 'high' | 'medium' | 'low' | 'none'
 * - defaultProjectId: string UUID | null
 * - autoArchiveCompleted: boolean
 * - autoArchiveDays: number (1-365)
 */
export async function PATCH(request: NextRequest) {
  try {
    const sessionUser = await getCurrentUser()
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate input
    const validatedData = updateUserPreferencesSchema.parse(body)

    // Check if any valid preferences were provided
    if (Object.keys(validatedData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid preferences provided' },
        { status: 400 }
      )
    }

    // Update preferences (partial update)
    const updatedPreferences = await userService.updateUserPreferences(
      sessionUser.id,
      validatedData
    )

    return NextResponse.json({
      success: true,
      data: {
        preferences: updatedPreferences,
      },
    })
  } catch (error) {
    console.error('Error updating preferences:', error)

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

    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
