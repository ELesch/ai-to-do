import Link from "next/link"
import { CheckSquare } from "lucide-react"

/**
 * Auth Layout
 * Provides a centered card layout for all authentication pages
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-muted/40 flex min-h-screen flex-col items-center justify-center p-4">
      {/* Logo and App Name */}
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-2xl font-bold"
      >
        <CheckSquare className="text-primary h-8 w-8" />
        <span>AI Todo</span>
      </Link>

      {/* Auth Card Container */}
      <div className="w-full max-w-md">{children}</div>

      {/* Footer */}
      <p className="text-muted-foreground mt-8 text-center text-sm">
        &copy; {new Date().getFullYear()} AI Todo. All rights reserved.
      </p>
    </div>
  )
}
