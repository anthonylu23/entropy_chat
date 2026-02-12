import type { Database } from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { ipcMain } from 'electron'
import { getDatabase } from '@electron/db/bootstrap'
import { IPC_CHANNELS } from '@electron/ipc/channels'
import type {
  ChatMessage,
  ChatRole,
  ConversationSummary,
  ConversationsCreateRequest
} from '@shared/types'
import {
  validateConversationsCreateRequest,
  validateMessagesListByConversationRequest
} from '@shared/validators'

const DEFAULT_PROVIDER_ID = 'openai'
const DEFAULT_MODEL = 'gpt-4o-mini'

interface ConversationRow {
  id: string
  title: string | null
  model: string
  provider_id: string
  pinned: number
  created_at: string
  updated_at: string
}

interface MessageRow {
  id: string
  conversation_id: string
  role: ChatRole
  content: string
  model: string | null
  tokens_used: number | null
  created_at: string
}

export interface InsertMessageInput {
  id?: string
  conversationId: string
  role: ChatRole
  content: string
  model?: string | null
  tokensUsed?: number | null
}

function mapConversationRow(row: ConversationRow): ConversationSummary {
  return {
    id: row.id,
    title: row.title,
    model: row.model,
    providerId: row.provider_id,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapMessageRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    model: row.model,
    tokensUsed: row.tokens_used,
    createdAt: row.created_at
  }
}

export function assertConversationExists(db: Database, conversationId: string): void {
  const row = db
    .prepare('SELECT id FROM conversations WHERE id = ?')
    .get(conversationId) as { id: string } | undefined

  if (!row) {
    throw new Error(`Conversation not found: ${conversationId}`)
  }
}

export function listConversations(db: Database): ConversationSummary[] {
  const rows = db
    .prepare(
      `
      SELECT id, title, model, provider_id, pinned, created_at, updated_at
      FROM conversations
      ORDER BY updated_at DESC, created_at DESC
      `
    )
    .all() as ConversationRow[]

  return rows.map(mapConversationRow)
}

export function createConversation(
  db: Database,
  input?: ConversationsCreateRequest
): ConversationSummary {
  const id = randomUUID()
  const now = new Date().toISOString()
  const title = input?.title?.trim() || null

  db.prepare(
    `
      INSERT INTO conversations (
        id,
        title,
        model,
        provider_id,
        pinned,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `
  ).run(id, title, DEFAULT_MODEL, DEFAULT_PROVIDER_ID, now, now)

  const row = db
    .prepare(
      `
      SELECT id, title, model, provider_id, pinned, created_at, updated_at
      FROM conversations
      WHERE id = ?
      `
    )
    .get(id) as ConversationRow | undefined

  if (!row) {
    throw new Error('Failed to create conversation.')
  }

  return mapConversationRow(row)
}

export function listMessagesByConversation(
  db: Database,
  conversationId: string
): ChatMessage[] {
  const rows = db
    .prepare(
      `
      SELECT id, conversation_id, role, content, model, tokens_used, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC, rowid ASC
      `
    )
    .all(conversationId) as MessageRow[]

  return rows.map(mapMessageRow)
}

export function touchConversation(db: Database, conversationId: string, model?: string): void {
  const now = new Date().toISOString()

  if (model) {
    db.prepare(
      `
      UPDATE conversations
      SET updated_at = ?, model = ?, provider_id = ?
      WHERE id = ?
      `
    ).run(now, model, DEFAULT_PROVIDER_ID, conversationId)
    return
  }

  db.prepare(
    `
      UPDATE conversations
      SET updated_at = ?
      WHERE id = ?
    `
  ).run(now, conversationId)
}

export function insertMessage(db: Database, input: InsertMessageInput): ChatMessage {
  const messageId = input.id ?? randomUUID()
  const createdAt = new Date().toISOString()
  const normalizedContent = input.content.trim()

  if (normalizedContent.length === 0) {
    throw new Error('Message content cannot be empty.')
  }

  db.prepare(
    `
      INSERT INTO messages (
        id,
        conversation_id,
        role,
        content,
        model,
        tokens_used,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    messageId,
    input.conversationId,
    input.role,
    normalizedContent,
    input.model ?? null,
    input.tokensUsed ?? null,
    createdAt
  )

  const row = db
    .prepare(
      `
      SELECT id, conversation_id, role, content, model, tokens_used, created_at
      FROM messages
      WHERE id = ?
      `
    )
    .get(messageId) as MessageRow | undefined

  if (!row) {
    throw new Error('Failed to persist message.')
  }

  return mapMessageRow(row)
}

export function registerDatabaseHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_LIST, async () => {
    const db = getDatabase()
    return listConversations(db)
  })

  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_CREATE, async (_event, payload: unknown) => {
    validateConversationsCreateRequest(payload)
    const db = getDatabase()
    return createConversation(db, payload)
  })

  ipcMain.handle(IPC_CHANNELS.MESSAGES_LIST_BY_CONVERSATION, async (_event, payload: unknown) => {
    validateMessagesListByConversationRequest(payload)
    const db = getDatabase()
    assertConversationExists(db, payload.conversationId)
    return listMessagesByConversation(db, payload.conversationId)
  })
}
