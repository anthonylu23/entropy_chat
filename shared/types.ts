export const IPC_CHANNELS = {
  SYSTEM_PING: 'system:ping',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  CREDENTIALS_HAS_OPENAI_KEY: 'credentials:hasOpenAIKey',
  CREDENTIALS_SET_OPENAI_KEY: 'credentials:setOpenAIKey',
  SPACES_LIST: 'spaces:list',
  SPACES_CREATE: 'spaces:create',
  SPACES_UPDATE: 'spaces:update',
  SPACES_REORDER: 'spaces:reorder',
  CONVERSATIONS_LIST: 'conversations:list',
  CONVERSATIONS_CREATE: 'conversations:create',
  CONVERSATIONS_PIN: 'conversations:pin',
  CONVERSATIONS_REORDER_PINNED: 'conversations:reorderPinned',
  CONVERSATIONS_MOVE_TO_SPACE: 'conversations:moveToSpace',
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

export interface SpacesCreateRequest {
  name: string
  color?: string
  icon?: string
}

export interface SpacesUpdateRequest {
  id: string
  name?: string
  color?: string | null
  icon?: string | null
}

export interface SpacesReorderRequest {
  orderedSpaceIds: string[]
}

export interface ConversationsCreateRequest {
  title?: string
  spaceId?: string
}

export interface ConversationsPinRequest {
  conversationId: string
  pinned: boolean
}

export interface ConversationsReorderPinnedRequest {
  spaceId: string
  orderedConversationIds: string[]
}

export interface ConversationsMoveToSpaceRequest {
  conversationId: string
  spaceId: string
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

export interface SpaceSummary {
  id: string
  name: string
  color: string | null
  icon: string | null
  sortOrder: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface ConversationSummary {
  id: string
  title: string | null
  model: string
  providerId: string
  pinned: boolean
  spaceId: string
  pinnedOrder: number | null
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
export type SpacesListResponse = SpaceSummary[]
export type SpacesCreateResponse = SpaceSummary
export type SpacesUpdateResponse = SpaceSummary
export type SpacesReorderResponse = void
export type ConversationsListResponse = ConversationSummary[]
export type ConversationsCreateResponse = ConversationSummary
export type ConversationsPinResponse = ConversationSummary
export type ConversationsReorderPinnedResponse = void
export type ConversationsMoveToSpaceResponse = ConversationSummary
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
  spaces: {
    list: () => Promise<SpacesListResponse>
    create: (input: SpacesCreateRequest) => Promise<SpacesCreateResponse>
    update: (input: SpacesUpdateRequest) => Promise<SpacesUpdateResponse>
    reorder: (input: SpacesReorderRequest) => Promise<SpacesReorderResponse>
  }
  conversations: {
    list: () => Promise<ConversationsListResponse>
    create: (input?: ConversationsCreateRequest) => Promise<ConversationsCreateResponse>
    pin: (input: ConversationsPinRequest) => Promise<ConversationsPinResponse>
    reorderPinned: (
      input: ConversationsReorderPinnedRequest
    ) => Promise<ConversationsReorderPinnedResponse>
    moveToSpace: (
      input: ConversationsMoveToSpaceRequest
    ) => Promise<ConversationsMoveToSpaceResponse>
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
