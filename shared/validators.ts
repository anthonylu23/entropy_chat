import type {
  ChatStreamCancelRequest,
  ChatStreamDeltaEvent,
  ChatStreamDoneEvent,
  ChatStreamErrorEvent,
  ChatStreamStartInput,
  ConversationsCreateRequest,
  CredentialsSetOpenAIKeyRequest,
  MessagesListByConversationRequest,
  SettingsGetRequest,
  SettingsSetRequest
} from '@shared/types'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

export function validateSettingsGetRequest(value: unknown): asserts value is SettingsGetRequest {
  if (!isObject(value) || !isNonEmptyString((value as { key?: unknown }).key)) {
    throw new Error('Invalid settings.get payload')
  }
}

export function validateSettingsSetRequest(value: unknown): asserts value is SettingsSetRequest {
  if (!isObject(value)) {
    throw new Error('Invalid settings.set payload')
  }

  const candidate = value as { key?: unknown; value?: unknown }
  if (!isNonEmptyString(candidate.key) || typeof candidate.value !== 'string') {
    throw new Error('Invalid settings.set payload')
  }
}

export function validateCredentialsSetOpenAIKeyRequest(
  value: unknown
): asserts value is CredentialsSetOpenAIKeyRequest {
  if (!isObject(value) || !isNonEmptyString((value as { apiKey?: unknown }).apiKey)) {
    throw new Error('Invalid credentials.setOpenAIKey payload')
  }
}

export function validateConversationsCreateRequest(
  value: unknown
): asserts value is ConversationsCreateRequest {
  if (value === undefined) {
    return
  }

  if (!isObject(value)) {
    throw new Error('Invalid conversations.create payload')
  }

  const title = (value as { title?: unknown }).title
  if (title !== undefined && !isNonEmptyString(title)) {
    throw new Error('Invalid conversations.create payload')
  }
}

export function validateMessagesListByConversationRequest(
  value: unknown
): asserts value is MessagesListByConversationRequest {
  if (
    !isObject(value) ||
    !isNonEmptyString((value as { conversationId?: unknown }).conversationId)
  ) {
    throw new Error('Invalid messages.listByConversation payload')
  }
}

export function validateChatStreamStartInput(
  value: unknown
): asserts value is ChatStreamStartInput {
  if (!isObject(value)) {
    throw new Error('Invalid chat.stream.start payload')
  }

  const candidate = value as { conversationId?: unknown; prompt?: unknown; model?: unknown }
  if (
    !isNonEmptyString(candidate.conversationId) ||
    !isNonEmptyString(candidate.prompt) ||
    (candidate.model !== undefined && !isNonEmptyString(candidate.model))
  ) {
    throw new Error('Invalid chat.stream.start payload')
  }
}

export function validateChatStreamCancelRequest(
  value: unknown
): asserts value is ChatStreamCancelRequest {
  if (!isObject(value) || !isNonEmptyString((value as { requestId?: unknown }).requestId)) {
    throw new Error('Invalid chat.stream.cancel payload')
  }
}

export function validateChatStreamDeltaEvent(
  value: unknown
): asserts value is ChatStreamDeltaEvent {
  if (!isObject(value)) {
    throw new Error('Invalid chat.stream.delta payload')
  }

  const candidate = value as {
    requestId?: unknown
    conversationId?: unknown
    delta?: unknown
  }

  if (
    !isNonEmptyString(candidate.requestId) ||
    !isNonEmptyString(candidate.conversationId) ||
    typeof candidate.delta !== 'string'
  ) {
    throw new Error('Invalid chat.stream.delta payload')
  }
}

export function validateChatStreamDoneEvent(
  value: unknown
): asserts value is ChatStreamDoneEvent {
  if (!isObject(value)) {
    throw new Error('Invalid chat.stream.done payload')
  }

  const candidate = value as {
    requestId?: unknown
    conversationId?: unknown
    messageId?: unknown
    cancelled?: unknown
  }

  const messageIdIsValid =
    candidate.messageId === null ||
    isNonEmptyString(candidate.messageId)

  if (
    !isNonEmptyString(candidate.requestId) ||
    !isNonEmptyString(candidate.conversationId) ||
    !messageIdIsValid ||
    typeof candidate.cancelled !== 'boolean'
  ) {
    throw new Error('Invalid chat.stream.done payload')
  }
}

export function validateChatStreamErrorEvent(
  value: unknown
): asserts value is ChatStreamErrorEvent {
  if (!isObject(value)) {
    throw new Error('Invalid chat.stream.error payload')
  }

  const candidate = value as {
    requestId?: unknown
    conversationId?: unknown
    error?: unknown
  }

  if (
    !isNonEmptyString(candidate.requestId) ||
    !isNonEmptyString(candidate.conversationId) ||
    !isNonEmptyString(candidate.error)
  ) {
    throw new Error('Invalid chat.stream.error payload')
  }
}
