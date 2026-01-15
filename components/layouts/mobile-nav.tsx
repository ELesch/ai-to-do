/**
 * Mobile Navigation Component
 * Hamburger menu with slide-out drawer for mobile devices
 */

'use client'

import { type FC, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu,
  Plus,
  Home,
  Sun,
  Calendar,
  FolderOpen,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { QuickAddForm } from '@/components/features/tasks'
import { ThemeToggleCompact } from '@/components/ui/theme-toggle'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  countKey?: 'today' | 'upcoming'
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
  {
    href: '/today',
    label: 'Today',
    icon: <Sun className="h-5 w-5" />,
    countKey: 'today',
  },
  {
    href: '/upcoming',
    label: 'Upcoming',
    icon: <Calendar className="h-5 w-5" />,
    countKey: 'upcoming',
  },
  {
    href: '/projects',
    label: 'Projects',
    icon: <FolderOpen className="h-5 w-5" />,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
  },
]

interface TaskCounts {
  today: number
  upcoming: number
}

interface MobileNavProps {
  taskCounts?: TaskCounts
}

export const MobileNav: FC<MobileNavProps> = ({
  taskCounts = { today: 0, upcoming: 0 },
}) => {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)

  const handleAddTask = async (title: string) => {
    console.log('Adding task:', title)
    setIsAddTaskOpen(false)
    setIsOpen(false)
    router.refresh()
  }

  const handleNavClick = () => {
    setIsOpen(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <span className="text-sm font-bold text-white">AI</span>
              </div>
              <SheetTitle className="text-lg">AI Todo</SheetTitle>
            </div>
            <ThemeToggleCompact />
          </div>
        </SheetHeader>

        <div className="flex h-[calc(100%-65px)] flex-col">
          {/* Add Task Button */}
          <div className="p-4">
            <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Task</DialogTitle>
                </DialogHeader>
                <QuickAddForm
                  onAdd={handleAddTask}
                  placeholder="What needs to be done?"
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2" aria-label="Mobile navigation">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href))
                const count = item.countKey
                  ? taskCounts[item.countKey]
                  : undefined

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={handleNavClick}
                      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-3 transition-colors ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                      </div>
                      {count !== undefined && count > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            isActive
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                              : 'bg-sidebar-accent text-sidebar-foreground'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-sidebar-border mt-auto border-t p-4">
            <div className="text-sidebar-foreground flex items-center gap-2 text-sm">
              <div className="bg-sidebar-accent h-8 w-8 rounded-full" />
              <span className="flex-1 truncate">User</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
