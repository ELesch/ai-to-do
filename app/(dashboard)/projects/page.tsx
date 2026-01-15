/**
 * Projects Page
 * Lists all user projects with task counts
 */

'use client'

import { useState } from 'react'
import { Plus, Archive, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProjectList } from '@/components/features/projects/project-list'
import { ProjectForm, type ProjectFormValues } from '@/components/features/projects/project-form'
import { useProjects, useProjectMutations } from '@/hooks'
import { toast } from 'sonner'

export default function ProjectsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  // Fetch projects
  const { data: projectsData, isLoading } = useProjects()
  const { createProject, updateProject, deleteProject, archiveProject } = useProjectMutations()

  // Transform projects data to include task counts (placeholder data for now)
  const projects = (projectsData || []).map((project: { id: string; name: string; description?: string | null; color: string; icon?: string | null; isFavorite?: boolean; isArchived?: boolean }) => ({
    ...project,
    taskCount: 0, // Will be populated from actual data
    completedTaskCount: 0,
  }))

  // Filter projects based on archived state
  const filteredProjects = showArchived
    ? projects
    : projects.filter((p: { isArchived?: boolean }) => !p.isArchived)

  // Get project being edited
  const editingProject = projects.find((p: { id: string }) => p.id === editingProjectId)

  // Handlers
  const handleCreateProject = async (values: ProjectFormValues) => {
    try {
      await createProject.mutateAsync(values)
      setIsCreateDialogOpen(false)
      toast.success('Project created successfully')
    } catch {
      toast.error('Failed to create project')
    }
  }

  const handleUpdateProject = async (values: ProjectFormValues) => {
    if (!editingProjectId) return
    try {
      await updateProject.mutateAsync({ projectId: editingProjectId, input: values })
      setEditingProjectId(null)
      toast.success('Project updated successfully')
    } catch {
      toast.error('Failed to update project')
    }
  }

  const handleArchive = async (projectId: string, archive: boolean) => {
    try {
      await archiveProject.mutateAsync(projectId)
      toast.success(archive ? 'Project archived' : 'Project unarchived')
    } catch {
      toast.error('Failed to archive project')
    }
  }

  const handleFavorite = async (projectId: string, favorite: boolean) => {
    try {
      await updateProject.mutateAsync({
        projectId,
        input: { isFavorite: favorite },
      })
      toast.success(favorite ? 'Added to favorites' : 'Removed from favorites')
    } catch {
      toast.error('Failed to update project')
    }
  }

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }
    try {
      await deleteProject.mutateAsync(projectId)
      toast.success('Project deleted')
    } catch {
      toast.error('Failed to delete project')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Organize your tasks into projects</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Show Archived Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Archive className="h-4 w-4 mr-2" />
                View
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={showArchived}
                onCheckedChange={setShowArchived}
              >
                Show archived projects
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create Project Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
                <DialogDescription>
                  Create a new project to organize your tasks.
                </DialogDescription>
              </DialogHeader>
              <ProjectForm
                onSubmit={handleCreateProject}
                onCancel={() => setIsCreateDialogOpen(false)}
                isSubmitting={createProject.isPending}
                submitLabel="Create Project"
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Project List */}
      <ProjectList
        projects={filteredProjects}
        isLoading={isLoading}
        groupBy="favorite"
        onArchive={handleArchive}
        onFavorite={handleFavorite}
        onEdit={setEditingProjectId}
        onDelete={handleDelete}
        emptyMessage="No projects yet. Create your first project to organize your tasks."
      />

      {/* Edit Project Dialog */}
      <Dialog
        open={!!editingProjectId}
        onOpenChange={(open) => !open && setEditingProjectId(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update your project details.
            </DialogDescription>
          </DialogHeader>
          {editingProject && (
            <ProjectForm
              defaultValues={{
                name: editingProject.name,
                description: editingProject.description ?? undefined,
                color: editingProject.color,
                icon: editingProject.icon ?? undefined,
              }}
              onSubmit={handleUpdateProject}
              onCancel={() => setEditingProjectId(null)}
              isSubmitting={updateProject.isPending}
              submitLabel="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
