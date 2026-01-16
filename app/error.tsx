/**
 * Global Error Page
 * Next.js error boundary for page-level errors
 */

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { logError, reportError } from '@/lib/utils/errors'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error icon SVG component
 */
function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}

/**
 * Global error page component
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error to console in development
    logError(error, {
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      metadata: {
        digest: error.digest,
      },
    })
  }, [error])

  const handleReport = () => {
    reportError(error, {
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      metadata: {
        digest: error.digest,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      },
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {/* Error icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <ErrorIcon className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>

        {/* Error message */}
        <h1 className="mb-3 text-3xl font-bold text-foreground">
          Something went wrong
        </h1>

        <p className="mb-8 text-muted-foreground">
          We apologize for the inconvenience. An unexpected error has occurred.
          Please try again or contact support if the problem persists.
        </p>

        {/* Error digest for support */}
        {error.digest && (
          <p className="mb-6 text-sm text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={reset}
            className="w-full sm:w-auto"
          >
            Try again
          </Button>

          <Link href="/" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full">
              Go to Home
            </Button>
          </Link>

          <Button
            variant="ghost"
            onClick={handleReport}
            className="w-full sm:w-auto"
          >
            Report issue
          </Button>
        </div>

        {/* Additional help */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <h2 className="mb-4 text-sm font-medium text-gray-900">
            Need help?
          </h2>
          <div className="flex flex-col gap-2 text-sm text-gray-600">
            <Link href="/today" className="hover:text-primary hover:underline">
              Go to Today's Tasks
            </Link>
            <Link href="/upcoming" className="hover:text-primary hover:underline">
              View Upcoming Tasks
            </Link>
            <Link href="/projects" className="hover:text-primary hover:underline">
              Browse Projects
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
