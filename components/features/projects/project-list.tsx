/**
 * ProjectList Component
 * Displays a list of projects with grouping, loading states, and empty states
 */

'use client'

import { type FC, useMemo } from 'react'
import { FolderPlus, Star, Archive, Folder } from 'lucide-react'
import { ProjectCard, ProjectCardSkeleton, type ProjectCardProject } from './project-card'
import { GridSkeleton } from '@/components/shared/Skeleton'
import { cn } from '@/lib/utils'
import { getListItemStyle } from '@/lib/animations'

type GroupBy = 'none' | 'favorite' | 'archived'

interface ProjectListProps {
  projects: ProjectCardProject[]
  isLoading?: boolean
  groupBy?: GroupBy
  /** Enable fade-in animation for list items */
  enableAnimation?: boolean
  onArchive?: (projectId: string, archive: boolean) => void
  onFavorite?: (projectId: string, favorite: boolean) => void
  onEdit?: (projectId: string) => void
  onDelete?: (projectId: string) => void
  emptyMessage?: string
  emptyIcon?: 'folder' | 'star' | 'archive'
  showActions?: boolean
  className?: string
}

/**
 * Loading skeleton for project list using shared component
 */
function ProjectListSkeleton({ count = 6 }: { count?: number }) {
  return <GridSkeleton count={count} variant="project" />
}

/**
 * Empty state component
 */
function ProjectListEmpty({
  message,
  icon = 'folder',
}: {
  message: string
  icon?: 'folder' | 'star' | 'archive'
}) {
  const IconComponent = {
    folder: Folder,
    star: Star,
    archive: Archive,
  }[icon]

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <IconComponent className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground max-w-sm">{message}</p>
    </div>
  )
}

/**
 * Section header component
 */
function SectionHeader({
  title,
  count,
  icon,
}: {
  title: string
  count: number
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 py-2 px-1 mb-3">
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="font-semibold text-sm">{title}</h2>
      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
        {count}
      </span>
    </div>
  )
}

/**
 * Group projects by favorite/archived status
 */
function groupProjects(
  projects: ProjectCardProject[],
  groupBy: GroupBy
): { key: string; title: string; icon: React.ReactNode; projects: ProjectCardProject[] }[] {
  if (groupBy === 'none') {
    return [
      {
        key: 'all',
        title: 'All Projects',
        icon: <Folder className="h-4 w-4" />,
        projects,
      },
    ]
  }

  if (groupBy === 'favorite') {
    const favorites = projects.filter((p) => p.isFavorite && !p.isArchived)
    const regular = projects.filter((p) => !p.isFavorite && !p.isArchived)
    const archived = projects.filter((p) => p.isArchived)

    const groups: { key: string; title: string; icon: React.ReactNode; projects: ProjectCardProject[] }[] = []

    if (favorites.length > 0) {
      groups.push({
        key: 'favorites',
        title: 'Favorites',
        icon: <Star className="h-4 w-4" />,
        projects: favorites,
      })
    }

    if (regular.length > 0) {
      groups.push({
        key: 'projects',
        title: 'Projects',
        icon: <Folder className="h-4 w-4" />,
        projects: regular,
      })
    }

    if (archived.length > 0) {
      groups.push({
        key: 'archived',
        title: 'Archived',
        icon: <Archive className="h-4 w-4" />,
        projects: archived,
      })
    }

    return groups
  }

  if (groupBy === 'archived') {
    const active = projects.filter((p) => !p.isArchived)
    const archived = projects.filter((p) => p.isArchived)

    const groups: { key: string; title: string; icon: React.ReactNode; projects: ProjectCardProject[] }[] = []

    if (active.length > 0) {
      groups.push({
        key: 'active',
        title: 'Active Projects',
        icon: <Folder className="h-4 w-4" />,
        projects: active,
      })
    }

    if (archived.length > 0) {
      groups.push({
        key: 'archived',
        title: 'Archived',
        icon: <Archive className="h-4 w-4" />,
        projects: archived,
      })
    }

    return groups
  }

  return []
}

export const ProjectList: FC<ProjectListProps> = ({
  projects,
  isLoading = false,
  groupBy = 'none',
  enableAnimation = true,
  onArchive,
  onFavorite,
  onEdit,
  onDelete,
  emptyMessage = 'No projects yet. Create your first project to get started.',
  emptyIcon = 'folder',
  showActions = true,
  className,
}) => {
  // Group projects
  const groupedProjects = useMemo(
    () => groupProjects(projects, groupBy),
    [projects, groupBy]
  )

  // Loading state
  if (isLoading) {
    return <ProjectListSkeleton />
  }

  // Empty state
  if (projects.length === 0) {
    return <ProjectListEmpty message={emptyMessage} icon={emptyIcon} />
  }

  // Helper to render a project card with optional animation
  const renderProjectCard = (project: ProjectCardProject, index: number) => (
    <div
      key={project.id}
      className={enableAnimation ? 'animate-fade-in-up animate-fill-backwards' : undefined}
      style={enableAnimation ? getListItemStyle(index) : undefined}
    >
      <ProjectCard
        project={project}
        onArchive={onArchive}
        onFavorite={onFavorite}
        onEdit={onEdit}
        onDelete={onDelete}
        showActions={showActions}
      />
    </div>
  )

  // Flat list (no grouping or single group)
  if (groupBy === 'none' || groupedProjects.length === 1) {
    return (
      <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {projects.map((project, index) => renderProjectCard(project, index))}
      </div>
    )
  }

  // Grouped view
  let globalIndex = 0
  return (
    <div className={cn('space-y-8', className)}>
      {groupedProjects.map((group) => (
        <section key={group.key}>
          <SectionHeader
            title={group.title}
            count={group.projects.length}
            icon={group.icon}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.projects.map((project) => {
              const element = renderProjectCard(project, globalIndex)
              globalIndex++
              return element
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

// Export components for external use
export { ProjectListSkeleton, ProjectListEmpty }
