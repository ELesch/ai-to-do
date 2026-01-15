/**
 * SkipLink Component
 * "Skip to main content" link that appears on focus for keyboard navigation
 * Allows keyboard users to skip repetitive navigation and jump directly to main content
 */

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /**
   * The ID of the element to skip to (without the # symbol)
   * @default "main-content"
   */
  targetId?: string
  /**
   * The text to display in the skip link
   * @default "Skip to main content"
   */
  children?: React.ReactNode
}

/**
 * SkipLink component provides a way for keyboard users to skip repetitive
 * navigation elements and jump directly to the main content of the page.
 *
 * The link is visually hidden until it receives focus, at which point it
 * becomes visible at the top of the viewport.
 *
 * @example
 * ```tsx
 * // In your layout component
 * <body>
 *   <SkipLink targetId="main-content" />
 *   <nav>...</nav>
 *   <main id="main-content">...</main>
 * </body>
 * ```
 */
export function SkipLink({
  targetId = 'main-content',
  children = 'Skip to main content',
  className,
  ...props
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const target = document.getElementById(targetId)
    if (target) {
      // Set tabindex if not already focusable
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1')
      }
      target.focus()
      // Scroll to target
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    props.onClick?.(e)
  }

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        // Base styles - visually hidden by default
        'fixed top-0 left-0 z-[9999]',
        'px-4 py-2 m-2',
        'bg-primary text-primary-foreground',
        'font-medium text-sm rounded-md',
        'transition-transform duration-200',
        // Hidden state (translate off screen)
        '-translate-y-full',
        // Visible on focus
        'focus:translate-y-0',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        // High contrast for visibility
        'shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </a>
  )
}

/**
 * SkipLinks component for multiple skip links
 * Useful when you have multiple main regions to navigate to
 */
interface SkipLinksProps {
  links: Array<{
    targetId: string
    label: string
  }>
  className?: string
}

export function SkipLinks({ links, className }: SkipLinksProps) {
  return (
    <div className={cn('skip-links-container', className)}>
      {links.map((link) => (
        <SkipLink key={link.targetId} targetId={link.targetId}>
          {link.label}
        </SkipLink>
      ))}
    </div>
  )
}
