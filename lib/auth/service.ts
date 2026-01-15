/**
 * Authentication Service
 * Core authentication functions for user registration, login, and password management
 */

import * as bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, type User, type NewUser } from '@/lib/db/schema'
import { normalizeEmail, isPasswordStrong, isValidEmail } from './utils'

// Number of salt rounds for bcrypt hashing
const SALT_ROUNDS = 12

/**
 * Authentication error class for handling auth-specific errors
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Hash a password using bcryptjs
 * @param password - The plain text password to hash
 * @returns The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 * @param password - The plain text password to verify
 * @param hash - The hashed password to compare against
 * @returns true if the password matches the hash, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Get a user by their email address
 * @param email - The email address to search for
 * @returns The user if found, null otherwise
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = normalizeEmail(email)

  const user = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  })

  return user ?? null
}

/**
 * Get a user by their ID
 * @param userId - The user's UUID
 * @returns The user if found, null otherwise
 */
export async function getUserById(userId: string): Promise<User | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  return user ?? null
}

/**
 * Register a new user
 * @param email - The user's email address
 * @param password - The user's password (will be hashed)
 * @param name - The user's display name (optional)
 * @returns The newly created user (without password hash)
 * @throws AuthError if registration fails
 */
export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<Omit<User, 'passwordHash'>> {
  // Validate email format
  if (!isValidEmail(email)) {
    throw new AuthError('Invalid email format', 'INVALID_EMAIL')
  }

  // Validate password strength
  const passwordCheck = isPasswordStrong(password)
  if (!passwordCheck.isStrong) {
    throw new AuthError(
      passwordCheck.errors.join('. '),
      'WEAK_PASSWORD'
    )
  }

  const normalizedEmail = normalizeEmail(email)

  // Check if user already exists
  const existingUser = await getUserByEmail(normalizedEmail)
  if (existingUser) {
    throw new AuthError('Email already registered', 'EMAIL_EXISTS')
  }

  // Hash the password
  const passwordHash = await hashPassword(password)

  // Create the user
  const newUser: NewUser = {
    email: normalizedEmail,
    passwordHash,
    name: name ?? null,
  }

  const [createdUser] = await db.insert(users).values(newUser).returning()

  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = createdUser
  return userWithoutPassword
}

/**
 * Validate user credentials for login
 * @param email - The user's email address
 * @param password - The user's password
 * @returns The user if credentials are valid, null otherwise
 */
export async function validateCredentials(
  email: string,
  password: string
): Promise<Omit<User, 'passwordHash'> | null> {
  const normalizedEmail = normalizeEmail(email)

  // Find user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  })

  if (!user) {
    return null
  }

  // Check if user has a password (might be OAuth-only user)
  if (!user.passwordHash) {
    return null
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    return null
  }

  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

/**
 * Update a user's password
 * @param userId - The user's UUID
 * @param newPassword - The new password (will be hashed)
 * @returns true if the password was updated successfully
 * @throws AuthError if the update fails
 */
export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<boolean> {
  // Validate password strength
  const passwordCheck = isPasswordStrong(newPassword)
  if (!passwordCheck.isStrong) {
    throw new AuthError(
      passwordCheck.errors.join('. '),
      'WEAK_PASSWORD'
    )
  }

  // Hash the new password
  const passwordHash = await hashPassword(newPassword)

  // Update the user's password
  const result = await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id })

  if (result.length === 0) {
    throw new AuthError('User not found', 'USER_NOT_FOUND')
  }

  return true
}

/**
 * Change password with current password verification
 * @param userId - The user's UUID
 * @param currentPassword - The user's current password
 * @param newPassword - The new password
 * @returns true if the password was changed successfully
 * @throws AuthError if the change fails
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  // Get the user
  const user = await getUserById(userId)
  if (!user) {
    throw new AuthError('User not found', 'USER_NOT_FOUND')
  }

  if (!user.passwordHash) {
    throw new AuthError(
      'Cannot change password for OAuth-only accounts',
      'NO_PASSWORD'
    )
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.passwordHash)
  if (!isValid) {
    throw new AuthError('Current password is incorrect', 'INVALID_PASSWORD')
  }

  // Update to new password
  return updatePassword(userId, newPassword)
}

/**
 * Mark a user's email as verified
 * @param userId - The user's UUID
 * @returns true if the email was marked as verified
 */
export async function verifyUserEmail(userId: string): Promise<boolean> {
  const result = await db
    .update(users)
    .set({
      emailVerified: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id })

  return result.length > 0
}

/**
 * Check if a user's email is verified
 * @param userId - The user's UUID
 * @returns true if the email is verified, false otherwise
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const user = await getUserById(userId)
  return user?.emailVerified !== null
}
