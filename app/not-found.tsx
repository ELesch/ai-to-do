/**
 * Not Found Page (404)
 * Custom 404 error page with helpful navigation
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Search icon SVG component
 */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

/**
 * Home icon SVG component
 */
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

/**
 * Calendar icon SVG component
 */
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}

/**
 * Folder icon SVG component
 */
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  )
}

/**
 * Navigation link item
 */
interface NavLinkProps {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}

function NavLink({ href, icon, title, description }: NavLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:border-primary hover:bg-muted"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}

/**
 * Custom 404 Not Found page
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg text-center">
        {/* 404 illustration */}
        <div className="mb-8">
          <span className="text-8xl font-bold text-muted-foreground/30">404</span>
        </div>

        {/* Error message */}
        <h1 className="mb-3 text-2xl font-bold text-foreground">
          Page not found
        </h1>

        <p className="mb-8 text-muted-foreground">
          Sorry, we could not find the page you are looking for.
          It might have been moved, deleted, or never existed.
        </p>

        {/* Primary action */}
        <Link href="/">
          <Button size="lg" className="mb-12">
            <HomeIcon className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        {/* Quick navigation */}
        <div className="border-t border-gray-200 pt-8">
          <h2 className="mb-6 text-sm font-medium uppercase tracking-wide text-gray-500">
            Popular Destinations
          </h2>

          <div className="grid gap-4">
            <NavLink
              href="/today"
              icon={<CalendarIcon className="h-5 w-5" />}
              title="Today's Tasks"
              description="View and manage your tasks for today"
            />

            <NavLink
              href="/upcoming"
              icon={<SearchIcon className="h-5 w-5" />}
              title="Upcoming Tasks"
              description="See what's coming up next"
            />

            <NavLink
              href="/projects"
              icon={<FolderIcon className="h-5 w-5" />}
              title="Projects"
              description="Browse and organize your projects"
            />
          </div>
        </div>

        {/* Additional help text */}
        <p className="mt-8 text-sm text-gray-500">
          If you believe this is an error, please{' '}
          <Link href="/settings" className="text-primary hover:underline">
            contact support
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
