/**
 * Class Name Utility
 * Combines Tailwind CSS classes with conditional logic
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges class names using clsx and tailwind-merge
 * Handles conditional classes and deduplicates Tailwind classes
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-blue-500', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
