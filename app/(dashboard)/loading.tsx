/**
 * Dashboard Loading State
 * Displays skeleton UI while dashboard data is being loaded
 */

import { DashboardSkeleton } from '@/components/shared/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="p-6">
      <DashboardSkeleton />
    </div>
  )
}
