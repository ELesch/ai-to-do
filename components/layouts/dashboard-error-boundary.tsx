/**
 * Dashboard Error Boundary Wrapper
 * Client component wrapper for error boundary in dashboard layout
 */

'use client'

import { type ReactNode } from 'react'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { ErrorFallback } from '@/components/shared/ErrorFallback'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface DashboardErrorBoundaryProps {
  children: ReactNode
}

/**
 * Custom fallback for dashboard errors
 */
function DashboardErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error
  resetErrorBoundary: () => void
}) {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-6">
      <ErrorFallback
        error={error}
        variant="page"
        title="Something went wrong"
        message="We encountered an error loading this page. Please try again or navigate to a different section."
        onRetry={resetErrorBoundary}
        showReport
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={resetErrorBoundary}>
              Try again
            </Button>
            <Link href="/today">
              <Button variant="outline">
                Go to Today
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost">
                Back to Home
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  )
}

/**
 * Dashboard Error Boundary
 * Wraps dashboard content with error handling
 */
export function DashboardErrorBoundary({ children }: DashboardErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <DashboardErrorFallback
          error={error}
          resetErrorBoundary={resetErrorBoundary}
        />
      )}
      context={{
        path: '/dashboard',
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

export default DashboardErrorBoundary
