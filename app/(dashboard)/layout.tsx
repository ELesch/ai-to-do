/**
 * Dashboard Layout
 * Main layout for authenticated users with sidebar navigation
 */

import { type ReactNode, Suspense } from 'react'
import { SidebarWrapper } from '@/components/layouts/sidebar-wrapper'
import { Sidebar } from '@/components/layouts/sidebar'
import { DashboardErrorBoundary } from '@/components/layouts/dashboard-error-boundary'

interface DashboardLayoutProps {
  children: ReactNode
}

// Loading fallback for sidebar
function SidebarSkeleton() {
  return <Sidebar taskCounts={{ today: 0, upcoming: 0 }} />
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen">
      {/* Sidebar with Suspense for loading state */}
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarWrapper />
      </Suspense>

      {/* Main content wrapped with error boundary */}
      <main
        id="main-content"
        className="flex-1 overflow-auto"
        role="main"
        aria-label="Main content"
      >
        <div className="container mx-auto p-6">
          <DashboardErrorBoundary>
            {children}
          </DashboardErrorBoundary>
        </div>
      </main>

      {/* AI Panel (collapsible) */}
      {/* TODO: Import AIPanel component */}
    </div>
  )
}
