/**
 * LoadingSpinner Component
 * Reusable spinning loader with customizable size and optional label
 */

import { type FC } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl'

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: SpinnerSize
  /** Optional label displayed below spinner */
  label?: string
  /** Additional CSS classes */
  className?: string
  /** Center the spinner in its container */
  centered?: boolean
  /** Use primary color instead of muted */
  primary?: boolean
}

// ============================================================================
// Size Configuration
// ============================================================================

const sizeConfig: Record<SpinnerSize, { icon: string; label: string }> = {
  sm: { icon: 'h-4 w-4', label: 'text-xs' },
  md: { icon: 'h-6 w-6', label: 'text-sm' },
  lg: { icon: 'h-8 w-8', label: 'text-base' },
  xl: { icon: 'h-12 w-12', label: 'text-lg' },
}

// ============================================================================
// Component
// ============================================================================

/**
 * Loading spinner with optional label
 */
export const LoadingSpinner: FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  className,
  centered = false,
  primary = false,
}) => {
  const config = sizeConfig[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2',
        centered && 'justify-center min-h-[200px]',
        className
      )}
      role="status"
      aria-label={label || 'Loading'}
    >
      <Loader2
        className={cn(
          config.icon,
          'animate-spin',
          primary ? 'text-primary' : 'text-muted-foreground'
        )}
      />
      {label && (
        <span
          className={cn(
            config.label,
            'text-muted-foreground font-medium'
          )}
        >
          {label}
        </span>
      )}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  )
}

// ============================================================================
// Full Page Spinner
// ============================================================================

interface FullPageSpinnerProps {
  /** Loading message */
  message?: string
  /** Whether to show backdrop overlay */
  overlay?: boolean
}

/**
 * Full page loading spinner for route transitions
 */
export const FullPageSpinner: FC<FullPageSpinnerProps> = ({
  message = 'Loading...',
  overlay = false,
}) => {
  return (
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center z-50',
        overlay && 'bg-background/80 backdrop-blur-sm'
      )}
    >
      <LoadingSpinner size="lg" label={message} />
    </div>
  )
}

// ============================================================================
// Inline Spinner
// ============================================================================

interface InlineSpinnerProps {
  /** Size of inline spinner */
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

const inlineSizeConfig = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
}

/**
 * Small inline spinner for buttons and form fields
 */
export const InlineSpinner: FC<InlineSpinnerProps> = ({
  size = 'sm',
  className,
}) => {
  return (
    <Loader2
      className={cn(
        inlineSizeConfig[size],
        'animate-spin',
        className
      )}
      aria-hidden="true"
    />
  )
}

// ============================================================================
// Button Loading Content
// ============================================================================

interface ButtonLoadingProps {
  /** Text to show while loading */
  loadingText?: string
  /** Text to show when not loading */
  children: React.ReactNode
  /** Whether currently loading */
  isLoading: boolean
  /** Spinner size */
  spinnerSize?: 'xs' | 'sm' | 'md'
}

/**
 * Helper component for button loading states
 */
export const ButtonLoading: FC<ButtonLoadingProps> = ({
  loadingText,
  children,
  isLoading,
  spinnerSize = 'sm',
}) => {
  if (isLoading) {
    return (
      <>
        <InlineSpinner size={spinnerSize} className="mr-2" />
        {loadingText || children}
      </>
    )
  }
  return <>{children}</>
}

// ============================================================================
// Dots Spinner
// ============================================================================

interface DotsSpinnerProps {
  /** Size of dots */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const dotsSizeConfig = {
  sm: 'h-1 w-1',
  md: 'h-1.5 w-1.5',
  lg: 'h-2 w-2',
}

/**
 * Animated dots spinner (alternative style)
 */
export const DotsSpinner: FC<DotsSpinnerProps> = ({
  size = 'md',
  className,
}) => {
  const dotSize = dotsSizeConfig[size]

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      role="status"
      aria-label="Loading"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            dotSize,
            'rounded-full bg-muted-foreground animate-bounce'
          )}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.6s',
          }}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  )
}
