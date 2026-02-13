import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  useUiStore,
  DEFAULT_SPACE_ID,
  type WorkspaceLayoutSnapshot,
} from '@renderer/stores/uiStore'
import { useConversations, useCreateConversation } from '@renderer/hooks/useConversations'
import { SpacesRail, type WorkspaceSpace } from '@renderer/components/layout/SpacesRail'
import { WorkspaceSidebar } from '@renderer/components/layout/WorkspaceSidebar'
import { PinnedTabStrip } from '@renderer/components/layout/PinnedTabStrip'
import { SplitPaneWorkspace } from '@renderer/components/layout/SplitPaneWorkspace'
import { ChatView } from '@renderer/components/chat/ChatView'
import { requireEntropyApi } from '@renderer/lib/ipc'
import { MessageSquare, Columns2, Focus, Sparkles } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

const WORKSPACE_LAYOUT_KEY = 'ui.workspaceLayout.v1'
const DEFAULT_WORKSPACE_SPACE: WorkspaceSpace = {
  id: DEFAULT_SPACE_ID,
  name: 'General',
}
const WORKSPACE_SPACES: WorkspaceSpace[] = [DEFAULT_WORKSPACE_SPACE]

function EmptyPane({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
        <MessageSquare className="h-10 w-10 opacity-40" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  )
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isWorkspaceLayoutSnapshot(value: unknown): value is WorkspaceLayoutSnapshot {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<WorkspaceLayoutSnapshot>
  if (typeof candidate.activeSpaceId !== 'string') return false
  if (candidate.focusedPane !== 'left' && candidate.focusedPane !== 'right') return false
  if (typeof candidate.splitEnabled !== 'boolean') return false
  if (typeof candidate.zenMode !== 'boolean') return false
  if (typeof candidate.singlePaneFocus !== 'boolean') return false
  if (!candidate.paneConversations || typeof candidate.paneConversations !== 'object') return false
  const panes = candidate.paneConversations as { left?: unknown; right?: unknown }
  const leftType = panes.left === null ? null : typeof panes.left
  const rightType = panes.right === null ? null : typeof panes.right
  if (
    panes.left === undefined ||
    panes.right === undefined ||
    (leftType !== null && leftType !== 'string') ||
    (rightType !== null && rightType !== 'string')
  ) {
    return false
  }
  if (!candidate.openTabsBySpace || typeof candidate.openTabsBySpace !== 'object') return false
  return Object.values(candidate.openTabsBySpace).every((tabs) => isStringArray(tabs))
}

export function AppShell() {
  const [layoutReady, setLayoutReady] = useState(false)
  const loadedLayoutRef = useRef(false)
  const activeConversationId = useUiStore((s) => s.activeConversationId)
  const activeSpaceId = useUiStore((s) => s.activeSpaceId)
  const focusedPane = useUiStore((s) => s.focusedPane)
  const splitEnabled = useUiStore((s) => s.splitEnabled)
  const zenMode = useUiStore((s) => s.zenMode)
  const singlePaneFocus = useUiStore((s) => s.singlePaneFocus)
  const paneConversations = useUiStore((s) => s.paneConversations)
  const openTabsBySpace = useUiStore((s) => s.openTabsBySpace)
  const openConversationInFocusedPane = useUiStore(
    (s) => s.openConversationInFocusedPane
  )
  const setActiveSpace = useUiStore((s) => s.setActiveSpace)
  const setFocusedPane = useUiStore((s) => s.setFocusedPane)
  const setSplitEnabled = useUiStore((s) => s.setSplitEnabled)
  const hydrateWorkspaceLayout = useUiStore((s) => s.hydrateWorkspaceLayout)
  const toggleZenMode = useUiStore((s) => s.toggleZenMode)
  const toggleSinglePaneFocus = useUiStore((s) => s.toggleSinglePaneFocus)

  const { data: conversations = [] } = useConversations()
  const createConversation = useCreateConversation()

  const activeSpace = useMemo(
    () => WORKSPACE_SPACES.find((space) => space.id === activeSpaceId) ?? DEFAULT_WORKSPACE_SPACE,
    [activeSpaceId]
  )

  const conversationsInActiveSpace = useMemo(
    () => conversations.filter((conversation) => conversation.spaceId === activeSpaceId),
    [activeSpaceId, conversations]
  )

  useEffect(() => {
    if (conversationsInActiveSpace.length === 0) return
    if (
      activeConversationId &&
      conversationsInActiveSpace.some((conversation) => conversation.id === activeConversationId)
    ) {
      return
    }
    openConversationInFocusedPane(conversationsInActiveSpace[0]!.id)
  }, [activeConversationId, conversationsInActiveSpace, openConversationInFocusedPane])

  useEffect(() => {
    let cancelled = false

    const loadWorkspaceLayout = async () => {
      try {
        const rawValue = await requireEntropyApi().settings.get(WORKSPACE_LAYOUT_KEY)
        if (!rawValue || cancelled) return
        const parsed: unknown = JSON.parse(rawValue)
        if (isWorkspaceLayoutSnapshot(parsed)) {
          hydrateWorkspaceLayout(parsed)
        }
      } catch {
        // Ignore invalid snapshots and preserve defaults.
      } finally {
        if (!cancelled) {
          loadedLayoutRef.current = true
          setLayoutReady(true)
        }
      }
    }

    void loadWorkspaceLayout()
    return () => {
      cancelled = true
    }
  }, [hydrateWorkspaceLayout])

  const handleNewChat = useCallback(() => {
    createConversation.mutate(undefined)
  }, [createConversation])

  const handleOpenConversation = useCallback(
    (conversationId: string) => {
      openConversationInFocusedPane(conversationId)
    },
    [openConversationInFocusedPane]
  )

  useEffect(() => {
    if (!layoutReady || !loadedLayoutRef.current) return

    const payload: WorkspaceLayoutSnapshot = {
      activeSpaceId: activeSpaceId || DEFAULT_SPACE_ID,
      focusedPane,
      splitEnabled,
      zenMode,
      singlePaneFocus,
      paneConversations,
      openTabsBySpace,
    }

    const timeoutId = window.setTimeout(() => {
      void requireEntropyApi().settings.set(WORKSPACE_LAYOUT_KEY, JSON.stringify(payload))
    }, 150)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    activeSpaceId,
    focusedPane,
    layoutReady,
    openTabsBySpace,
    paneConversations,
    singlePaneFocus,
    splitEnabled,
    zenMode,
  ])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const metaOrCtrl = event.metaKey || event.ctrlKey
      if (!metaOrCtrl) return

      const key = event.key.toLowerCase()
      if (key === 't' && !event.shiftKey) {
        event.preventDefault()
        handleNewChat()
        return
      }

      if (event.key === '\\' && !event.shiftKey) {
        event.preventDefault()
        setSplitEnabled(!splitEnabled)
        return
      }

      if (event.shiftKey && key === 'f') {
        event.preventDefault()
        toggleZenMode()
        return
      }

      if (event.shiftKey && event.code === 'Digit1') {
        event.preventDefault()
        toggleSinglePaneFocus()
        return
      }

      if (!event.shiftKey && /^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1
        const nextSpace = WORKSPACE_SPACES[index]
        if (nextSpace) {
          event.preventDefault()
          setActiveSpace(nextSpace.id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    handleNewChat,
    setActiveSpace,
    setSplitEnabled,
    splitEnabled,
    toggleSinglePaneFocus,
    toggleZenMode,
  ])

  const leftConversationId = paneConversations.left
  const rightConversationId = paneConversations.right
  const tabConversationIds = openTabsBySpace[activeSpaceId] ?? []

  const leftPane = leftConversationId ? (
    <ChatView conversationId={leftConversationId} />
  ) : (
    <EmptyPane label="Select a conversation or start a new chat" />
  )

  const rightPane = rightConversationId ? (
    <ChatView conversationId={rightConversationId} />
  ) : (
    <EmptyPane label="Focus this pane and select a conversation" />
  )

  return (
    <div className="flex h-screen bg-[radial-gradient(120%_120%_at_0%_0%,rgba(255,255,255,0.07)_0%,rgba(0,0,0,0)_40%)]">
      {!zenMode && (
        <SpacesRail
          spaces={WORKSPACE_SPACES}
          activeSpaceId={activeSpace.id}
          onSelectSpace={setActiveSpace}
        />
      )}
      {!zenMode && (
        <WorkspaceSidebar
          spaceName={activeSpace.name}
          conversations={conversationsInActiveSpace}
          activeConversationId={activeConversationId}
          onSelectConversation={handleOpenConversation}
          onNewChat={handleNewChat}
        />
      )}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!zenMode && (
          <PinnedTabStrip
            tabConversationIds={tabConversationIds}
            conversations={conversationsInActiveSpace}
            activeConversationId={activeConversationId}
            onSelectConversation={handleOpenConversation}
          />
        )}
        <div className="flex h-12 items-center justify-between border-b border-border/50 bg-black/10 px-3">
          <div className="flex items-center gap-1.5">
            <Button
              variant={splitEnabled ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setSplitEnabled(!splitEnabled)}
            >
              <Columns2 className="h-4 w-4" />
              Split
            </Button>
            <Button
              variant={zenMode ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={toggleZenMode}
            >
              <Sparkles className="h-4 w-4" />
              Zen
            </Button>
            <Button
              variant={singlePaneFocus ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={toggleSinglePaneFocus}
              disabled={!splitEnabled}
            >
              <Focus className="h-4 w-4" />
              Focus
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              className={
                focusedPane === 'left'
                  ? 'rounded-md bg-primary/20 px-2 py-1 text-foreground'
                  : 'rounded-md px-2 py-1 hover:text-foreground'
              }
              onClick={() => setFocusedPane('left')}
            >
              Left
            </button>
            {splitEnabled && (
              <button
                type="button"
                className={
                  focusedPane === 'right'
                    ? 'rounded-md bg-primary/20 px-2 py-1 text-foreground'
                    : 'rounded-md px-2 py-1 hover:text-foreground'
                }
                onClick={() => setFocusedPane('right')}
              >
                Right
              </button>
            )}
            {splitEnabled && (
              <span
                className="rounded-md border border-border/60 bg-black/20 px-2 py-1"
                title="If this conversation is already open in the opposite pane, focus will jump there."
              >
                Re-select focuses existing pane
              </span>
            )}
          </div>
        </div>
        <SplitPaneWorkspace
          splitEnabled={splitEnabled}
          singlePaneFocus={singlePaneFocus}
          focusedPane={focusedPane}
          onFocusPane={setFocusedPane}
          left={leftPane}
          right={rightPane}
        />
      </main>
    </div>
  )
}
