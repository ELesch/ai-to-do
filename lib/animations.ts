/**
 * Animation Utilities
 * CSS animation class utilities and configuration for consistent animations
 */

// ============================================================================
// Animation Duration Constants
// ============================================================================

export const DURATION = {
  instant: 75,
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 500,
} as const

export type DurationKey = keyof typeof DURATION

// ============================================================================
// Easing Functions
// ============================================================================

export const EASING = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  // Custom cubic beziers
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const

export type EasingKey = keyof typeof EASING

// ============================================================================
// Animation Class Names (for Tailwind)
// ============================================================================

/**
 * Fade animations
 */
export const fadeClasses = {
  fadeIn: 'animate-fade-in',
  fadeOut: 'animate-fade-out',
  fadeInUp: 'animate-fade-in-up',
  fadeInDown: 'animate-fade-in-down',
  fadeInLeft: 'animate-fade-in-left',
  fadeInRight: 'animate-fade-in-right',
} as const

/**
 * Scale animations
 */
export const scaleClasses = {
  scaleIn: 'animate-scale-in',
  scaleOut: 'animate-scale-out',
} as const

/**
 * Slide animations
 */
export const slideClasses = {
  slideInUp: 'animate-slide-in-up',
  slideInDown: 'animate-slide-in-down',
  slideInLeft: 'animate-slide-in-left',
  slideInRight: 'animate-slide-in-right',
  slideOutUp: 'animate-slide-out-up',
  slideOutDown: 'animate-slide-out-down',
} as const

/**
 * Utility animations
 */
export const utilityClasses = {
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  ping: 'animate-ping',
  bounce: 'animate-bounce',
  shimmer: 'animate-shimmer',
} as const

// ============================================================================
// Transition Class Builders
// ============================================================================

/**
 * Build transition class string
 */
export function getTransitionClass(
  properties: string[] = ['all'],
  duration: DurationKey = 'normal',
  easing: EasingKey = 'smooth'
): string {
  return `transition-[${properties.join(',')}] duration-${DURATION[duration]} ${easing === 'smooth' ? 'ease-out' : ''}`
}

/**
 * Common transition presets
 */
export const transitions = {
  default: 'transition-all duration-200 ease-out',
  fast: 'transition-all duration-150 ease-out',
  slow: 'transition-all duration-300 ease-out',
  colors: 'transition-colors duration-200 ease-out',
  opacity: 'transition-opacity duration-200 ease-out',
  transform: 'transition-transform duration-200 ease-out',
  shadow: 'transition-shadow duration-200 ease-out',
} as const

// ============================================================================
// Stagger Animation Helpers
// ============================================================================

/**
 * Generate staggered animation delay style
 */
export function getStaggerDelay(index: number, baseDelay = 50): React.CSSProperties {
  return {
    animationDelay: `${index * baseDelay}ms`,
  }
}

/**
 * Generate staggered animation delay CSS variable
 */
export function getStaggerDelayVar(index: number, baseDelay = 50): string {
  return `--stagger-delay: ${index * baseDelay}ms`
}

/**
 * Animation delay style for list items
 */
export function getListItemStyle(
  index: number,
  options: {
    baseDelay?: number
    maxDelay?: number
  } = {}
): React.CSSProperties {
  const { baseDelay = 50, maxDelay = 500 } = options
  const delay = Math.min(index * baseDelay, maxDelay)

  return {
    animationDelay: `${delay}ms`,
    animationFillMode: 'backwards',
  }
}

// ============================================================================
// Reduced Motion Utilities
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get animation class with reduced motion fallback
 */
export function getAnimationClass(
  animationClass: string,
  fallbackClass = ''
): string {
  // This is a static utility - actual motion preference should be checked at runtime
  // or via CSS with media queries
  return animationClass
}

// ============================================================================
// Component Animation Presets
// ============================================================================

/**
 * Common component animation configurations
 */
export const componentAnimations = {
  /** Card hover animation */
  cardHover: 'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',

  /** Button press animation */
  buttonPress: 'transition-transform duration-75 active:scale-95',

  /** Panel slide in */
  panelSlide: 'animate-slide-in-right',

  /** Modal scale in */
  modalScale: 'animate-scale-in',

  /** Dropdown animation */
  dropdown: 'animate-fade-in-down',

  /** Tooltip animation */
  tooltip: 'animate-fade-in',

  /** List item animation */
  listItem: 'animate-fade-in-up',

  /** Skeleton pulse */
  skeleton: 'animate-pulse',

  /** Loading spinner */
  spinner: 'animate-spin',
} as const

// ============================================================================
// CSS Keyframe Definitions (for reference)
// ============================================================================

/**
 * These keyframes should be added to globals.css
 * Exported here for documentation purposes
 */
export const keyframeDefinitions = `
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-in-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`
