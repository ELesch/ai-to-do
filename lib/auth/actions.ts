/**
 * Authentication Server Actions
 * Server-side authentication actions for login and logout
 */

'use server'

import { signIn, signOut } from '@/lib/auth'
import { AuthError } from 'next-auth'

export interface LoginResult {
  success: boolean
  error?: string
}

/**
 * Server action to handle user login
 * Uses NextAuth's server-side signIn function
 */
export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { success: false, error: 'Invalid email or password' }
        default:
          return { success: false, error: 'An authentication error occurred' }
      }
    }
    // Re-throw if it's a redirect (which is expected for successful login)
    throw error
  }
}

/**
 * Server action to handle user logout
 */
export async function logout(): Promise<void> {
  await signOut({ redirect: false })
}
