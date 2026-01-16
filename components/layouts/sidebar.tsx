/**
 * Sidebar Component
 * Main navigation sidebar for the dashboard
 */

'use client'

import { type FC, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { QuickAddForm } from '@/components/features/tasks'

interface NavItem {
  href: string
  label: string
  icon: string
  countKey?: 'today' | 'upcoming'
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'home' },
  { href: '/today', label: 'Today', icon: 'sun', countKey: 'today' },
  {
    href: '/upcoming',
    label: 'Upcoming',
    icon: 'calendar',
    countKey: 'upcoming',
  },
  { href: '/projects', label: 'Projects', icon: 'folder' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
]

interface TaskCounts {
  today: number
  upcoming: number
}

interface SidebarProps {
  isOpen?: boolean
  onToggle?: () => void
  taskCounts?: TaskCounts
}

export const Sidebar: FC<SidebarProps> = ({
  isOpen = true,
  taskCounts = { today: 0, upcoming: 0 },
}) => {
  const pathname = usePathname()
  const router = useRouter()
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)

  const handleAddTask = async (title: string) => {
    console.log('Adding task:', title)
    // TODO: Connect to server action
    setIsAddTaskOpen(false)
    router.refresh()
  }

  if (!isOpen) return null

  return (
    <aside
      className="flex h-full w-64 flex-col border-r bg-gray-50"
      role="complementary"
      aria-label="Sidebar navigation"
    >
      <div className="flex-1 p-4">
        {/* Logo */}
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <span className="font-bold text-white">AI</span>
          </div>
          <span className="text-lg font-semibold">AI Todo</span>
        </div>

        {/* Add Task Button */}
        <div className="mb-6">
          <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <span className="mr-2">+</span>
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
        <nav className="space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            const count = item.countKey ? taskCounts[item.countKey] : undefined

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-sm">{item.label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? 'bg-blue-200 text-blue-800'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Projects section */}
        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
            Projects
          </h3>
          <div className="mt-2 px-3 text-sm text-gray-500">No projects yet</div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="h-6 w-6 rounded-full bg-gray-300" />
          <span className="flex-1 truncate">User</span>
        </div>
      </div>
    </aside>
  )
}
