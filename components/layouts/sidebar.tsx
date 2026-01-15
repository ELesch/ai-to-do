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
  { href: '/', label: 'Dashboard', icon: 'home' },
  { href: '/today', label: 'Today', icon: 'sun', countKey: 'today' },
  { href: '/upcoming', label: 'Upcoming', icon: 'calendar', countKey: 'upcoming' },
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
      className="w-64 border-r bg-gray-50 h-full flex flex-col"
      role="complementary"
      aria-label="Sidebar navigation"
    >
      <div className="p-4 flex-1">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold">AI</span>
          </div>
          <span className="font-semibold text-lg">AI Todo</span>
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
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            const count = item.countKey ? taskCounts[item.countKey] : undefined

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-sm">{item.label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
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
          <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Projects
          </h3>
          <div className="mt-2 px-3 text-sm text-gray-500">
            No projects yet
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-6 h-6 rounded-full bg-gray-300" />
          <span className="flex-1 truncate">User</span>
        </div>
      </div>
    </aside>
  )
}
