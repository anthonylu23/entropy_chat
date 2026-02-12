import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requireEntropyApi } from '@renderer/lib/ipc'
import type { ConversationsCreateRequest } from '@shared/types'
import { useUiStore } from '@renderer/stores/uiStore'

const QUERY_KEYS = {
  conversations: ['conversations'] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
}

export function useConversations() {
  return useQuery({
    queryKey: QUERY_KEYS.conversations,
    queryFn: () => requireEntropyApi().conversations.list(),
  })
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.messages(conversationId ?? ''),
    queryFn: () => requireEntropyApi().messages.listByConversation(conversationId!),
    enabled: conversationId !== null,
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()
  const setActiveConversation = useUiStore((s) => s.setActiveConversation)

  return useMutation({
    mutationFn: (input?: ConversationsCreateRequest) =>
      requireEntropyApi().conversations.create(input),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations })
      setActiveConversation(created.id)
    },
  })
}

export { QUERY_KEYS }
