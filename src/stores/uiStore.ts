import { create } from 'zustand'

export type WorkspacePane = 'left' | 'right'

export const DEFAULT_SPACE_ID = 'space_general'

interface PaneConversations {
  left: string | null
  right: string | null
}

export interface WorkspaceLayoutSnapshot {
  activeSpaceId: string
  focusedPane: WorkspacePane
  splitEnabled: boolean
  zenMode: boolean
  singlePaneFocus: boolean
  paneConversations: PaneConversations
  openTabsBySpace: Record<string, string[]>
}

interface UiState {
  activeConversationId: string | null
  activeSpaceId: string
  focusedPane: WorkspacePane
  splitEnabled: boolean
  zenMode: boolean
  singlePaneFocus: boolean
  paneConversations: PaneConversations
  openTabsBySpace: Record<string, string[]>
  sidebarOpen: boolean

  setActiveConversation: (id: string | null) => void
  setActiveSpace: (spaceId: string) => void
  setFocusedPane: (pane: WorkspacePane) => void
  setSplitEnabled: (enabled: boolean) => void
  toggleSplitEnabled: () => void
  setZenMode: (enabled: boolean) => void
  toggleZenMode: () => void
  setSinglePaneFocus: (enabled: boolean) => void
  toggleSinglePaneFocus: () => void
  setPaneConversation: (pane: WorkspacePane, id: string | null) => void
  openTab: (spaceId: string, conversationId: string) => void
  hydrateWorkspaceLayout: (layout: WorkspaceLayoutSnapshot) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

function uniqueAppend(tabs: string[], id: string): string[] {
  if (tabs.includes(id)) return tabs
  return [...tabs, id]
}

export const useUiStore = create<UiState>((set) => ({
  activeConversationId: null,
  activeSpaceId: DEFAULT_SPACE_ID,
  focusedPane: 'left',
  splitEnabled: false,
  zenMode: false,
  singlePaneFocus: false,
  paneConversations: { left: null, right: null },
  openTabsBySpace: { [DEFAULT_SPACE_ID]: [] },
  sidebarOpen: true,

  setActiveConversation: (id) =>
    set((state) => {
      const nextPaneConversations = {
        ...state.paneConversations,
        [state.focusedPane]: id,
      }

      if (!id) {
        return {
          activeConversationId: null,
          paneConversations: nextPaneConversations,
        }
      }

      const existingTabs = state.openTabsBySpace[state.activeSpaceId] ?? []
      return {
        activeConversationId: id,
        paneConversations: nextPaneConversations,
        openTabsBySpace: {
          ...state.openTabsBySpace,
          [state.activeSpaceId]: uniqueAppend(existingTabs, id),
        },
      }
    }),
  setActiveSpace: (spaceId) =>
    set((state) => {
      const tabsForSpace = state.openTabsBySpace[spaceId] ?? []
      const nextPaneConversations: PaneConversations = {
        left:
          state.paneConversations.left && tabsForSpace.includes(state.paneConversations.left)
            ? state.paneConversations.left
            : null,
        right:
          state.paneConversations.right && tabsForSpace.includes(state.paneConversations.right)
            ? state.paneConversations.right
            : null,
      }

      if (!nextPaneConversations[state.focusedPane] && tabsForSpace.length > 0) {
        nextPaneConversations[state.focusedPane] = tabsForSpace[0]!
      }

      return {
        activeSpaceId: spaceId,
        paneConversations: nextPaneConversations,
        activeConversationId: nextPaneConversations[state.focusedPane],
        openTabsBySpace: {
          ...state.openTabsBySpace,
          [spaceId]: tabsForSpace,
        },
      }
    }),
  setFocusedPane: (pane) =>
    set((state) => ({
      focusedPane: pane,
      activeConversationId: state.paneConversations[pane],
    })),
  setSplitEnabled: (enabled) =>
    set((state) => ({
      splitEnabled: enabled,
      focusedPane: enabled ? state.focusedPane : 'left',
      activeConversationId: enabled
        ? state.activeConversationId
        : state.paneConversations.left,
    })),
  toggleSplitEnabled: () =>
    set((state) => ({
      splitEnabled: !state.splitEnabled,
      focusedPane: state.splitEnabled ? 'left' : state.focusedPane,
      activeConversationId: state.splitEnabled
        ? state.paneConversations.left
        : state.activeConversationId,
    })),
  setZenMode: (enabled) => set({ zenMode: enabled }),
  toggleZenMode: () => set((state) => ({ zenMode: !state.zenMode })),
  setSinglePaneFocus: (enabled) => set({ singlePaneFocus: enabled }),
  toggleSinglePaneFocus: () =>
    set((state) => ({ singlePaneFocus: !state.singlePaneFocus })),
  setPaneConversation: (pane, id) =>
    set((state) => {
      const nextPaneConversations = { ...state.paneConversations, [pane]: id }
      if (!id) {
        return {
          paneConversations: nextPaneConversations,
          activeConversationId:
            state.focusedPane === pane ? null : state.activeConversationId,
        }
      }

      const existingTabs = state.openTabsBySpace[state.activeSpaceId] ?? []
      return {
        paneConversations: nextPaneConversations,
        activeConversationId:
          state.focusedPane === pane ? id : state.activeConversationId,
        openTabsBySpace: {
          ...state.openTabsBySpace,
          [state.activeSpaceId]: uniqueAppend(existingTabs, id),
        },
      }
    }),
  openTab: (spaceId, conversationId) =>
    set((state) => {
      const existingTabs = state.openTabsBySpace[spaceId] ?? []
      return {
        openTabsBySpace: {
          ...state.openTabsBySpace,
          [spaceId]: uniqueAppend(existingTabs, conversationId),
        },
      }
    }),
  hydrateWorkspaceLayout: (layout) =>
    set((state) => {
      const paneConversations = {
        left: layout.paneConversations.left ?? null,
        right: layout.paneConversations.right ?? null,
      }

      const normalizedTabs: Record<string, string[]> = {}
      for (const [spaceId, tabs] of Object.entries(layout.openTabsBySpace)) {
        normalizedTabs[spaceId] = Array.from(new Set(tabs.filter((id) => id.trim().length > 0)))
      }

      const mergedTabs = {
        ...state.openTabsBySpace,
        ...normalizedTabs,
      }

      const focusedPane = layout.focusedPane === 'right' ? 'right' : 'left'
      return {
        activeSpaceId: layout.activeSpaceId || DEFAULT_SPACE_ID,
        focusedPane,
        splitEnabled: Boolean(layout.splitEnabled),
        zenMode: Boolean(layout.zenMode),
        singlePaneFocus: Boolean(layout.singlePaneFocus),
        paneConversations,
        openTabsBySpace: {
          ...mergedTabs,
          [DEFAULT_SPACE_ID]: mergedTabs[DEFAULT_SPACE_ID] ?? [],
        },
        activeConversationId: paneConversations[focusedPane],
      }
    }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
