import { NextRequest, NextResponse } from 'next/server'
import { registerUser, AuthError } from '@/lib/auth/service'

/**
 * POST /api/auth/register
 * Register a new user account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Register the user
    const user = await registerUser(email, password, name)

    return NextResponse.json(
      {
        message: 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof AuthError) {
      // Handle specific auth errors
      const statusCodes: Record<string, number> = {
        INVALID_EMAIL: 400,
        WEAK_PASSWORD: 400,
        EMAIL_EXISTS: 409,
      }

      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: statusCodes[error.code] || 400 }
      )
    }

    console.error('Registration error:', error)
    return NextResponse.json(
      { message: 'An unexpected error occurred during registration' },
      { status: 500 }
    )
  }
}
