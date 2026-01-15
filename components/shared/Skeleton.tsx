/**
 * Skeleton Loading Components
 * Provides placeholder UI elements during data loading states
 */

import { type FC } from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// Base Skeleton Component
// ============================================================================

interface SkeletonProps {
  className?: string
}

/**
 * Base skeleton element with animated pulse effect
 */
export const Skeleton: FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
    />
  )
}

// ============================================================================
// Text Skeleton
// ============================================================================

interface TextSkeletonProps {
  /** Width of the text skeleton (e.g., 'w-32', 'w-full', '150px') */
  width?: string
  /** Height variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const textSizeMap = {
  xs: 'h-2.5',
  sm: 'h-3',
  md: 'h-4',
  lg: 'h-5',
  xl: 'h-6',
}

/**
 * Skeleton for text content
 */
export const TextSkeleton: FC<TextSkeletonProps> = ({
  width = 'w-full',
  size = 'md',
  className,
}) => {
  return (
    <Skeleton
      className={cn(
        textSizeMap[size],
        width,
        'rounded',
        className
      )}
    />
  )
}

// ============================================================================
// Task Card Skeleton
// ============================================================================

interface TaskCardSkeletonProps {
  /** Show priority badge placeholder */
  showPriority?: boolean
  /** Show date placeholder */
  showDate?: boolean
  /** Show project badge placeholder */
  showProject?: boolean
  className?: string
}

/**
 * Skeleton for TaskCard component
 */
export const TaskCardSkeleton: FC<TaskCardSkeletonProps> = ({
  showPriority = true,
  showDate = true,
  showProject = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 animate-pulse',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox placeholder */}
        <div className="h-4 w-4 rounded bg-muted mt-0.5 shrink-0" />

        {/* Content area */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <TextSkeleton width="w-3/4" size="md" />

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2">
            {showDate && (
              <div className="flex items-center gap-1">
                <Skeleton className="h-3.5 w-3.5 rounded" />
                <TextSkeleton width="w-16" size="sm" />
              </div>
            )}
            {showProject && (
              <Skeleton className="h-5 w-20 rounded-full" />
            )}
          </div>
        </div>

        {/* Right side: priority badge */}
        {showPriority && (
          <Skeleton className="h-5 w-14 rounded-full shrink-0" />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Project Card Skeleton
// ============================================================================

interface ProjectCardSkeletonProps {
  /** Show description placeholder */
  showDescription?: boolean
  className?: string
}

/**
 * Skeleton for ProjectCard component
 */
export const ProjectCardSkeleton: FC<ProjectCardSkeletonProps> = ({
  showDescription = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 shadow-sm animate-pulse',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon placeholder */}
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />

          {/* Name and description */}
          <div className="flex-1 min-w-0 space-y-2">
            <TextSkeleton width="w-32" size="md" />
            {showDescription && (
              <TextSkeleton width="w-24" size="sm" />
            )}
          </div>
        </div>
      </div>

      {/* Stats and progress */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <TextSkeleton width="w-20" size="sm" />
          <TextSkeleton width="w-8" size="sm" />
        </div>
        {/* Progress bar */}
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    </div>
  )
}

// ============================================================================
// List Skeleton
// ============================================================================

interface ListSkeletonProps {
  /** Number of skeleton items to render */
  count?: number
  /** Type of list items */
  variant?: 'task' | 'project' | 'simple'
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg'
  /** Additional class for container */
  className?: string
}

const gapMap = {
  sm: 'space-y-1',
  md: 'space-y-2',
  lg: 'space-y-4',
}

/**
 * Skeleton for list of items
 */
export const ListSkeleton: FC<ListSkeletonProps> = ({
  count = 5,
  variant = 'simple',
  gap = 'md',
  className,
}) => {
  return (
    <div className={cn(gapMap[gap], className)}>
      {Array.from({ length: count }).map((_, index) => {
        switch (variant) {
          case 'task':
            return <TaskCardSkeleton key={index} />
          case 'project':
            return <ProjectCardSkeleton key={index} />
          default:
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card animate-pulse"
              >
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <TextSkeleton width="w-1/2" size="sm" />
                  <TextSkeleton width="w-1/3" size="xs" />
                </div>
              </div>
            )
        }
      })}
    </div>
  )
}

// ============================================================================
// Grid Skeleton
// ============================================================================

interface GridSkeletonProps {
  /** Number of skeleton items */
  count?: number
  /** Type of grid items */
  variant?: 'project' | 'card'
  /** Grid columns configuration */
  columns?: string
  className?: string
}

/**
 * Skeleton for grid layouts
 */
export const GridSkeleton: FC<GridSkeletonProps> = ({
  count = 6,
  variant = 'project',
  columns = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  className,
}) => {
  return (
    <div className={cn('grid gap-4', columns, className)}>
      {Array.from({ length: count }).map((_, index) => {
        if (variant === 'project') {
          return <ProjectCardSkeleton key={index} />
        }
        return (
          <div
            key={index}
            className="rounded-xl border bg-card p-6 animate-pulse"
          >
            <Skeleton className="h-12 w-12 rounded-lg mb-4" />
            <TextSkeleton width="w-2/3" size="lg" className="mb-2" />
            <TextSkeleton width="w-full" size="sm" />
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Form Skeleton
// ============================================================================

interface FormSkeletonProps {
  /** Number of form fields */
  fields?: number
  /** Show submit button */
  showButton?: boolean
  className?: string
}

/**
 * Skeleton for form layouts
 */
export const FormSkeleton: FC<FormSkeletonProps> = ({
  fields = 3,
  showButton = true,
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2 animate-pulse">
          {/* Label */}
          <TextSkeleton width="w-24" size="sm" />
          {/* Input */}
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      {showButton && (
        <Skeleton className="h-10 w-32 rounded-md" />
      )}
    </div>
  )
}

// ============================================================================
// Card Section Skeleton
// ============================================================================

interface CardSectionSkeletonProps {
  /** Show header with icon */
  showHeader?: boolean
  /** Number of content lines */
  contentLines?: number
  className?: string
}

/**
 * Skeleton for card-based sections (like settings cards)
 */
export const CardSectionSkeleton: FC<CardSectionSkeletonProps> = ({
  showHeader = true,
  contentLines = 3,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card shadow-sm animate-pulse',
        className
      )}
    >
      {showHeader && (
        <div className="p-6 pb-4 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <TextSkeleton width="w-32" size="lg" />
          </div>
          <TextSkeleton width="w-48" size="sm" />
        </div>
      )}
      <div className="p-6 pt-0 space-y-4">
        {Array.from({ length: contentLines }).map((_, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              <TextSkeleton width="w-24" size="sm" />
              <TextSkeleton width="w-40" size="xs" />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Dashboard Skeleton
// ============================================================================

/**
 * Skeleton for dashboard summary cards
 */
export const DashboardSkeleton: FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="space-y-2 animate-pulse">
        <TextSkeleton width="w-40" size="xl" />
        <TextSkeleton width="w-64" size="md" />
      </div>

      {/* Quick add placeholder */}
      <Skeleton className="h-12 w-full rounded-lg" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border bg-card p-6 animate-pulse"
          >
            <TextSkeleton width="w-20" size="sm" className="mb-2" />
            <Skeleton className="h-10 w-16 rounded mb-2" />
            <TextSkeleton width="w-32" size="xs" />
          </div>
        ))}
      </div>

      {/* Quick links placeholder */}
      <div className="flex gap-4 animate-pulse">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-28 rounded-md" />
        ))}
      </div>

      {/* Recent tasks section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between animate-pulse">
          <TextSkeleton width="w-32" size="lg" />
          <Skeleton className="h-8 w-20 rounded" />
        </div>
        <ListSkeleton count={5} variant="task" />
      </div>
    </div>
  )
}

// ============================================================================
// Settings Page Skeleton
// ============================================================================

/**
 * Skeleton for settings page layout
 */
export const SettingsPageSkeleton: FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('space-y-8 max-w-4xl mx-auto', className)}>
      {/* Header */}
      <div className="space-y-2 animate-pulse">
        <TextSkeleton width="w-32" size="xl" />
        <TextSkeleton width="w-56" size="md" />
      </div>

      {/* Settings sections */}
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSectionSkeleton
            key={index}
            contentLines={index === 0 ? 2 : 3}
          />
        ))}
      </div>
    </div>
  )
}
