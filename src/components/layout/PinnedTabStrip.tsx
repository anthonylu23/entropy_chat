import type { ConversationSummary } from '@shared/types'
import { Pin } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface PinnedTabStripProps {
  tabConversationIds: string[]
  conversations: ConversationSummary[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
}

export function PinnedTabStrip({
  tabConversationIds,
  conversations,
  activeConversationId,
  onSelectConversation,
}: PinnedTabStripProps) {
  const byId = new Map(conversations.map((conversation) => [conversation.id, conversation]))
  const tabs = tabConversationIds
    .map((id) => byId.get(id))
    .filter((value): value is ConversationSummary => Boolean(value))

  return (
    <div className="flex h-12 items-center gap-2 border-b border-border/60 bg-black/10 px-3">
      <div className="mr-1 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        <Pin className="h-3.5 w-3.5" />
        Tabs
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-1 pt-1">
        {tabs.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelectConversation(conversation.id)}
            className={cn(
              'max-w-52 shrink-0 truncate rounded-md border px-3 py-1.5 text-xs transition-colors',
              activeConversationId === conversation.id
                ? 'border-primary/60 bg-primary/20 text-foreground'
                : 'border-border/70 bg-black/15 text-muted-foreground hover:bg-black/25 hover:text-foreground'
            )}
            title={conversation.title ?? 'New Conversation'}
          >
            {conversation.title || 'New Conversation'}
          </button>
        ))}
        {tabs.length === 0 && (
          <span className="text-xs text-muted-foreground">
            Open a conversation to populate tabs for this space.
          </span>
        )}
      </div>
    </div>
  )
}
