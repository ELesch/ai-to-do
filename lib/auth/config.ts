/**
 * NextAuth.js v5 Configuration
 * Authentication configuration with Drizzle adapter and Credentials provider
 */

import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// Credentials validation schema
const credentialsSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// Extend the default session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
  }
}

export const authConfig: NextAuthConfig = {
  // Note: We're not using the Drizzle adapter because:
  // 1. We're using JWT strategy (not database sessions)
  // 2. Credentials provider doesn't use the adapter for user lookup
  // 3. Our schema has custom columns that don't match the adapter's expectations
  // If OAuth is added later, consider creating adapter-compatible tables

  // Configure authentication providers
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'you@example.com',
        },
        password: {
          label: 'Password',
          type: 'password',
          placeholder: '••••••••',
        },
      },
      async authorize(credentials) {
        // Validate credentials format
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) {
          return null
        }

        const { email, password } = parsed.data

        // Find user by email
        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase()),
        })

        // Check if user exists and has a password set
        if (!user || !user.passwordHash) {
          return null
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash)
        if (!isValidPassword) {
          return null
        }

        // Return user data for session
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],

  // Custom pages for authentication flows
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/login',
    newUser: '/onboarding',
  },

  // Session configuration - use JWT strategy
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours - update session if older than this
  },

  // JWT configuration
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Callbacks for customizing authentication behavior
  callbacks: {
    /**
     * JWT callback - called whenever a JWT is created or updated
     * Add user ID to the token for later use in session callback
     */
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },

    /**
     * Session callback - called whenever session is checked
     * Add user ID from JWT to the session object
     */
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub
      }
      return session
    },

    /**
     * Authorized callback - controls access to protected routes
     * Used by middleware to check if user is authenticated
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnAuthPage =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/register') ||
        nextUrl.pathname.startsWith('/forgot-password')
      const isOnPublicPage =
        nextUrl.pathname === '/' || nextUrl.pathname.startsWith('/api/auth')

      // Allow access to public pages and API routes
      if (isOnPublicPage) {
        return true
      }

      // Redirect authenticated users away from auth pages
      if (isOnAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/today', nextUrl))
        }
        return true
      }

      // Require authentication for all other pages
      return isLoggedIn
    },
  },

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Trust the host header (required for some deployment platforms)
  trustHost: true,
}
