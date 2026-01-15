/**
 * NextAuth.js v5 Export Module
 * Exports authentication handlers and utilities
 */

import NextAuth from 'next-auth'
import { authConfig } from './config'

/**
 * NextAuth.js instance with all handlers and utilities
 *
 * - handlers: GET and POST handlers for /api/auth/* routes
 * - auth: Function to get the current session (server-side)
 * - signIn: Function to programmatically sign in a user
 * - signOut: Function to programmatically sign out a user
 */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

// Re-export the config for use in middleware
export { authConfig } from './config'
