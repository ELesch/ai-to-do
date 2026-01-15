/**
 * Session Utilities
 * Server-side helpers for working with authentication sessions
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cache } from 'react'

/**
 * Session user type
 */
export interface SessionUser {
  id: string
  email: string
  name?: string | null
  image?: string | null
}

/**
 * Get the current session (server-side only)
 *
 * This function is cached per-request using React's cache() to prevent
 * multiple database lookups within the same request lifecycle.
 *
 * @returns The current session or null if not authenticated
 *
 * @example
 * ```ts
 * // In a Server Component or Server Action
 * const session = await getCurrentSession()
 * if (session) {
 *   console.log('Logged in as:', session.user.email)
 * }
 * ```
 */
export const getCurrentSession = cache(async () => {
  const session = await auth()
  return session
})

/**
 * Get the current authenticated user (server-side only)
 *
 * Convenience function that extracts just the user from the session.
 *
 * @returns The current user or null if not authenticated
 *
 * @example
 * ```ts
 * const user = await getCurrentUser()
 * if (user) {
 *   console.log('User ID:', user.id)
 * }
 * ```
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getCurrentSession()
  return session?.user ?? null
}

/**
 * Require authentication (server-side only)
 *
 * Use this in Server Components or Server Actions that require authentication.
 * Redirects to the login page if not authenticated.
 *
 * @returns The current user (guaranteed to be non-null)
 * @throws Redirects to /login if not authenticated
 *
 * @example
 * ```ts
 * // In a protected page Server Component
 * export default async function DashboardPage() {
 *   const user = await requireAuth()
 *   return <div>Welcome, {user.name}</div>
 * }
 * ```
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return user
}

/**
 * Require no authentication (server-side only)
 *
 * Use this in Server Components for pages that should only be accessible
 * to unauthenticated users (e.g., login, register pages).
 * Redirects to the main app if already authenticated.
 *
 * @throws Redirects to /today if authenticated
 *
 * @example
 * ```ts
 * // In the login page Server Component
 * export default async function LoginPage() {
 *   await requireNoAuth()
 *   return <LoginForm />
 * }
 * ```
 */
export async function requireNoAuth(): Promise<void> {
  const user = await getCurrentUser()

  if (user) {
    redirect('/today')
  }
}

/**
 * Check if the current request is authenticated
 *
 * @returns true if authenticated, false otherwise
 *
 * @example
 * ```ts
 * const isLoggedIn = await isAuthenticated()
 * ```
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}
