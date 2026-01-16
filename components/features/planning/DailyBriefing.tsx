/**
 * DailyBriefing Component
 * AI-generated daily summary and recommendations with collapsible sections
 */

'use client'

import { type FC, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  useDailyBriefing,
  type BriefingTask,
  type AIInsights,
  type RecentActivity,
} from '@/hooks/use-daily-briefing'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ============================================================================
// ICONS
// ============================================================================

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
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

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  )
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  )
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('animate-spin', className)}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  badge?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}

const CollapsibleSection: FC<CollapsibleSectionProps> = ({
  title,
  icon,
  badge,
  defaultOpen = true,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="hover:bg-muted flex w-full items-center justify-between py-3 text-left transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
          {badge}
        </div>
        <ChevronDownIcon
          className={cn(
            'text-muted-foreground h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      {isOpen && <div className="pb-4">{children}</div>}
    </div>
  )
}

interface TaskItemProps {
  task: BriefingTask
  onClick?: () => void
}

const TaskItem: FC<TaskItemProps> = ({ task, onClick }) => {
  const priorityColors = {
    high: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    medium:
      'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    low: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    none: 'bg-muted text-foreground border-border',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-muted flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{task.title}</p>
        {task.dueDate && (
          <p className="text-muted-foreground text-xs">
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </p>
        )}
      </div>
      <Badge
        variant="outline"
        className={cn('text-xs capitalize', priorityColors[task.priority])}
      >
        {task.priority}
      </Badge>
    </button>
  )
}

interface WorkloadBadgeProps {
  assessment: AIInsights['workloadAssessment']
}

const WorkloadBadge: FC<WorkloadBadgeProps> = ({ assessment }) => {
  const styles = {
    light:
      'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    moderate:
      'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    heavy:
      'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  }

  return (
    <Badge variant="outline" className={cn('capitalize', styles[assessment])}>
      {assessment} workload
    </Badge>
  )
}

interface ActivityStatsProps {
  activity: RecentActivity
}

const ActivityStats: FC<ActivityStatsProps> = ({ activity }) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center">
        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
          {activity.completedToday}
        </p>
        <p className="text-muted-foreground text-xs">Completed Today</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {activity.completedThisWeek}
        </p>
        <p className="text-muted-foreground text-xs">This Week</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
          {activity.createdToday}
        </p>
        <p className="text-muted-foreground text-xs">Created Today</p>
      </div>
    </div>
  )
}

// ============================================================================
// LOADING STATE
// ============================================================================

const BriefingLoadingState: FC = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LoaderIcon className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Daily Briefing</CardTitle>
          </div>
        </div>
        <CardDescription>Loading your personalized briefing...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-muted h-16 animate-pulse rounded-lg" />
          <div className="bg-muted h-24 animate-pulse rounded-lg" />
          <div className="bg-muted h-16 animate-pulse rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// ERROR STATE
// ============================================================================

interface BriefingErrorStateProps {
  error: Error
  onRetry: () => void
}

const BriefingErrorState: FC<BriefingErrorStateProps> = ({
  error,
  onRetry,
}) => {
  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangleIcon className="h-5 w-5 text-red-500" />
          <CardTitle className="text-lg text-red-700 dark:text-red-400">
            Failed to Load Briefing
          </CardTitle>
        </div>
        <CardDescription className="text-red-600 dark:text-red-400">
          {error.message}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={onRetry}>
          <RefreshIcon className="h-4 w-4" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface DailyBriefingProps {
  userId?: string
}

export const DailyBriefing: FC<DailyBriefingProps> = () => {
  const router = useRouter()
  const { briefing, isLoading, error, refresh, lastUpdated, isCached } =
    useDailyBriefing()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refresh()
    setIsRefreshing(false)
  }

  const handleTaskClick = (taskId: string) => {
    router.push(`/task/${taskId}`)
  }

  // Loading state
  if (isLoading && !briefing) {
    return <BriefingLoadingState />
  }

  // Error state
  if (error && !briefing) {
    return <BriefingErrorState error={error} onRetry={handleRefresh} />
  }

  // No briefing data
  if (!briefing) {
    return null
  }

  const {
    tasksDueToday,
    overdueTasks,
    suggestedTasks,
    recentActivity,
    aiInsights,
  } = briefing

  return (
    <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-lg">Daily Briefing</CardTitle>
            <WorkloadBadge assessment={aiInsights.workloadAssessment} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshIcon
              className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
        <CardDescription>
          {aiInsights.workloadExplanation}
          {isCached && lastUpdated && (
            <span className="text-muted-foreground ml-2 text-xs">
              (cached from {lastUpdated.toLocaleTimeString()})
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        {/* Motivational Note */}
        {aiInsights.motivationalNote && (
          <div className="dark:bg-background/60 mb-4 rounded-lg border border-blue-100 bg-white/60 p-3 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              {aiInsights.motivationalNote}
            </p>
          </div>
        )}

        <div className="space-y-0">
          {/* Overdue Tasks */}
          {overdueTasks.length > 0 && (
            <CollapsibleSection
              title="Overdue Tasks"
              icon={<AlertTriangleIcon className="h-4 w-4 text-red-500" />}
              badge={
                <Badge variant="destructive" className="ml-2 text-xs">
                  {overdueTasks.length}
                </Badge>
              }
              defaultOpen={true}
            >
              <div className="space-y-1">
                {overdueTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task.id)}
                  />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Tasks Due Today */}
          <CollapsibleSection
            title="Due Today"
            icon={<CalendarIcon className="h-4 w-4 text-blue-500" />}
            badge={
              tasksDueToday.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {tasksDueToday.length}
                </Badge>
              )
            }
            defaultOpen={true}
          >
            {tasksDueToday.length > 0 ? (
              <div className="space-y-1">
                {tasksDueToday.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-2 text-sm">
                No tasks due today. Great job staying ahead!
              </p>
            )}
          </CollapsibleSection>

          {/* Suggested Tasks */}
          {suggestedTasks.length > 0 && (
            <CollapsibleSection
              title="Suggested Focus"
              icon={<LightbulbIcon className="h-4 w-4 text-amber-500" />}
              defaultOpen={false}
            >
              <div className="space-y-1">
                {suggestedTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task.id)}
                  />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* AI Insights */}
          <CollapsibleSection
            title="AI Recommendations"
            icon={<SparklesIcon className="h-4 w-4 text-purple-500" />}
            defaultOpen={true}
          >
            <div className="space-y-4">
              {/* Priority Recommendations */}
              {aiInsights.priorityRecommendations.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium">
                    Priority Recommendations
                  </p>
                  <ul className="space-y-1">
                    {aiInsights.priorityRecommendations.map((rec, index) => (
                      <li
                        key={index}
                        className="text-foreground flex items-start gap-2 text-sm"
                      >
                        <span className="mt-1 text-blue-500 dark:text-blue-400">
                          -
                        </span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Time Blocking Suggestions */}
              {aiInsights.timeBlockingSuggestions.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium">
                    Time Blocking Tips
                  </p>
                  <ul className="space-y-1">
                    {aiInsights.timeBlockingSuggestions.map((sug, index) => (
                      <li
                        key={index}
                        className="text-foreground flex items-start gap-2 text-sm"
                      >
                        <span className="mt-1 text-purple-500 dark:text-purple-400">
                          -
                        </span>
                        {sug}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Recent Activity */}
          <CollapsibleSection
            title="Recent Activity"
            icon={<ActivityIcon className="h-4 w-4 text-green-500" />}
            defaultOpen={false}
          >
            <ActivityStats activity={recentActivity} />
          </CollapsibleSection>
        </div>
      </CardContent>
    </Card>
  )
}
