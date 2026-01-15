/**
 * ProjectCard Component
 * Displays a project with task count, progress, and action buttons
 */

'use client'

import { type FC } from 'react'
import { useRouter } from 'next/navigation'
import {
  Archive,
  ArchiveRestore,
  Star,
  MoreHorizontal,
  Folder,
  Hash,
  Briefcase,
  Code,
  Home,
  BookOpen,
  Heart,
  Zap,
  Target,
  Rocket,
  Music,
  Camera,
  Globe,
  Coffee,
  Flame,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Icon mapping for project icons
 */
const iconMap: Record<string, LucideIcon> = {
  folder: Folder,
  hash: Hash,
  briefcase: Briefcase,
  code: Code,
  home: Home,
  'book-open': BookOpen,
  heart: Heart,
  zap: Zap,
  target: Target,
  rocket: Rocket,
  music: Music,
  camera: Camera,
  globe: Globe,
  coffee: Coffee,
  flame: Flame,
  star: Star,
}

/**
 * Get icon component by name
 */
function getIcon(iconName?: string | null): LucideIcon {
  if (!iconName) return Folder
  return iconMap[iconName] || Folder
}

export interface ProjectCardProject {
  id: string
  name: string
  description?: string | null
  color: string
  icon?: string | null
  taskCount: number
  completedTaskCount: number
  isFavorite?: boolean
  isArchived?: boolean
}

interface ProjectCardProps {
  project: ProjectCardProject
  onClick?: (projectId: string) => void
  onArchive?: (projectId: string, archive: boolean) => void
  onFavorite?: (projectId: string, favorite: boolean) => void
  onEdit?: (projectId: string) => void
  onDelete?: (projectId: string) => void
  className?: string
  showActions?: boolean
}

/**
 * Progress bar component
 */
function ProgressBar({
  progress,
  color,
}: {
  progress: number
  color: string
}) {
  return (
    <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full transition-all duration-300 ease-out rounded-full"
        style={{
          width: `${progress}%`,
          backgroundColor: color,
        }}
      />
    </div>
  )
}

/**
 * Loading skeleton for ProjectCard
 */
export function ProjectCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-1.5 w-full rounded-full bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}

export const ProjectCard: FC<ProjectCardProps> = ({
  project,
  onClick,
  onArchive,
  onFavorite,
  onEdit,
  onDelete,
  className,
  showActions = true,
}) => {
  const router = useRouter()
  const progress =
    project.taskCount > 0
      ? Math.round((project.completedTaskCount / project.taskCount) * 100)
      : 0

  const IconComponent = getIcon(project.icon)

  const handleClick = () => {
    if (onClick) {
      onClick(project.id)
    } else {
      router.push(`/projects/${project.id}`)
    }
  }

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation()
    onArchive?.(project.id, !project.isArchived)
  }

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFavorite?.(project.id, !project.isFavorite)
  }

  return (
    <TooltipProvider>
      <Card
        className={cn(
          'group cursor-pointer transition-all duration-200',
          'hover:shadow-md hover:border-primary/20',
          project.isArchived && 'opacity-60',
          className
        )}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Icon */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${project.color}20` }}
              >
                <IconComponent
                  className="h-5 w-5"
                  style={{ color: project.color }}
                />
              </div>
              {/* Name and Description */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{project.name}</h3>
                  {project.isFavorite && (
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                  )}
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                    {project.description}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            {showActions && (
              <div
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleFavorite}
                      className={cn(
                        project.isFavorite && 'text-yellow-500'
                      )}
                      aria-label={project.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star
                        className={cn(
                          'h-4 w-4',
                          project.isFavorite && 'fill-yellow-500'
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {project.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleArchive}
                      aria-label={project.isArchived ? 'Unarchive project' : 'Archive project'}
                    >
                      {project.isArchived ? (
                        <ArchiveRestore className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {project.isArchived ? 'Unarchive' : 'Archive'}
                  </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="More project options">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(project.id)}>
                      Edit project
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleFavorite}>
                      {project.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleArchive}>
                      {project.isArchived ? 'Unarchive' : 'Archive'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onDelete?.(project.id)}
                    >
                      Delete project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {project.completedTaskCount}/{project.taskCount} tasks
            </span>
            <span
              className="font-medium"
              style={{ color: progress === 100 ? '#22c55e' : project.color }}
            >
              {progress}%
            </span>
          </div>

          {/* Progress Bar */}
          <ProgressBar progress={progress} color={project.color} />
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
