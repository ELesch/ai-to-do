/**
 * Settings Page Loading State
 * Displays skeleton UI while settings data is being loaded
 */

import { SettingsPageSkeleton } from '@/components/shared/Skeleton'

export default function SettingsLoading() {
  return (
    <div className="p-6">
      <SettingsPageSkeleton />
    </div>
  )
}
