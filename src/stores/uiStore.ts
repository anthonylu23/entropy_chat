import { create } from 'zustand'

interface UiState {
  activeConversationId: string | null
  sidebarOpen: boolean

  setActiveConversation: (id: string | null) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  activeConversationId: null,
  sidebarOpen: true,

  setActiveConversation: (id) => set({ activeConversationId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
