import type { ConversationSummary } from '@shared/types'
import { Button } from '@renderer/components/ui/button'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import type { WorkspacePane } from '@renderer/stores/uiStore'
import { Plus, MessageSquare, Columns2, Focus, Sparkles } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface WorkspaceSidebarProps {
  spaceName: string
  conversations: ConversationSummary[]
  activeConversationId: string | null
  splitEnabled: boolean
  singlePaneFocus: boolean
  focusedPane: WorkspacePane
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  onToggleSplit: () => void
  onToggleZen: () => void
  onToggleSinglePaneFocus: () => void
  onFocusPane: (pane: WorkspacePane) => void
}

export function WorkspaceSidebar({
  spaceName,
  conversations,
  activeConversationId,
  splitEnabled,
  singlePaneFocus,
  focusedPane,
  onSelectConversation,
  onNewChat,
  onToggleSplit,
  onToggleZen,
  onToggleSinglePaneFocus,
  onFocusPane,
}: WorkspaceSidebarProps) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-surface-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Space
          </p>
          <h2 className="truncate text-sm font-semibold text-foreground">{spaceName}</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-border bg-surface-2"
          onClick={onNewChat}
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 px-2 py-3">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => onSelectConversation(conv.id)}
              className={cn(
                'group flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-all',
                activeConversationId === conv.id
                  ? 'border-primary/50 bg-primary/10 text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:bg-surface-2 hover:text-foreground'
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0 opacity-80" />
              <span className="truncate">{conv.title || 'New Conversation'}</span>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">No conversations yet.</p>
          )}
        </div>
      </ScrollArea>
      <div className="border-t border-border bg-surface-1 p-3">
        <div className="flex items-center gap-1.5">
          <Button
            variant={splitEnabled ? 'default' : 'outline'}
            size="sm"
            className="h-8 flex-1 gap-1.5 px-2"
            onClick={onToggleSplit}
          >
            <Columns2 className="h-3.5 w-3.5" />
            Split
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 flex-1 gap-1.5 px-2"
            onClick={onToggleZen}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Zen
          </Button>
          <Button
            variant={singlePaneFocus ? 'default' : 'outline'}
            size="sm"
            className="h-8 flex-1 gap-1.5 px-2"
            onClick={onToggleSinglePaneFocus}
            disabled={!splitEnabled}
          >
            <Focus className="h-3.5 w-3.5" />
            Focus
          </Button>
        </div>
        {splitEnabled && (
          <div className="mt-2 flex items-center gap-1">
            <button
              type="button"
              className={cn(
                'flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors',
                focusedPane === 'left'
                  ? 'border-primary/60 bg-primary/15 text-foreground'
                  : 'border-border bg-surface-2 text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onFocusPane('left')}
            >
              Left Pane
            </button>
            <button
              type="button"
              className={cn(
                'flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors',
                focusedPane === 'right'
                  ? 'border-primary/60 bg-primary/15 text-foreground'
                  : 'border-border bg-surface-2 text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onFocusPane('right')}
            >
              Right Pane
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
