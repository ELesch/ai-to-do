/**
 * Header Component
 * Top header with search, user menu, and actions
 * Integrates with CommandPalette for global search (Cmd+K)
 */

'use client'

import { type FC, useCallback, useState } from 'react'
import { Keyboard, Search, Menu, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { ShortcutHint } from '@/components/shared/keyboard-shortcuts-dialog'
import { CommandPalette } from '@/components/shared/command-palette'
import { ThemeToggleCompact } from '@/components/ui/theme-toggle'
import { useOptionalKeyboardContext } from '@/providers/keyboard-provider'
import { cn } from '@/lib/utils'

interface HeaderProps {
  onMenuToggle?: () => void
  onAIPanelToggle?: () => void
  onSearchFocus?: () => void
  onCreateTask?: () => void
  onCreateProject?: () => void
  className?: string
}

export const Header: FC<HeaderProps> = ({
  onMenuToggle,
  onAIPanelToggle,
  onSearchFocus,
  onCreateTask,
  onCreateProject,
  className,
}) => {
  const keyboardContext = useOptionalKeyboardContext()
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  const handleKeyboardShortcuts = useCallback(() => {
    keyboardContext?.openShortcutsDialog()
  }, [keyboardContext])

  const handleSearchClick = useCallback(() => {
    setIsCommandPaletteOpen(true)
    onSearchFocus?.()
  }, [onSearchFocus])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Open command palette on any key press (except Tab for accessibility)
    if (e.key !== 'Tab' && e.key !== 'Escape') {
      e.preventDefault()
      setIsCommandPaletteOpen(true)
    }
  }, [])

  return (
    <TooltipProvider>
      <header
        className={cn(
          'border-border bg-background flex h-14 items-center justify-between border-b px-4',
          className
        )}
      >
        {/* Left side */}
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuToggle}
                aria-label="Toggle menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="flex items-center gap-2">
                <span>Toggle sidebar</span>
                <ShortcutHint shortcutId="toggle-sidebar" />
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Search - opens command palette */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSearchClick}
                onKeyDown={handleSearchKeyDown}
                className="text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/30 focus:ring-ring relative flex w-64 items-center gap-2 rounded-lg border py-1.5 pr-12 pl-3 text-left text-sm transition-colors focus:ring-2 focus:outline-none"
                aria-label="Search tasks and projects"
              >
                <Search className="h-4 w-4" />
                <span>Search...</span>
                <kbd className="bg-muted/50 text-muted-foreground absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-0.5 rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline-flex">
                  <ShortcutHint shortcutId="open-command-palette" />
                </kbd>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="flex items-center gap-2">
                <span>Search tasks, projects, and commands</span>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* Keyboard shortcuts button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleKeyboardShortcuts}
                aria-label="Keyboard shortcuts"
              >
                <Keyboard className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="flex items-center gap-2">
                <span>Keyboard shortcuts</span>
                <kbd className="bg-muted/50 rounded border px-1 py-0.5 font-mono text-[10px]">
                  ?
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* AI Panel toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onAIPanelToggle}
                aria-label="Toggle AI panel"
              >
                <Bot className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="flex items-center gap-2">
                <span>Toggle AI panel</span>
                <ShortcutHint shortcutId="toggle-ai-panel" />
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <ThemeToggleCompact />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>Toggle theme</span>
            </TooltipContent>
          </Tooltip>

          {/* User menu placeholder */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2"
                aria-label="User menu"
              >
                <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                  <User className="text-muted-foreground h-4 w-4" />
                </div>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>User menu</span>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        onCreateTask={onCreateTask}
        onCreateProject={onCreateProject}
      />
    </TooltipProvider>
  )
}
