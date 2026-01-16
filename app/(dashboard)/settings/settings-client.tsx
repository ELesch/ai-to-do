'use client'

/**
 * Settings Client Component
 * Client-side settings page with all sections
 */

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'
import {
  SettingsProvider,
  SwitchField,
  SelectField,
  InputField,
  useSettings,
  updateProfile,
  deleteAccount,
} from '@/components/features/settings/settings-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { UserPreferences } from '@/lib/db/schema'
import {
  User,
  Palette,
  Calendar,
  Bell,
  Bot,
  Shield,
  Loader2,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface SettingsClientProps {
  user: {
    id: string
    email: string
    name: string | null
    image: string | null
    createdAt: Date
  }
  initialPreferences: UserPreferences
  stats: {
    totalTasks: number
    completedTasks: number
    pendingTasks: number
    totalProjects: number
    aiInteractions: number
  }
}

// ============================================================================
// Constants
// ============================================================================

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

const DEFAULT_VIEW_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'inbox', label: 'Inbox' },
]

const DATE_FORMAT_OPTIONS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
]

const TIME_FORMAT_OPTIONS = [
  { value: '12h', label: '12 hour' },
  { value: '24h', label: '24 hour' },
]

const WEEK_START_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '6', label: 'Saturday' },
]

const AI_FREQUENCY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const AI_STYLE_OPTIONS = [
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
]

// Common timezones
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'UTC', label: 'UTC' },
]

// ============================================================================
// Main Component
// ============================================================================

export function SettingsClient({
  user,
  initialPreferences,
  stats,
}: SettingsClientProps) {
  return (
    <SettingsProvider initialPreferences={initialPreferences}>
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>

        <div className="space-y-6">
          <ProfileSection user={user} />
          <AppearanceSection />
          <DateTimeSection />
          <NotificationsSection />
          <AISettingsSection />
          <AccountSection user={user} stats={stats} />
        </div>
      </div>
    </SettingsProvider>
  )
}

// ============================================================================
// Profile Section
// ============================================================================

interface ProfileSectionProps {
  user: {
    id: string
    email: string
    name: string | null
    image: string | null
  }
}

function ProfileSection({ user }: ProfileSectionProps) {
  const [name, setName] = useState(user.name || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveName = async () => {
    if (name === user.name) return

    setIsSaving(true)
    try {
      await updateProfile({ name })
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5" />
          <CardTitle>Profile</CardTitle>
        </div>
        <CardDescription>Your personal information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
              <Button
                onClick={handleSaveName}
                disabled={isSaving || name === user.name}
                size="sm"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled />
            <p className="text-muted-foreground text-xs">
              Email cannot be changed
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Appearance Section
// ============================================================================

function AppearanceSection() {
  const { preferences, updatePreference } = useSettings()
  const { setTheme } = useTheme()

  const handleThemeChange = (value: string) => {
    updatePreference('theme', value as UserPreferences['theme'])
    setTheme(value)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          <CardTitle>Appearance</CardTitle>
        </div>
        <CardDescription>Customize the look and feel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SelectField
          label="Theme"
          description="Choose your preferred color scheme"
          value={preferences.theme || 'system'}
          onValueChange={handleThemeChange}
          options={THEME_OPTIONS}
        />
        <SelectField
          label="Default View"
          description="The view shown when you open the app"
          value={preferences.defaultView || 'today'}
          onValueChange={(value) =>
            updatePreference(
              'defaultView',
              value as UserPreferences['defaultView']
            )
          }
          options={DEFAULT_VIEW_OPTIONS}
        />
        <SwitchField
          label="Collapse Sidebar"
          description="Start with a collapsed sidebar"
          checked={preferences.sidebarCollapsed || false}
          onCheckedChange={(checked) =>
            updatePreference('sidebarCollapsed', checked)
          }
        />
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Date & Time Section
// ============================================================================

function DateTimeSection() {
  const { preferences, updatePreference } = useSettings()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <CardTitle>Date & Time</CardTitle>
        </div>
        <CardDescription>Configure date and time display</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SelectField
          label="Timezone"
          description="Your local timezone for due dates"
          value={preferences.timezone || 'UTC'}
          onValueChange={(value) => updatePreference('timezone', value)}
          options={TIMEZONE_OPTIONS}
        />
        <SelectField
          label="Date Format"
          description="How dates are displayed"
          value={preferences.dateFormat || 'MM/DD/YYYY'}
          onValueChange={(value) =>
            updatePreference(
              'dateFormat',
              value as UserPreferences['dateFormat']
            )
          }
          options={DATE_FORMAT_OPTIONS}
        />
        <SelectField
          label="Time Format"
          description="12-hour or 24-hour clock"
          value={preferences.timeFormat || '12h'}
          onValueChange={(value) =>
            updatePreference(
              'timeFormat',
              value as UserPreferences['timeFormat']
            )
          }
          options={TIME_FORMAT_OPTIONS}
        />
        <SelectField
          label="Week Starts On"
          description="First day of the week"
          value={String(preferences.weekStartsOn ?? 0)}
          onValueChange={(value) =>
            updatePreference('weekStartsOn', Number(value) as 0 | 1 | 6)
          }
          options={WEEK_START_OPTIONS}
        />
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Notifications Section
// ============================================================================

function NotificationsSection() {
  const { preferences, updatePreference } = useSettings()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <CardTitle>Notifications</CardTitle>
        </div>
        <CardDescription>Control how you receive notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SwitchField
          label="Email Notifications"
          description="Receive task reminders via email"
          checked={preferences.emailNotifications ?? true}
          onCheckedChange={(checked) =>
            updatePreference('emailNotifications', checked)
          }
        />
        <SwitchField
          label="Push Notifications"
          description="Receive browser push notifications"
          checked={preferences.pushNotifications ?? true}
          onCheckedChange={(checked) =>
            updatePreference('pushNotifications', checked)
          }
        />
        <InputField
          label="Daily Digest Time"
          description="When to receive your daily summary"
          type="time"
          value={preferences.dailyDigestTime || '09:00'}
          onChange={(value) => updatePreference('dailyDigestTime', value)}
        />
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Quiet Hours</h4>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="quiet-start"
                className="text-muted-foreground text-sm"
              >
                From
              </Label>
              <Input
                id="quiet-start"
                type="time"
                value={preferences.quietHoursStart || '22:00'}
                onChange={(e) =>
                  updatePreference('quietHoursStart', e.target.value)
                }
                className="w-[120px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label
                htmlFor="quiet-end"
                className="text-muted-foreground text-sm"
              >
                To
              </Label>
              <Input
                id="quiet-end"
                type="time"
                value={preferences.quietHoursEnd || '07:00'}
                onChange={(e) =>
                  updatePreference('quietHoursEnd', e.target.value)
                }
                className="w-[120px]"
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            No notifications will be sent during quiet hours
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// AI Settings Section
// ============================================================================

function AISettingsSection() {
  const { preferences, updatePreference } = useSettings()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <CardTitle>AI Assistant</CardTitle>
        </div>
        <CardDescription>Configure AI features and suggestions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SwitchField
          label="Enable AI Features"
          description="Use AI to help with task management"
          checked={preferences.aiEnabled ?? true}
          onCheckedChange={(checked) => updatePreference('aiEnabled', checked)}
        />
        <SwitchField
          label="AI Suggestions"
          description="Receive proactive suggestions from AI"
          checked={preferences.aiSuggestionsEnabled ?? true}
          onCheckedChange={(checked) =>
            updatePreference('aiSuggestionsEnabled', checked)
          }
          disabled={!preferences.aiEnabled}
        />
        <SelectField
          label="Suggestion Frequency"
          description="How often to show AI suggestions"
          value={preferences.aiSuggestionFrequency || 'medium'}
          onValueChange={(value) =>
            updatePreference(
              'aiSuggestionFrequency',
              value as UserPreferences['aiSuggestionFrequency']
            )
          }
          options={AI_FREQUENCY_OPTIONS}
          disabled={!preferences.aiEnabled || !preferences.aiSuggestionsEnabled}
        />
        <SelectField
          label="Communication Style"
          description="How the AI communicates with you"
          value={preferences.aiCommunicationStyle || 'concise'}
          onValueChange={(value) =>
            updatePreference(
              'aiCommunicationStyle',
              value as UserPreferences['aiCommunicationStyle']
            )
          }
          options={AI_STYLE_OPTIONS}
          disabled={!preferences.aiEnabled}
        />
        <SwitchField
          label="Learn from My Tasks"
          description="Allow AI to learn from your task patterns"
          checked={preferences.aiDataLearning ?? true}
          onCheckedChange={(checked) =>
            updatePreference('aiDataLearning', checked)
          }
          disabled={!preferences.aiEnabled}
        />
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Account Section
// ============================================================================

interface AccountSectionProps {
  user: {
    id: string
    email: string
    createdAt: Date
  }
  stats: {
    totalTasks: number
    completedTasks: number
    pendingTasks: number
    totalProjects: number
    aiInteractions: number
  }
}

function AccountSection({ user, stats }: AccountSectionProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')

  const handleDeleteAccount = async () => {
    if (confirmEmail !== user.email) {
      toast.error('Email does not match')
      return
    }

    setIsDeleting(true)
    try {
      await deleteAccount()
      toast.success('Account deleted')
      await signOut({ callbackUrl: '/' })
    } catch {
      toast.error('Failed to delete account')
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Account</CardTitle>
        </div>
        <CardDescription>Manage your account settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account Stats */}
        <div className="rounded-lg border p-4">
          <h4 className="mb-4 text-sm font-medium">Account Overview</h4>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-2xl font-bold">{stats.totalTasks}</p>
              <p className="text-muted-foreground text-xs">Total Tasks</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completedTasks}</p>
              <p className="text-muted-foreground text-xs">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalProjects}</p>
              <p className="text-muted-foreground text-xs">Projects</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.aiInteractions}</p>
              <p className="text-muted-foreground text-xs">AI Chats</p>
            </div>
          </div>
          <p className="text-muted-foreground mt-4 text-xs">
            Member since {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Change Password */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Password</p>
            <p className="text-muted-foreground text-sm">
              Change your account password
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/forgot-password')}
          >
            Change Password
          </Button>
        </div>

        {/* Sign Out */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Sign Out</p>
            <p className="text-muted-foreground text-sm">
              Sign out of your account on this device
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            Sign Out
          </Button>
        </div>

        {/* Delete Account */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-destructive font-medium">Delete Account</p>
              <p className="text-muted-foreground text-sm">
                Permanently delete your account and all data
              </p>
            </div>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove all your data including:
                  </DialogDescription>
                </DialogHeader>
                <ul className="text-muted-foreground list-disc space-y-1 pl-6 text-sm">
                  <li>{stats.totalTasks} tasks</li>
                  <li>{stats.totalProjects} projects</li>
                  <li>{stats.aiInteractions} AI conversations</li>
                  <li>All settings and preferences</li>
                </ul>
                <div className="space-y-2 py-4">
                  <Label htmlFor="confirm-email">
                    Type{' '}
                    <span className="font-mono font-bold">{user.email}</span> to
                    confirm:
                  </Label>
                  <Input
                    id="confirm-email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false)
                      setConfirmEmail('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || confirmEmail !== user.email}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete Account'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
