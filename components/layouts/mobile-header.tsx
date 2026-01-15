/**
 * Mobile Header Component
 * Header bar for mobile devices with hamburger menu and actions
 */

'use client'

import { type FC, useState } from 'react'
import { Search, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggleCompact } from '@/components/ui/theme-toggle'
import { CommandPalette } from '@/components/shared/command-palette'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface MobileHeaderProps {
  children?: React.ReactNode // For the hamburger menu slot
  className?: string
}

export const MobileHeader: FC<MobileHeaderProps> = ({
  children,
  className,
}) => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  return (
    <TooltipProvider>
      <header
        className={cn(
          'bg-background flex h-14 items-center justify-between border-b px-4 md:hidden',
          className
        )}
      >
        {/* Left side - Hamburger menu */}
        <div className="flex items-center gap-2">
          {children}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-sm font-bold text-white">AI</span>
            </div>
            <span className="font-semibold">AI Todo</span>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCommandPaletteOpen(true)}
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>Search</span>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="AI Assistant">
                <Bot className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>AI Assistant</span>
            </TooltipContent>
          </Tooltip>

          <ThemeToggleCompact />
        </div>
      </header>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
      />
    </TooltipProvider>
  )
}
