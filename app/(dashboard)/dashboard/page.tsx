/**
 * Dashboard Page
 * Serves the /dashboard route with productivity insights
 */

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = 'force-dynamic'

// Re-export the dashboard page from the route group root
export { default } from '../page'
