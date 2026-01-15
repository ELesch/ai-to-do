/**
 * Auth Utilities
 * Helper functions for authentication operations
 */

import { randomBytes } from 'crypto'

/**
 * Generate a secure verification token
 * Uses cryptographically secure random bytes converted to hex
 * @returns A 32-character hex string token
 */
export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Password strength requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 */
export interface PasswordStrengthResult {
  isStrong: boolean
  errors: string[]
}

/**
 * Check if a password meets the strength requirements
 * @param password - The password to validate
 * @returns Object containing whether the password is strong and any error messages
 */
export function isPasswordStrong(password: string): PasswordStrengthResult {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least 1 uppercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least 1 number')
  }

  return {
    isStrong: errors.length === 0,
    errors,
  }
}

/**
 * Simple password strength check that returns a boolean
 * @param password - The password to validate
 * @returns true if the password meets all requirements, false otherwise
 */
export function checkPasswordStrength(password: string): boolean {
  return isPasswordStrong(password).isStrong
}

/**
 * Generate a random session token
 * @returns A 64-character hex string suitable for session tokens
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Calculate token expiration date
 * @param days - Number of days until expiration (default: 30)
 * @returns Date object representing the expiration time
 */
export function getTokenExpiration(days: number = 30): Date {
  const expiration = new Date()
  expiration.setDate(expiration.getDate() + days)
  return expiration
}

/**
 * Check if a token has expired
 * @param expirationDate - The expiration date to check
 * @returns true if the token has expired, false otherwise
 */
export function isTokenExpired(expirationDate: Date): boolean {
  return new Date() > expirationDate
}

/**
 * Normalize email address for consistent storage and lookup
 * @param email - The email address to normalize
 * @returns Lowercase, trimmed email address
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

/**
 * Validate email format using a basic regex pattern
 * @param email - The email to validate
 * @returns true if the email format is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
