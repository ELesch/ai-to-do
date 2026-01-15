/**
 * AI Store
 * Zustand store for AI conversation state
 */

'use client'

// TODO: Uncomment when zustand is installed
// import { create } from 'zustand'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Conversation {
  id: string
  taskId?: string
  messages: Message[]
  createdAt: Date
}

export interface AIStoreState {
  // Current conversation
  activeConversationId: string | null
  conversations: Map<string, Conversation>

  // Actions
  setActiveConversation: (conversationId: string | null) => void
  createConversation: (taskId?: string) => string
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => void
  clearConversation: (conversationId: string) => void

  // AI suggestions
  suggestions: Map<string, string[]> // taskId -> suggestions
  setSuggestions: (taskId: string, suggestions: string[]) => void
  clearSuggestions: (taskId: string) => void

  // AI state
  isProcessing: boolean
  setIsProcessing: (processing: boolean) => void
  lastError: Error | null
  setLastError: (error: Error | null) => void
}

// Placeholder implementation until zustand is installed
let state: AIStoreState = {
  activeConversationId: null,
  conversations: new Map(),

  setActiveConversation: (conversationId: string | null) => {
    state = { ...state, activeConversationId: conversationId }
  },
  createConversation: (taskId?: string) => {
    const id = `conv-${Date.now()}`
    const conversation: Conversation = {
      id,
      taskId,
      messages: [],
      createdAt: new Date(),
    }
    state.conversations.set(id, conversation)
    state = { ...state, activeConversationId: id }
    return id
  },
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    const conversation = state.conversations.get(conversationId)
    if (conversation) {
      conversation.messages.push({
        ...message,
        id: `msg-${Date.now()}`,
        timestamp: new Date(),
      })
    }
  },
  clearConversation: (conversationId: string) => {
    const conversation = state.conversations.get(conversationId)
    if (conversation) {
      conversation.messages = []
    }
  },

  suggestions: new Map(),
  setSuggestions: (taskId: string, suggestions: string[]) => {
    state.suggestions.set(taskId, suggestions)
  },
  clearSuggestions: (taskId: string) => {
    state.suggestions.delete(taskId)
  },

  isProcessing: false,
  setIsProcessing: (processing: boolean) => {
    state = { ...state, isProcessing: processing }
  },
  lastError: null,
  setLastError: (error: Error | null) => {
    state = { ...state, lastError: error }
  },
}

export function useAIStore(): AIStoreState
export function useAIStore<T>(selector: (state: AIStoreState) => T): T
export function useAIStore<T>(selector?: (state: AIStoreState) => T) {
  // TODO: Replace with actual zustand store
  if (selector) {
    return selector(state)
  }
  return state
}

/*
// Actual zustand implementation (uncomment when installed)
export const useAIStore = create<AIStoreState>()((set, get) => ({
  // Current conversation
  activeConversationId: null,
  conversations: new Map(),

  // Actions
  setActiveConversation: (conversationId) =>
    set({ activeConversationId: conversationId }),

  createConversation: (taskId) => {
    const id = `conv-${Date.now()}`
    const conversations = new Map(get().conversations)
    conversations.set(id, {
      id,
      taskId,
      messages: [],
      createdAt: new Date(),
    })
    set({ conversations, activeConversationId: id })
    return id
  },

  addMessage: (conversationId, message) => {
    const conversations = new Map(get().conversations)
    const conversation = conversations.get(conversationId)
    if (conversation) {
      conversation.messages.push({
        ...message,
        id: `msg-${Date.now()}`,
        timestamp: new Date(),
      })
      set({ conversations })
    }
  },

  clearConversation: (conversationId) => {
    const conversations = new Map(get().conversations)
    const conversation = conversations.get(conversationId)
    if (conversation) {
      conversation.messages = []
      set({ conversations })
    }
  },

  // AI suggestions
  suggestions: new Map(),
  setSuggestions: (taskId, suggestions) => {
    const map = new Map(get().suggestions)
    map.set(taskId, suggestions)
    set({ suggestions: map })
  },
  clearSuggestions: (taskId) => {
    const map = new Map(get().suggestions)
    map.delete(taskId)
    set({ suggestions: map })
  },

  // AI state
  isProcessing: false,
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  lastError: null,
  setLastError: (error) => set({ lastError: error }),
}))
*/
