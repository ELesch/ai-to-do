/**
 * useFocusTrap Hook
 * Traps focus within a container element for accessibility in modals/dialogs
 *
 * Features:
 * - Prevents focus from leaving the container
 * - Cycles focus from last to first (and vice versa) focusable elements
 * - Restores focus to trigger element on unmount
 * - Supports initial focus element selection
 */

import { useEffect, useRef, useCallback } from 'react'

/**
 * Selector for all focusable elements
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Options for the focus trap hook
 */
interface UseFocusTrapOptions {
  /**
   * Whether the focus trap is active
   * @default true
   */
  enabled?: boolean
  /**
   * Element to focus when trap is activated
   * If not provided, focuses the first focusable element
   */
  initialFocusRef?: React.RefObject<HTMLElement>
  /**
   * Element to focus when trap is deactivated
   * If not provided, focuses the element that had focus before activation
   */
  returnFocusRef?: React.RefObject<HTMLElement>
  /**
   * Whether to restore focus on unmount
   * @default true
   */
  restoreFocus?: boolean
  /**
   * Callback when Escape key is pressed
   */
  onEscape?: () => void
  /**
   * Whether clicking outside should trigger onEscape
   * @default false
   */
  closeOnOutsideClick?: boolean
}

/**
 * Return type for the focus trap hook
 */
interface UseFocusTrapReturn {
  /**
   * Ref to attach to the container element
   */
  containerRef: React.RefObject<HTMLElement | null>
  /**
   * Manually focus the first focusable element
   */
  focusFirst: () => void
  /**
   * Manually focus the last focusable element
   */
  focusLast: () => void
  /**
   * Get all focusable elements in the container
   */
  getFocusableElements: () => HTMLElement[]
}

/**
 * Hook for trapping focus within a container element
 *
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose }) {
 *   const { containerRef } = useFocusTrap({
 *     enabled: isOpen,
 *     onEscape: onClose,
 *   })
 *
 *   return (
 *     <div ref={containerRef} role="dialog" aria-modal="true">
 *       <button>First button</button>
 *       <button onClick={onClose}>Close</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useFocusTrap(options: UseFocusTrapOptions = {}): UseFocusTrapReturn {
  const {
    enabled = true,
    initialFocusRef,
    returnFocusRef,
    restoreFocus = true,
    onEscape,
    closeOnOutsideClick = false,
  } = options

  const containerRef = useRef<HTMLElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  /**
   * Get all focusable elements within the container
   */
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return []

    const elements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    return Array.from(elements).filter((el) => {
      // Filter out elements that are visually hidden or have display: none
      const style = getComputedStyle(el)
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        !el.hasAttribute('hidden')
      )
    })
  }, [])

  /**
   * Focus the first focusable element
   */
  const focusFirst = useCallback(() => {
    const elements = getFocusableElements()
    if (elements.length > 0) {
      elements[0].focus()
    }
  }, [getFocusableElements])

  /**
   * Focus the last focusable element
   */
  const focusLast = useCallback(() => {
    const elements = getFocusableElements()
    if (elements.length > 0) {
      elements[elements.length - 1].focus()
    }
  }, [getFocusableElements])

  /**
   * Handle keydown events for focus trapping
   */
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Escape key
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault()
        onEscape()
        return
      }

      // Handle Tab key for focus trapping
      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      // Shift + Tab: if on first element, go to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
        return
      }

      // Tab: if on last element, go to first
      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
        return
      }

      // If focus is outside the container, bring it back
      if (
        containerRef.current &&
        !containerRef.current.contains(document.activeElement)
      ) {
        event.preventDefault()
        event.shiftKey ? focusLast() : focusFirst()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, getFocusableElements, focusFirst, focusLast, onEscape])

  /**
   * Handle click outside for closing
   */
  useEffect(() => {
    if (!enabled || !closeOnOutsideClick || !onEscape) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onEscape()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [enabled, closeOnOutsideClick, onEscape])

  /**
   * Set initial focus and store previous active element
   */
  useEffect(() => {
    if (!enabled) return

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement | null

    // Set initial focus
    const setInitialFocus = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus()
      } else {
        focusFirst()
      }
    }

    // Delay to ensure the container is rendered
    const timeoutId = setTimeout(setInitialFocus, 0)

    return () => {
      clearTimeout(timeoutId)

      // Restore focus on cleanup
      if (restoreFocus) {
        const returnElement = returnFocusRef?.current || previousActiveElement.current
        if (returnElement && typeof returnElement.focus === 'function') {
          returnElement.focus()
        }
      }
    }
  }, [enabled, initialFocusRef, returnFocusRef, restoreFocus, focusFirst])

  return {
    containerRef,
    focusFirst,
    focusLast,
    getFocusableElements,
  }
}

/**
 * Helper hook for focus management in a list of items
 * Useful for dropdown menus, listboxes, etc.
 */
interface UseFocusListOptions {
  /**
   * Whether the focus list is active
   */
  enabled?: boolean
  /**
   * Callback when an item should be focused
   */
  onFocusChange?: (index: number) => void
  /**
   * Initial focused index
   */
  initialIndex?: number
  /**
   * Whether to loop at the ends
   * @default true
   */
  loop?: boolean
  /**
   * Orientation of the list
   * @default 'vertical'
   */
  orientation?: 'horizontal' | 'vertical'
}

/**
 * Hook for managing focus within a list of items
 */
export function useFocusList(
  itemCount: number,
  options: UseFocusListOptions = {}
) {
  const {
    enabled = true,
    onFocusChange,
    initialIndex = 0,
    loop = true,
    orientation = 'vertical',
  } = options

  const currentIndex = useRef(initialIndex)

  const focusNext = useCallback(() => {
    if (!enabled || itemCount === 0) return

    let nextIndex = currentIndex.current + 1
    if (nextIndex >= itemCount) {
      nextIndex = loop ? 0 : itemCount - 1
    }
    currentIndex.current = nextIndex
    onFocusChange?.(nextIndex)
  }, [enabled, itemCount, loop, onFocusChange])

  const focusPrevious = useCallback(() => {
    if (!enabled || itemCount === 0) return

    let prevIndex = currentIndex.current - 1
    if (prevIndex < 0) {
      prevIndex = loop ? itemCount - 1 : 0
    }
    currentIndex.current = prevIndex
    onFocusChange?.(prevIndex)
  }, [enabled, itemCount, loop, onFocusChange])

  const focusIndex = useCallback(
    (index: number) => {
      if (!enabled || index < 0 || index >= itemCount) return
      currentIndex.current = index
      onFocusChange?.(index)
    },
    [enabled, itemCount, onFocusChange]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled) return

      const isNext =
        orientation === 'vertical'
          ? event.key === 'ArrowDown'
          : event.key === 'ArrowRight'
      const isPrevious =
        orientation === 'vertical'
          ? event.key === 'ArrowUp'
          : event.key === 'ArrowLeft'

      if (isNext) {
        event.preventDefault()
        focusNext()
      } else if (isPrevious) {
        event.preventDefault()
        focusPrevious()
      } else if (event.key === 'Home') {
        event.preventDefault()
        focusIndex(0)
      } else if (event.key === 'End') {
        event.preventDefault()
        focusIndex(itemCount - 1)
      }
    },
    [enabled, orientation, focusNext, focusPrevious, focusIndex, itemCount]
  )

  return {
    currentIndex: currentIndex.current,
    focusNext,
    focusPrevious,
    focusIndex,
    handleKeyDown,
  }
}

/**
 * Hook to programmatically manage focus with announcements for screen readers
 */
export function useFocusAnnouncement() {
  const announcerRef = useRef<HTMLDivElement | null>(null)

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Create announcer element if it doesn't exist
    if (!announcerRef.current) {
      announcerRef.current = document.createElement('div')
      announcerRef.current.setAttribute('aria-live', priority)
      announcerRef.current.setAttribute('aria-atomic', 'true')
      announcerRef.current.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `
      document.body.appendChild(announcerRef.current)
    }

    // Clear and set new message
    announcerRef.current.textContent = ''
    // Use setTimeout to ensure screen readers pick up the change
    setTimeout(() => {
      if (announcerRef.current) {
        announcerRef.current.textContent = message
      }
    }, 100)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (announcerRef.current) {
        document.body.removeChild(announcerRef.current)
        announcerRef.current = null
      }
    }
  }, [])

  return { announce }
}
