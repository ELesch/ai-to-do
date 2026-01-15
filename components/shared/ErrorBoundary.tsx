/**
 * ErrorBoundary Component
 * Class component that catches rendering errors in child components
 */

'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorFallback, type ErrorFallbackVariant } from './ErrorFallback'
import { logError, reportError, type ErrorContext } from '@/lib/utils/errors'

/**
 * ErrorBoundary props
 */
export interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode
  /** Custom fallback component */
  fallback?: ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode)
  /** Variant for the default error fallback */
  variant?: ErrorFallbackVariant
  /** Custom error title */
  title?: string
  /** Custom error message */
  message?: string
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Called when reset is triggered */
  onReset?: () => void
  /** Show report button */
  showReport?: boolean
  /** Additional context for error logging */
  context?: Partial<ErrorContext>
}

/**
 * Props passed to custom fallback components
 */
export interface ErrorBoundaryFallbackProps {
  error: Error
  errorInfo: ErrorInfo | null
  resetErrorBoundary: () => void
}

/**
 * ErrorBoundary state
 */
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * ErrorBoundary class component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  /**
   * Update state so the next render will show the fallback UI
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  /**
   * Log error information when an error is caught
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Store error info in state
    this.setState({ errorInfo })

    // Log error in development
    logError(error, {
      ...this.props.context,
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    })

    // Call optional error callback
    this.props.onError?.(error, errorInfo)
  }

  /**
   * Reset the error boundary state
   */
  resetErrorBoundary = (): void => {
    this.props.onReset?.()
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  /**
   * Report error to external service
   */
  handleReport = (): void => {
    const { error, errorInfo } = this.state
    if (error) {
      reportError(error, {
        ...this.props.context,
        metadata: {
          componentStack: errorInfo?.componentStack,
        },
      })
    }
  }

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state
    const {
      children,
      fallback,
      variant = 'section',
      title,
      message,
      showReport = false,
    } = this.props

    if (hasError && error) {
      // If a custom fallback is provided
      if (fallback) {
        // If fallback is a function, call it with props
        if (typeof fallback === 'function') {
          return fallback({
            error,
            errorInfo,
            resetErrorBoundary: this.resetErrorBoundary,
          })
        }
        // Otherwise, render the fallback directly
        return fallback
      }

      // Use default ErrorFallback component
      return (
        <ErrorFallback
          error={error}
          variant={variant}
          title={title}
          message={message}
          onRetry={this.resetErrorBoundary}
          onReport={this.handleReport}
          showReport={showReport}
        />
      )
    }

    return children
  }
}

/**
 * withErrorBoundary HOC
 * Wraps a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component'

  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`

  return ComponentWithErrorBoundary
}

/**
 * useErrorBoundary hook
 * Allows functional components to trigger error boundary
 */
export function useErrorHandler(): (error: Error) => void {
  return (error: Error) => {
    throw error
  }
}

export default ErrorBoundary
