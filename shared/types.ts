export const IPC_CHANNELS = {
  SYSTEM_PING: 'system:ping',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  CREDENTIALS_HAS_OPENAI_KEY: 'credentials:hasOpenAIKey',
  CREDENTIALS_SET_OPENAI_KEY: 'credentials:setOpenAIKey',
  CONVERSATIONS_LIST: 'conversations:list',
  CONVERSATIONS_CREATE: 'conversations:create',
  MESSAGES_LIST_BY_CONVERSATION: 'messages:listByConversation',
  CHAT_STREAM_START: 'chat:stream:start',
  CHAT_STREAM_CANCEL: 'chat:stream:cancel',
  CHAT_STREAM_DELTA: 'chat:stream:delta',
  CHAT_STREAM_DONE: 'chat:stream:done',
  CHAT_STREAM_ERROR: 'chat:stream:error'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
export type ChatRole = 'user' | 'assistant' | 'system'
export type Unsubscribe = () => void

export interface SettingsGetRequest {
  key: string
}

export interface SettingsSetRequest {
  key: string
  value: string
}

export interface CredentialsSetOpenAIKeyRequest {
  apiKey: string
}

export interface ConversationsCreateRequest {
  title?: string
}

export interface MessagesListByConversationRequest {
  conversationId: string
}

export interface ChatStreamStartInput {
  conversationId: string
  prompt: string
  model?: string
}

export interface ChatStreamCancelRequest {
  requestId: string
}

export interface ConversationSummary {
  id: string
  title: string | null
  model: string
  providerId: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: ChatRole
  content: string
  model: string | null
  tokensUsed: number | null
  createdAt: string
}

export interface ChatStreamStartResponse {
  requestId: string
}

export interface ChatStreamDeltaEvent {
  requestId: string
  conversationId: string
  delta: string
}

export interface ChatStreamDoneEvent {
  requestId: string
  conversationId: string
  messageId: string | null
  cancelled: boolean
}

export interface ChatStreamErrorEvent {
  requestId: string
  conversationId: string
  error: string
}

export type SettingsGetResponse = string | null
export type SettingsSetResponse = void
export type SystemPingResponse = string
export type CredentialsHasOpenAIKeyResponse = boolean
export type CredentialsSetOpenAIKeyResponse = void
export type ConversationsListResponse = ConversationSummary[]
export type ConversationsCreateResponse = ConversationSummary
export type MessagesListByConversationResponse = ChatMessage[]
export type ChatStreamCancelResponse = void

export interface EntropyApi {
  system: {
    ping: () => Promise<SystemPingResponse>
  }
  settings: {
    get: (key: string) => Promise<SettingsGetResponse>
    set: (key: string, value: string) => Promise<SettingsSetResponse>
  }
  credentials: {
    hasOpenAIKey: () => Promise<CredentialsHasOpenAIKeyResponse>
    setOpenAIKey: (apiKey: string) => Promise<CredentialsSetOpenAIKeyResponse>
  }
  conversations: {
    list: () => Promise<ConversationsListResponse>
    create: (input?: ConversationsCreateRequest) => Promise<ConversationsCreateResponse>
  }
  messages: {
    listByConversation: (
      conversationId: string
    ) => Promise<MessagesListByConversationResponse>
  }
  chat: {
    stream: {
      start: (input: ChatStreamStartInput) => Promise<ChatStreamStartResponse>
      cancel: (requestId: string) => Promise<ChatStreamCancelResponse>
    }
    onDelta: (listener: (event: ChatStreamDeltaEvent) => void) => Unsubscribe
    onDone: (listener: (event: ChatStreamDoneEvent) => void) => Unsubscribe
    onError: (listener: (event: ChatStreamErrorEvent) => void) => Unsubscribe
  }
}
