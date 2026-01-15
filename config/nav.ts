/**
 * Navigation Configuration
 * Defines navigation items and their properties
 */

import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  title: string
  href: string
  icon?: string
  disabled?: boolean
  external?: boolean
  badge?: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

/**
 * Main sidebar navigation items
 */
export const mainNavItems: NavItem[] = [
  {
    title: 'Today',
    href: '/today',
    icon: 'sun',
  },
  {
    title: 'Upcoming',
    href: '/upcoming',
    icon: 'calendar',
  },
  {
    title: 'Inbox',
    href: '/inbox',
    icon: 'inbox',
    badge: 'New',
  },
]

/**
 * Secondary navigation items (bottom of sidebar)
 */
export const secondaryNavItems: NavItem[] = [
  {
    title: 'Settings',
    href: '/settings',
    icon: 'settings',
  },
  {
    title: 'Help',
    href: '/help',
    icon: 'help-circle',
  },
]

/**
 * Settings page navigation
 */
export const settingsNavItems: NavItem[] = [
  {
    title: 'Profile',
    href: '/settings/profile',
    icon: 'user',
  },
  {
    title: 'Account',
    href: '/settings/account',
    icon: 'shield',
  },
  {
    title: 'Appearance',
    href: '/settings/appearance',
    icon: 'palette',
  },
  {
    title: 'Notifications',
    href: '/settings/notifications',
    icon: 'bell',
  },
  {
    title: 'AI Assistant',
    href: '/settings/ai',
    icon: 'bot',
  },
  {
    title: 'Integrations',
    href: '/settings/integrations',
    icon: 'plug',
    disabled: true,
  },
]

/**
 * Mobile navigation items
 */
export const mobileNavItems: NavItem[] = [
  {
    title: 'Today',
    href: '/today',
    icon: 'sun',
  },
  {
    title: 'Upcoming',
    href: '/upcoming',
    icon: 'calendar',
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: 'folder',
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: 'settings',
  },
]

/**
 * Command palette commands
 */
export const commandPaletteCommands = [
  {
    id: 'new-task',
    label: 'New Task',
    shortcut: 'N',
    group: 'Tasks',
  },
  {
    id: 'new-project',
    label: 'New Project',
    shortcut: 'P',
    group: 'Projects',
  },
  {
    id: 'go-today',
    label: 'Go to Today',
    shortcut: 'G T',
    group: 'Navigation',
  },
  {
    id: 'go-upcoming',
    label: 'Go to Upcoming',
    shortcut: 'G U',
    group: 'Navigation',
  },
  {
    id: 'go-projects',
    label: 'Go to Projects',
    shortcut: 'G P',
    group: 'Navigation',
  },
  {
    id: 'go-settings',
    label: 'Go to Settings',
    shortcut: 'G S',
    group: 'Navigation',
  },
  {
    id: 'toggle-ai',
    label: 'Toggle AI Panel',
    shortcut: 'Cmd+J',
    group: 'AI',
  },
  {
    id: 'toggle-sidebar',
    label: 'Toggle Sidebar',
    shortcut: 'Cmd+B',
    group: 'View',
  },
]
