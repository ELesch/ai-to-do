/**
 * ErrorFallback Component
 * Reusable error display component with different variants
 */

'use client'

import { type FC, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { type ErrorCode } from '@/lib/utils/errors'

/**
 * Error fallback variants
 */
export type ErrorFallbackVariant = 'page' | 'section' | 'inline'

/**
 * ErrorFallback props
 */
export interface ErrorFallbackProps {
  /** The error that occurred */
  error?: Error | null
  /** The error code for additional context */
  errorCode?: ErrorCode
  /** Custom error title */
  title?: string
  /** Custom error message */
  message?: string
  /** Variant of the error display */
  variant?: ErrorFallbackVariant
  /** Callback when "Try again" is clicked */
  onRetry?: () => void
  /** Callback when "Report" is clicked */
  onReport?: () => void
  /** Show the report button */
  showReport?: boolean
  /** Custom action buttons */
  actions?: ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * Error icon SVG component
 */
const ErrorIcon: FC<{ className?: string }> = ({ className }) => (
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

/**
 * Default error messages by variant
 */
const defaultMessages: Record<
  ErrorFallbackVariant,
  { title: string; message: string }
> = {
  page: {
    title: 'Something went wrong',
    message:
      'We encountered an unexpected error. Please try again or contact support if the problem persists.',
  },
  section: {
    title: 'Failed to load',
    message: 'This section could not be loaded. Please try again.',
  },
  inline: {
    title: 'Error',
    message: 'Something went wrong.',
  },
}

/**
 * ErrorFallback component
 * Displays user-friendly error messages with recovery options
 */
export const ErrorFallback: FC<ErrorFallbackProps> = ({
  error,
  errorCode,
  title,
  message,
  variant = 'section',
  onRetry,
  onReport,
  showReport = false,
  actions,
  className,
}) => {
  const defaults = defaultMessages[variant]
  const displayTitle = title || defaults.title
  const displayMessage = message || error?.message || defaults.message

  // Page variant - full page error display
  if (variant === 'page') {
    return (
      <div
        className={cn(
          'flex min-h-[400px] flex-col items-center justify-center px-4 py-16',
          className
        )}
        role="alert"
        aria-live="assertive"
      >
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <ErrorIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>

          <h1 className="text-foreground mb-2 text-2xl font-semibold">
            {displayTitle}
          </h1>

          <p className="text-muted-foreground mb-8">{displayMessage}</p>

          {errorCode && (
            <p className="text-muted-foreground mb-4 text-sm">
              Error code: {errorCode}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {actions || (
              <>
                {onRetry && <Button onClick={onRetry}>Try again</Button>}
                {showReport && onReport && (
                  <Button variant="outline" onClick={onReport}>
                    Report issue
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Section variant - contained error display for sections
  if (variant === 'section') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 dark:border-red-800 dark:bg-red-950/30',
          className
        )}
        role="alert"
        aria-live="assertive"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <ErrorIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>

          <h2 className="text-foreground mb-2 text-lg font-medium">
            {displayTitle}
          </h2>

          <p className="text-muted-foreground mb-6 max-w-sm text-sm">
            {displayMessage}
          </p>

          <div className="flex justify-center gap-3">
            {actions || (
              <>
                {onRetry && (
                  <Button size="sm" onClick={onRetry}>
                    Try again
                  </Button>
                )}
                {showReport && onReport && (
                  <Button size="sm" variant="outline" onClick={onReport}>
                    Report
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Inline variant - minimal inline error display
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <ErrorIcon className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">
          {displayTitle}
        </p>
        <p className="truncate text-sm text-red-600 dark:text-red-400">
          {displayMessage}
        </p>
      </div>

      {actions ||
        (onRetry && (
          <Button size="sm" variant="ghost" onClick={onRetry}>
            Retry
          </Button>
        ))}
    </div>
  )
}

/**
 * Simple inline error message
 */
export const InlineError: FC<{
  message: string
  className?: string
}> = ({ message, className }) => (
  <p
    className={cn('text-sm text-red-600 dark:text-red-400', className)}
    role="alert"
  >
    {message}
  </p>
)

/**
 * Error message with icon
 */
export const ErrorMessage: FC<{
  message: string
  className?: string
}> = ({ message, className }) => (
  <div
    className={cn(
      'flex items-center gap-2 text-red-600 dark:text-red-400',
      className
    )}
    role="alert"
  >
    <ErrorIcon className="h-4 w-4 flex-shrink-0" />
    <span className="text-sm">{message}</span>
  </div>
)

export default ErrorFallback
