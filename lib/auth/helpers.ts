/**
 * Auth Helpers
 * Utility functions for authentication operations
 */

import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import {
  getCurrentUser as getSessionUser,
  requireAuth as sessionRequireAuth,
  requireNoAuth as sessionRequireNoAuth,
  type SessionUser,
} from './session'

// Re-export session utilities
export { getCurrentUser } from './session'
export { requireAuth } from './session'
export { requireNoAuth } from './session'
export { isAuthenticated } from './session'
export type { SessionUser } from './session'

// Legacy type alias for compatibility
export type User = SessionUser

/**
 * Hash a password using bcrypt
 *
 * @param password - Plain text password to hash
 * @returns Hashed password
 *
 * @example
 * ```ts
 * const hash = await hashPassword('mySecurePassword123')
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

/**
 * Verify a password against a hash
 *
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns true if password matches, false otherwise
 *
 * @example
 * ```ts
 * const isValid = await verifyPassword('myPassword', user.passwordHash)
 * ```
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Get full user data from database by ID
 *
 * Unlike getCurrentUser which returns session data, this fetches the complete
 * user record from the database including all fields.
 *
 * @param userId - The user's UUID
 * @returns Full user record or null if not found
 *
 * @example
 * ```ts
 * const user = await getUserById('123e4567-e89b-12d3-a456-426614174000')
 * ```
 */
export async function getUserById(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })
  return user ?? null
}

/**
 * Get user by email address
 *
 * @param email - Email address to search for
 * @returns User record or null if not found
 *
 * @example
 * ```ts
 * const user = await getUserByEmail('user@example.com')
 * ```
 */
export async function getUserByEmail(email: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  })
  return user ?? null
}

/**
 * Check if a user has a specific permission
 *
 * @param userId - User ID to check permissions for
 * @param permission - Permission string to verify
 * @returns true if user has permission, false otherwise
 *
 * @example
 * ```ts
 * const canEdit = await hasPermission(userId, 'edit:tasks')
 * ```
 */
export async function hasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  // TODO: Implement role-based permission checking
  // For now, all authenticated users have all permissions
  console.log('Permission check:', { userId, permission })
  return true
}
