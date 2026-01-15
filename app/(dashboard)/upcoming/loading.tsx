/**
 * Upcoming Page Loading State
 * Displays skeleton UI while upcoming tasks are being loaded
 */

import { ListSkeleton, TextSkeleton, Skeleton } from '@/components/shared/Skeleton'

export default function UpcomingLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2 animate-pulse">
        <TextSkeleton width="w-32" size="xl" />
        <TextSkeleton width="w-56" size="md" />
      </div>

      {/* Filter tabs placeholder */}
      <div className="flex gap-2 animate-pulse">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>

      {/* Task list with date groups */}
      <div className="space-y-6">
        {[1, 2, 3].map((group) => (
          <div key={group} className="space-y-3">
            {/* Group header */}
            <div className="flex items-center gap-2 animate-pulse">
              <Skeleton className="h-4 w-4 rounded" />
              <TextSkeleton width="w-24" size="sm" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            {/* Tasks in group */}
            <ListSkeleton count={group === 1 ? 4 : 2} variant="task" />
          </div>
        ))}
      </div>
    </div>
  )
}
