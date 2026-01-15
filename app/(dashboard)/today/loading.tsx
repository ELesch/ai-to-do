/**
 * Today Page Loading State
 * Displays skeleton UI while today's tasks are being loaded
 */

import { ListSkeleton, TextSkeleton, Skeleton } from '@/components/shared/Skeleton'

export default function TodayLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2 animate-pulse">
        <TextSkeleton width="w-24" size="xl" />
        <TextSkeleton width="w-48" size="md" />
      </div>

      {/* Quick add placeholder */}
      <Skeleton className="h-12 w-full rounded-lg" />

      {/* Task list */}
      <ListSkeleton count={8} variant="task" />
    </div>
  )
}
