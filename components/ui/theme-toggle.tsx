/**
 * Theme Toggle Component
 * Provides a slider to switch between Auto, Light, and Dark modes
 */

'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { Monitor, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

type ThemeMode = 'system' | 'light' | 'dark'

const themes: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: 'system', label: 'Auto', icon: <Monitor className="h-4 w-4" /> },
  { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
]

// Hydration-safe mounting detection
const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  )
}

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const mounted = useIsMounted()

  if (!mounted) {
    return (
      <div
        className={cn(
          'bg-muted flex items-center gap-1 rounded-lg p-1',
          className
        )}
      >
        {themes.map((t) => (
          <div
            key={t.value}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm"
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-muted flex items-center gap-1 rounded-lg p-1',
        className
      )}
      role="radiogroup"
      aria-label="Theme selection"
    >
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => setTheme(t.value)}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all',
            theme === t.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          role="radio"
          aria-checked={theme === t.value}
          aria-label={`${t.label} theme`}
        >
          {t.icon}
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Compact theme toggle for header/toolbar use
 */
export function ThemeToggleCompact({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const mounted = useIsMounted()

  const cycleTheme = () => {
    const currentIndex = themes.findIndex((t) => t.value === theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex].value)
  }

  if (!mounted) {
    return (
      <button
        className={cn(
          'hover:bg-muted flex h-9 w-9 items-center justify-center rounded-md transition-colors',
          className
        )}
        aria-label="Toggle theme"
      >
        <Monitor className="h-5 w-5" />
      </button>
    )
  }

  const currentTheme = themes.find((t) => t.value === theme) || themes[0]

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        'hover:bg-muted flex h-9 w-9 items-center justify-center rounded-md transition-colors',
        className
      )}
      aria-label={`Current theme: ${currentTheme.label}. Click to change.`}
    >
      {currentTheme.icon}
    </button>
  )
}
