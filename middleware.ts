/**
 * Next.js Middleware for Route Protection and Security Headers
 * Handles authentication-based route access control and security hardening
 *
 * This middleware automatically runs on Vercel Edge Runtime for optimal performance.
 * It uses only Edge-compatible APIs (no Node.js-specific modules).
 *
 * Note: Next.js middleware runs on Edge by default - no explicit runtime declaration needed.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/today',
  '/upcoming',
  '/projects',
  '/settings',
  '/task',
]

// Routes that should redirect authenticated users away (auth pages)
const authRoutes = ['/login', '/register', '/forgot-password']

// Public routes that don't require any authentication checks
const publicRoutes = ['/', '/api/health', '/api/auth']

// =============================================================================
// SECURITY HEADERS CONFIGURATION
// =============================================================================

/**
 * Security headers to apply to all responses
 * These help protect against common web vulnerabilities
 */
function getSecurityHeaders(isProduction: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    // Prevent clickjacking attacks by disallowing framing
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Control how much referrer information is sent
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Prevent XSS attacks (legacy header, CSP is preferred)
    'X-XSS-Protection': '1; mode=block',

    // Disable client-side caching for HTML pages (not static assets)
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',

    // Permissions Policy (formerly Feature-Policy)
    // Restrict access to sensitive browser features
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', '),

    // Content Security Policy
    // Restricts sources for scripts, styles, and other content
    'Content-Security-Policy': [
      // Default to self for all content types
      "default-src 'self'",
      // Allow inline scripts for Next.js, and eval in development
      `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
      // Allow inline styles for styled components and CSS-in-JS
      "style-src 'self' 'unsafe-inline'",
      // Allow images from self and data URIs (for inline images)
      "img-src 'self' data: blob: https:",
      // Allow fonts from self
      "font-src 'self' data:",
      // Allow connections to self and Anthropic API
      "connect-src 'self' https://api.anthropic.com",
      // Allow media from self
      "media-src 'self'",
      // Disallow object/embed/applet elements
      "object-src 'none'",
      // Restrict base URI to self
      "base-uri 'self'",
      // Restrict form submissions to self
      "form-action 'self'",
      // Disallow framing entirely
      "frame-ancestors 'none'",
      // Block mixed content
      'block-all-mixed-content',
      // Upgrade insecure requests in production
      isProduction ? 'upgrade-insecure-requests' : '',
    ]
      .filter(Boolean)
      .join('; '),
  }

  // HTTP Strict Transport Security (HSTS)
  // Only in production - forces HTTPS for all future requests
  if (isProduction) {
    headers['Strict-Transport-Security'] =
      'max-age=31536000; includeSubDomains; preload'
  }

  return headers
}

// =============================================================================
// ROUTE MATCHING HELPERS
// =============================================================================

/**
 * Check if a path matches any of the given route patterns
 * Supports exact matches and prefix matches (e.g., /dashboard/*)
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((route) => {
    // Exact match
    if (pathname === route) return true
    // Prefix match for nested routes
    if (pathname.startsWith(`${route}/`)) return true
    return false
  })
}

// =============================================================================
// AUTHENTICATION HELPERS
// =============================================================================

/**
 * Get the authentication token from cookies
 * This checks for common auth cookie names across NextAuth versions
 */
function getAuthToken(request: NextRequest): string | null {
  // Check for NextAuth v5 / Auth.js session token (JWT strategy)
  const authJsToken =
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value

  if (authJsToken) return authJsToken

  // Check for NextAuth v4 session token (fallback)
  const nextAuthToken =
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value

  if (nextAuthToken) return nextAuthToken

  // Check for custom session token
  const sessionToken = request.cookies.get('session-token')?.value
  if (sessionToken) return sessionToken

  return null
}

/**
 * Check if the user is authenticated based on session cookie
 * Note: This is a basic check - full validation happens server-side
 */
function isAuthenticated(request: NextRequest): boolean {
  return getAuthToken(request) !== null
}

// =============================================================================
// MAIN MIDDLEWARE
// =============================================================================

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProduction = process.env.NODE_ENV === 'production'

  // Skip middleware for static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Static files like .ico, .png, etc.
  ) {
    return NextResponse.next()
  }

  // Create response with security headers
  let response: NextResponse

  const authenticated = isAuthenticated(request)

  // Check if trying to access protected routes
  if (matchesRoute(pathname, protectedRoutes)) {
    if (!authenticated) {
      // Redirect to login with return URL
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      response = NextResponse.redirect(loginUrl)
    } else {
      response = NextResponse.next()
    }
  }
  // Redirect authenticated users from landing page to dashboard
  else if (pathname === '/') {
    if (authenticated) {
      const dashboardUrl = new URL('/dashboard', request.url)
      response = NextResponse.redirect(dashboardUrl)
    } else {
      response = NextResponse.next()
    }
  }
  // Check if authenticated user is trying to access auth pages
  else if (matchesRoute(pathname, authRoutes)) {
    if (authenticated) {
      // Redirect to dashboard
      const dashboardUrl = new URL('/dashboard', request.url)
      response = NextResponse.redirect(dashboardUrl)
    } else {
      response = NextResponse.next()
    }
  } else {
    response = NextResponse.next()
  }

  // Apply security headers to all responses
  const securityHeaders = getSecurityHeaders(isProduction)
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value)
  }

  return response
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
