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
  openConversationInFocusedPane: (conversationId: string) => void
  openConversationInPane: (pane: WorkspacePane, conversationId: string) => void
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

function getOtherPane(pane: WorkspacePane): WorkspacePane {
  return pane === 'left' ? 'right' : 'left'
}

function appendConversationToActiveSpaceTabs(
  openTabsBySpace: Record<string, string[]>,
  activeSpaceId: string,
  conversationId: string
): Record<string, string[]> {
  const existingTabs = openTabsBySpace[activeSpaceId] ?? []
  return {
    ...openTabsBySpace,
    [activeSpaceId]: uniqueAppend(existingTabs, conversationId),
  }
}

export const useUiStore = create<UiState>((set, get) => ({
  activeConversationId: null,
  activeSpaceId: DEFAULT_SPACE_ID,
  focusedPane: 'left',
  splitEnabled: false,
  zenMode: false,
  singlePaneFocus: false,
  paneConversations: { left: null, right: null },
  openTabsBySpace: { [DEFAULT_SPACE_ID]: [] },
  sidebarOpen: true,

  setActiveConversation: (id) => {
    if (id === null) {
      set((state) => ({
        activeConversationId: null,
        paneConversations: {
          ...state.paneConversations,
          [state.focusedPane]: null,
        },
      }))
      return
    }
    get().openConversationInFocusedPane(id)
  },
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
        const otherPane = getOtherPane(state.focusedPane)
        nextPaneConversations[state.focusedPane] =
          tabsForSpace.find((conversationId) => conversationId !== nextPaneConversations[otherPane]) ??
          null
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
  openConversationInFocusedPane: (conversationId) =>
    set((state) => {
      const targetPane = state.focusedPane
      const otherPane = getOtherPane(targetPane)
      const openTabsBySpace = appendConversationToActiveSpaceTabs(
        state.openTabsBySpace,
        state.activeSpaceId,
        conversationId
      )

      if (state.paneConversations[otherPane] === conversationId) {
        if (!state.splitEnabled) {
          return {
            focusedPane: targetPane,
            activeConversationId: conversationId,
            paneConversations: {
              ...state.paneConversations,
              [targetPane]: conversationId,
              [otherPane]: null,
            },
            openTabsBySpace,
          }
        }

        return {
          focusedPane: otherPane,
          activeConversationId: conversationId,
          openTabsBySpace,
        }
      }

      return {
        activeConversationId: conversationId,
        paneConversations: {
          ...state.paneConversations,
          [targetPane]: conversationId,
        },
        openTabsBySpace,
      }
    }),
  openConversationInPane: (pane, conversationId) =>
    set((state) => {
      const otherPane = getOtherPane(pane)
      const openTabsBySpace = appendConversationToActiveSpaceTabs(
        state.openTabsBySpace,
        state.activeSpaceId,
        conversationId
      )

      if (state.paneConversations[otherPane] === conversationId) {
        if (!state.splitEnabled) {
          return {
            focusedPane: pane,
            activeConversationId: conversationId,
            paneConversations: {
              ...state.paneConversations,
              [pane]: conversationId,
              [otherPane]: null,
            },
            openTabsBySpace,
          }
        }

        return {
          focusedPane: otherPane,
          activeConversationId: conversationId,
          openTabsBySpace,
        }
      }

      return {
        focusedPane: pane,
        activeConversationId: conversationId,
        paneConversations: {
          ...state.paneConversations,
          [pane]: conversationId,
        },
        openTabsBySpace,
      }
    }),
  setPaneConversation: (pane, id) =>
    set((state) => {
      if (!id) {
        return {
          paneConversations: { ...state.paneConversations, [pane]: null },
          activeConversationId:
            state.focusedPane === pane ? null : state.activeConversationId,
        }
      }

      const otherPane = getOtherPane(pane)
      const openTabsBySpace = appendConversationToActiveSpaceTabs(
        state.openTabsBySpace,
        state.activeSpaceId,
        id
      )

      if (state.paneConversations[otherPane] === id) {
        if (!state.splitEnabled) {
          return {
            focusedPane: pane,
            activeConversationId: id,
            paneConversations: {
              ...state.paneConversations,
              [pane]: id,
              [otherPane]: null,
            },
            openTabsBySpace,
          }
        }

        return {
          focusedPane: otherPane,
          activeConversationId: id,
          openTabsBySpace,
        }
      }

      return {
        focusedPane: pane,
        paneConversations: { ...state.paneConversations, [pane]: id },
        activeConversationId: id,
        openTabsBySpace,
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
