/**
 * POST /api/auth/login
 * Custom login endpoint that validates credentials and returns success/failure
 * The actual session is created by calling the NextAuth signIn on the client
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateCredentials } from '@/lib/auth/service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate credentials
    const user = await validateCredentials(email, password)

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Credentials are valid - return success
    // The client will then call signIn to create the session
    return NextResponse.json({
      success: true,
      message: 'Credentials valid',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
