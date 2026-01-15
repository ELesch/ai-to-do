/**
 * Settings Page
 * User preferences, account settings, and AI configuration
 */

import { getCurrentUser } from '@/lib/auth/helpers'
import { redirect } from 'next/navigation'
import { userService, defaultUserPreferences } from '@/services/user.service'
import { SettingsClient } from './settings-client'

export const metadata = {
  title: 'Settings - AI Todo',
  description: 'Manage your account and preferences',
}

export default async function SettingsPage() {
  const sessionUser = await getCurrentUser()

  if (!sessionUser) {
    redirect('/login')
  }

  const user = await userService.getUserWithPreferences(sessionUser.id)
  const stats = await userService.getUserStats(sessionUser.id)

  if (!user) {
    redirect('/login')
  }

  const preferences = {
    ...defaultUserPreferences,
    ...(user.preferences || {}),
  }

  return (
    <SettingsClient
      user={{
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        createdAt: user.createdAt,
      }}
      initialPreferences={preferences}
      stats={stats}
    />
  )
}
