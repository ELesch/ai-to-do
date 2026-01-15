/**
 * Project Detail Client Component
 * Client-side component for project detail page
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Settings,
  MoreHorizontal,
  Star,
  Archive,
  ArchiveRestore,
  Trash2,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  Folder,
  Hash,
  Briefcase,
  Code,
  Home,
  BookOpen,
  Heart,
  Zap,
  Rocket,
  Music,
  Camera,
  Globe,
  Coffee,
  Flame,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TaskList } from '@/components/features/tasks/task-list'
import { TaskQuickAdd } from '@/components/features/tasks/task-quick-add'
import { ProjectForm, type ProjectFormValues } from '@/components/features/projects/project-form'
import { useProject, useProjectMutations, useProjectTasks, useTaskMutations } from '@/hooks'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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

function getIcon(iconName?: string | null): LucideIcon {
  if (!iconName) return Folder
  return iconMap[iconName] || Folder
}

interface ProjectDetailClientProps {
  projectId: string
}

/**
 * Project stats card
 */
function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  icon: LucideIcon
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for project header
 */
function ProjectHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-xl bg-muted" />
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-muted" />
          <div className="h-4 w-64 rounded bg-muted" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded bg-muted" />
        <div className="h-9 w-9 rounded bg-muted" />
      </div>
    </div>
  )
}

export function ProjectDetailClient({ projectId }: ProjectDetailClientProps) {
  const router = useRouter()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Fetch project data
  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: tasksData, isLoading: tasksLoading } = useProjectTasks(projectId)
  const tasks = tasksData?.tasks ?? []

  // Mutations
  const { updateProject, deleteProject, archiveProject } = useProjectMutations()
  const { createTask, completeTask } = useTaskMutations()

  // Calculate stats
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t: { status: string }) => t.status === 'completed').length
  const pendingTasks = totalTasks - completedTasks
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Get icon component
  const IconComponent = getIcon(project?.icon)

  // Handlers
  const handleUpdateProject = async (values: ProjectFormValues) => {
    try {
      await updateProject.mutateAsync({ projectId, input: values })
      setIsEditDialogOpen(false)
      toast.success('Project updated successfully')
    } catch {
      toast.error('Failed to update project')
    }
  }

  const handleArchive = async () => {
    try {
      await archiveProject.mutateAsync(projectId)
      toast.success(project?.isArchived ? 'Project unarchived' : 'Project archived')
    } catch {
      toast.error('Failed to archive project')
    }
  }

  const handleFavorite = async () => {
    try {
      await updateProject.mutateAsync({
        projectId,
        input: { isFavorite: !project?.isFavorite },
      })
      toast.success(project?.isFavorite ? 'Removed from favorites' : 'Added to favorites')
    } catch {
      toast.error('Failed to update project')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? All tasks in this project will be unassigned.')) {
      return
    }
    try {
      await deleteProject.mutateAsync(projectId)
      toast.success('Project deleted')
      router.push('/projects')
    } catch {
      toast.error('Failed to delete project')
    }
  }

  const handleAddTask = async (data: { title: string; dueDate?: Date }) => {
    try {
      await createTask.mutateAsync({
        title: data.title,
        dueDate: data.dueDate,
        projectId,
      })
      toast.success('Task added')
    } catch {
      toast.error('Failed to add task')
    }
  }

  const handleCompleteTask = async (taskId: string, completed: boolean) => {
    try {
      await completeTask.mutateAsync({ taskId, completed })
    } catch {
      toast.error('Failed to update task')
    }
  }

  // Loading state
  if (projectLoading) {
    return (
      <div className="space-y-6">
        <ProjectHeaderSkeleton />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Not found state
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Folder className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Project not found</h2>
        <p className="text-muted-foreground mb-4">This project may have been deleted or does not exist.</p>
        <Button asChild>
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div
            className="flex h-14 w-14 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${project.color}20` }}
          >
            <IconComponent className="h-7 w-7" style={{ color: project.color }} />
          </div>

          {/* Title and Description */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              {project.isFavorite && (
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              )}
              {project.isArchived && (
                <Badge variant="secondary">Archived</Badge>
              )}
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFavorite}
            className={cn(project.isFavorite && 'text-yellow-500')}
          >
            <Star className={cn('h-5 w-5', project.isFavorite && 'fill-yellow-500')} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Edit project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleFavorite}>
                <Star className="h-4 w-4 mr-2" />
                {project.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchive}>
                {project.isArchived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tasks"
          value={totalTasks}
          icon={Target}
          color={project.color}
        />
        <StatCard
          title="Completed"
          value={completedTasks}
          icon={CheckCircle2}
          color="#22c55e"
        />
        <StatCard
          title="Pending"
          value={pendingTasks}
          icon={Clock}
          color="#f59e0b"
        />
        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          icon={TrendingUp}
          color={completionRate >= 75 ? '#22c55e' : completionRate >= 50 ? '#f59e0b' : '#ef4444'}
        />
      </div>

      {/* Quick Add Task */}
      <TaskQuickAdd
        onAdd={handleAddTask}
        placeholder="Add a task to this project..."
      />

      {/* Tasks */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Tasks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4">
            <TaskList
              tasks={tasks}
              isLoading={tasksLoading}
              onCompleteTask={handleCompleteTask}
              onClickTask={(taskId) => router.push(`/task/${taskId}`)}
              emptyMessage="No tasks in this project yet. Add your first task above."
              emptyIcon="folder"
            />
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update your project details.
            </DialogDescription>
          </DialogHeader>
          <ProjectForm
            defaultValues={{
              name: project.name,
              description: project.description ?? undefined,
              color: project.color,
              icon: project.icon ?? undefined,
            }}
            onSubmit={handleUpdateProject}
            onCancel={() => setIsEditDialogOpen(false)}
            isSubmitting={updateProject.isPending}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
