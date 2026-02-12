import type { ConversationSummary } from '@shared/types'
import { Button } from '@renderer/components/ui/button'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Plus, MessageSquare } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface SidebarProps {
  conversations: ConversationSummary[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewChat: () => void
}

export function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card/50">
      <div className="p-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onNewChat}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                'hover:bg-accent/50',
                activeConversationId === conv.id
                  ? 'bg-accent/70 text-accent-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {conv.title || 'New Conversation'}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  )
}
