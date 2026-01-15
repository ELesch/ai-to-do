/**
 * VisuallyHidden Component
 * Renders content that is visually hidden but accessible to screen readers
 * Useful for providing accessible labels to icon-only buttons and other visual elements
 */

import * as React from 'react'

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Content to be hidden visually but read by screen readers
   */
  children: React.ReactNode
  /**
   * When true, renders content as inline to avoid layout issues
   * @default false
   */
  inline?: boolean
}

/**
 * VisuallyHidden component hides content from visual users while keeping it
 * accessible to screen readers. This is essential for:
 * - Icon-only buttons that need accessible names
 * - Additional context for screen reader users
 * - Form labels that are visually implicit but need explicit labeling
 *
 * @example
 * ```tsx
 * <button>
 *   <TrashIcon />
 *   <VisuallyHidden>Delete task</VisuallyHidden>
 * </button>
 * ```
 */
export function VisuallyHidden({
  children,
  inline = false,
  style,
  ...props
}: VisuallyHiddenProps) {
  return (
    <span
      {...props}
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
        ...(inline && { display: 'inline' }),
        ...style,
      }}
    >
      {children}
    </span>
  )
}

/**
 * Hook to get visually hidden styles for use in custom components
 */
export function useVisuallyHiddenStyles(): React.CSSProperties {
  return {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  }
}
