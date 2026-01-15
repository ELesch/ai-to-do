/**
 * Projects Page Loading State
 * Displays skeleton UI while projects are being loaded
 */

import { GridSkeleton, TextSkeleton, Skeleton } from '@/components/shared/Skeleton'

export default function ProjectsLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2 animate-pulse">
          <TextSkeleton width="w-28" size="xl" />
          <TextSkeleton width="w-48" size="md" />
        </div>
        {/* Create button placeholder */}
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Filter/search bar placeholder */}
      <div className="flex gap-4 animate-pulse">
        <Skeleton className="h-10 flex-1 max-w-sm rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>

      {/* Project grid */}
      <GridSkeleton count={6} variant="project" />
    </div>
  )
}
