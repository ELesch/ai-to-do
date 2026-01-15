/**
 * Hooks Index
 * Re-exports all custom hooks for convenient imports
 */

export {
  useTasks,
  useTask,
  useSubtasks,
  useTaskMutations,
  useTodayTasks,
  useUpcomingTasks,
  useOverdueTasks,
  useProjectTasks,
  useInvalidateTasks,
  usePrefetchTask,
  taskKeys,
  type TaskFilters,
  type TaskWithMeta,
} from './use-tasks'
export {
  useProjects,
  useProject,
  useProjectMutations,
  useFavoriteProjects,
  useArchivedProjects,
  useInvalidateProjects,
  usePrefetchProject,
  projectKeys,
  type ProjectFilters,
  type ProjectWithStats,
  type CreateProjectInput,
  type UpdateProjectInput,
} from './use-projects'
export {
  useAIChat,
  useAIDecompose,
  useAIResearch,
  aiChatKeys,
  type Message,
  type UseAIChatOptions,
  type UseAIChatReturn,
} from './use-ai-chat'
export {
  useAISuggestions,
  useTaskActionSuggestions,
  useTitleSuggestions,
  aiSuggestionsKeys,
  type SuggestionType,
  type TaskSuggestion,
  type UseAISuggestionsOptions,
  type UseAISuggestionsReturn,
} from './use-ai-suggestions'
export {
  useAIContext,
  useResearchContext,
  useDraftContext,
  useConversationContext,
  aiContextKeys,
  type ContextState,
  type SavedContext,
  type UseAIContextOptions,
  type UseAIContextReturn,
} from './use-ai-context'
export {
  useKeyboardShortcut,
  useKeyboardShortcuts,
  useAppShortcuts,
  useTaskListNavigation,
  useRegisteredShortcuts,
  useModalOpen,
} from './use-keyboard-shortcuts'
export {
  useSearch,
  useRecentItems,
  useCommandPaletteSearch,
  type TaskSearchResult,
  type ProjectSearchResult,
  type SearchResults,
  type RecentItem,
  type SearchType,
} from './use-search'
export {
  useDailyBriefing,
  clearBriefingCache,
  dailyBriefingKeys,
  type BriefingTask,
  type AIInsights,
  type RecentActivity,
  type DailyBriefing,
  type UseDailyBriefingOptions,
  type UseDailyBriefingReturn,
} from './use-daily-briefing'
export {
  useFocusTrap,
  useFocusList,
  useFocusAnnouncement,
} from './use-focus-trap'
