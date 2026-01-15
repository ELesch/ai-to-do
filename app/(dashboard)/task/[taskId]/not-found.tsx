/**
 * Task Not Found Page
 * Displayed when a task cannot be found
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function TaskNotFound() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Task Not Found</h1>
        <p className="mt-4 text-gray-600">
          The task you are looking for does not exist or has been deleted.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/today">
            <Button>Go to Today</Button>
          </Link>
          <Link href="/upcoming">
            <Button variant="outline">View Upcoming</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
