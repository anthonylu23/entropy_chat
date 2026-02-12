import { describe, expect, test } from 'bun:test'
import {
  validateChatStreamCancelRequest,
  validateChatStreamDeltaEvent,
  validateChatStreamDoneEvent,
  validateChatStreamErrorEvent,
  validateChatStreamStartInput,
  validateConversationsCreateRequest,
  validateCredentialsSetOpenAIKeyRequest,
  validateMessagesListByConversationRequest,
  validateSettingsGetRequest,
  validateSettingsSetRequest
} from '../../shared/validators'

type Validator = (value: unknown) => void

function expectValid(validator: Validator, value: unknown): void {
  expect(() => validator(value)).not.toThrow()
}

function expectInvalid(validator: Validator, value: unknown, message: string): void {
  expect(() => validator(value)).toThrow(message)
}

describe('shared/validators', () => {
  test('validates settings.get payloads', () => {
    expectValid(validateSettingsGetRequest, { key: 'theme' })
    expectInvalid(validateSettingsGetRequest, { key: '' }, 'Invalid settings.get payload')
    expectInvalid(validateSettingsGetRequest, null, 'Invalid settings.get payload')
  })

  test('validates settings.set payloads', () => {
    expectValid(validateSettingsSetRequest, { key: 'model', value: 'gpt-4o-mini' })
    expectInvalid(validateSettingsSetRequest, { key: 'model' }, 'Invalid settings.set payload')
    expectInvalid(
      validateSettingsSetRequest,
      { key: 'model', value: 3 },
      'Invalid settings.set payload'
    )
  })

  test('validates credentials.setOpenAIKey payloads', () => {
    expectValid(validateCredentialsSetOpenAIKeyRequest, { apiKey: 'sk-test' })
    expectInvalid(
      validateCredentialsSetOpenAIKeyRequest,
      { apiKey: '   ' },
      'Invalid credentials.setOpenAIKey payload'
    )
  })

  test('validates conversations.create payloads', () => {
    expectValid(validateConversationsCreateRequest, undefined)
    expectValid(validateConversationsCreateRequest, {})
    expectValid(validateConversationsCreateRequest, { title: 'New chat' })
    expectInvalid(
      validateConversationsCreateRequest,
      { title: '' },
      'Invalid conversations.create payload'
    )
  })

  test('validates messages.listByConversation payloads', () => {
    expectValid(validateMessagesListByConversationRequest, { conversationId: 'conv_123' })
    expectInvalid(
      validateMessagesListByConversationRequest,
      { conversationId: '' },
      'Invalid messages.listByConversation payload'
    )
  })

  test('validates chat.stream.start payloads', () => {
    expectValid(validateChatStreamStartInput, {
      conversationId: 'conv_123',
      prompt: 'Hello'
    })
    expectValid(validateChatStreamStartInput, {
      conversationId: 'conv_123',
      prompt: 'Hello',
      model: 'gpt-4o-mini'
    })
    expectInvalid(
      validateChatStreamStartInput,
      { conversationId: 'conv_123', prompt: '', model: 'gpt-4o-mini' },
      'Invalid chat.stream.start payload'
    )
  })

  test('validates chat.stream.cancel payloads', () => {
    expectValid(validateChatStreamCancelRequest, { requestId: 'req_123' })
    expectInvalid(
      validateChatStreamCancelRequest,
      { requestId: '' },
      'Invalid chat.stream.cancel payload'
    )
  })

  test('validates chat.stream.delta payloads', () => {
    expectValid(validateChatStreamDeltaEvent, {
      requestId: 'req_123',
      conversationId: 'conv_123',
      delta: ''
    })
    expectInvalid(
      validateChatStreamDeltaEvent,
      { requestId: 'req_123', conversationId: 'conv_123', delta: 1 },
      'Invalid chat.stream.delta payload'
    )
  })

  test('validates chat.stream.done payloads', () => {
    expectValid(validateChatStreamDoneEvent, {
      requestId: 'req_123',
      conversationId: 'conv_123',
      messageId: null,
      cancelled: false
    })
    expectValid(validateChatStreamDoneEvent, {
      requestId: 'req_123',
      conversationId: 'conv_123',
      messageId: 'msg_123',
      cancelled: true
    })
    expectInvalid(
      validateChatStreamDoneEvent,
      { requestId: 'req_123', conversationId: 'conv_123', messageId: '', cancelled: false },
      'Invalid chat.stream.done payload'
    )
  })

  test('validates chat.stream.error payloads', () => {
    expectValid(validateChatStreamErrorEvent, {
      requestId: 'req_123',
      conversationId: 'conv_123',
      error: 'rate limited'
    })
    expectInvalid(
      validateChatStreamErrorEvent,
      { requestId: 'req_123', conversationId: 'conv_123', error: '' },
      'Invalid chat.stream.error payload'
    )
  })
})
