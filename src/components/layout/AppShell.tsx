import { useConversations, useCreateConversation } from '@renderer/hooks/useConversations'
import { useUiStore } from '@renderer/stores/uiStore'
import { Sidebar } from '@renderer/components/layout/Sidebar'
import { ChatView } from '@renderer/components/chat/ChatView'
import { MessageSquare } from 'lucide-react'

export function AppShell() {
  const activeConversationId = useUiStore((s) => s.activeConversationId)
  const setActiveConversation = useUiStore((s) => s.setActiveConversation)

  const { data: conversations = [] } = useConversations()
  const createConversation = useCreateConversation()

  const handleNewChat = () => {
    createConversation.mutate(undefined)
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversation}
        onNewChat={handleNewChat}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        {activeConversationId ? (
          <ChatView conversationId={activeConversationId} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageSquare className="h-10 w-10 opacity-40" />
            <p className="text-sm">
              Select a conversation or start a new chat
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
