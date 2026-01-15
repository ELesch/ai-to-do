/**
 * Project Detail Page
 * Shows tasks within a specific project with stats and task management
 */

import { ProjectDetailClient } from './project-detail-client'

interface ProjectDetailPageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId } = await params

  return <ProjectDetailClient projectId={projectId} />
}
