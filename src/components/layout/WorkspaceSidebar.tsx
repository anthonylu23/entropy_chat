import type { ConversationSummary } from '@shared/types'
import { Button } from '@renderer/components/ui/button'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Plus, MessageSquare } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface WorkspaceSidebarProps {
  spaceName: string
  conversations: ConversationSummary[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewChat: () => void
}

export function WorkspaceSidebar({
  spaceName,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: WorkspaceSidebarProps) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border/70 bg-black/10 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Space
          </p>
          <h2 className="truncate text-sm font-semibold text-foreground">{spaceName}</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-border/70 bg-black/20"
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
                  ? 'border-primary/50 bg-primary/15 text-foreground shadow-[0_6px_18px_rgba(0,184,169,0.18)]'
                  : 'border-transparent text-muted-foreground hover:border-border/60 hover:bg-black/20 hover:text-foreground'
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
    </aside>
  )
}
