import { readFileSync } from 'node:fs'
import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'

const MIGRATION_001_SQL = readFileSync(
  new URL('../../electron/db/migrations/001_init.sql', import.meta.url),
  'utf8'
)
const MIGRATION_002_SQL = readFileSync(
  new URL('../../electron/db/migrations/002_spaces_layout.sql', import.meta.url),
  'utf8'
)

function createInMemoryDb(): Database {
  const db = new Database(':memory:')
  db.exec('PRAGMA foreign_keys = ON;')
  return db
}

describe('electron/db migrations', () => {
  test('applies 002 upgrade with default space backfill and deterministic pinned order', () => {
    const db = createInMemoryDb()
    try {
      db.exec(MIGRATION_001_SQL)

      db.exec(`
        INSERT INTO conversations (id, title, model, provider_id, pinned, created_at, updated_at) VALUES
          ('p2', 'Pinned 2', 'gpt-4o-mini', 'openai', 1, '2026-01-01T10:00:00.000Z', '2026-01-05T10:00:00.000Z'),
          ('u1', 'Unpinned', 'gpt-4o-mini', 'openai', 0, '2026-01-01T09:00:00.000Z', '2026-01-06T10:00:00.000Z'),
          ('p3', 'Pinned 3', 'gpt-4o-mini', 'openai', 1, '2026-01-01T08:00:00.000Z', '2026-01-04T10:00:00.000Z'),
          ('p1', 'Pinned 1', 'gpt-4o-mini', 'openai', 1, '2026-01-01T10:00:00.000Z', '2026-01-05T10:00:00.000Z');
      `)

      db.exec(`
        INSERT INTO messages (id, conversation_id, role, content, model, tokens_used, created_at) VALUES
          ('m1', 'p2', 'user', 'hello p2', 'gpt-4o-mini', NULL, '2026-01-07T00:00:00.000Z'),
          ('m2', 'u1', 'user', 'hello u1', 'gpt-4o-mini', NULL, '2026-01-07T00:00:00.000Z'),
          ('m3', 'p3', 'user', 'hello p3', 'gpt-4o-mini', NULL, '2026-01-07T00:00:00.000Z'),
          ('m4', 'p1', 'user', 'hello p1', 'gpt-4o-mini', NULL, '2026-01-07T00:00:00.000Z');
      `)

      db.exec(MIGRATION_002_SQL)

      const defaultSpace = db
        .query(
          `
            SELECT id, name, is_default, sort_order
            FROM spaces
            WHERE id = 'space_general'
          `
        )
        .get() as
        | { id: string; name: string; is_default: number; sort_order: number }
        | null

      expect(defaultSpace).not.toBeNull()
      expect(defaultSpace?.id).toBe('space_general')
      expect(defaultSpace?.name).toBe('General')
      expect(defaultSpace?.is_default).toBe(1)
      expect(defaultSpace?.sort_order).toBe(0)

      const allConversationSpaces = db
        .query(`SELECT DISTINCT space_id FROM conversations`)
        .all() as Array<{ space_id: string }>
      expect(allConversationSpaces).toEqual([{ space_id: 'space_general' }])

      const pinned = db
        .query(
          `
            SELECT id, pinned_order
            FROM conversations
            WHERE pinned = 1
            ORDER BY pinned_order ASC
          `
        )
        .all() as Array<{ id: string; pinned_order: number }>
      expect(pinned).toEqual([
        { id: 'p1', pinned_order: 1 },
        { id: 'p2', pinned_order: 2 },
        { id: 'p3', pinned_order: 3 }
      ])

      const unpinned = db
        .query(`SELECT id, pinned_order FROM conversations WHERE pinned = 0`)
        .all() as Array<{ id: string; pinned_order: number | null }>
      expect(unpinned).toEqual([{ id: 'u1', pinned_order: null }])

      const messages = db
        .query(`SELECT id, conversation_id FROM messages ORDER BY id ASC`)
        .all() as Array<{ id: string; conversation_id: string }>
      expect(messages).toEqual([
        { id: 'm1', conversation_id: 'p2' },
        { id: 'm2', conversation_id: 'u1' },
        { id: 'm3', conversation_id: 'p3' },
        { id: 'm4', conversation_id: 'p1' }
      ])

      const fkIssues = db.query('PRAGMA foreign_key_check').all()
      expect(fkIssues.length).toBe(0)
    } finally {
      db.close()
    }
  })

  test('creates expected indexes and foreign keys after applying 002', () => {
    const db = createInMemoryDb()
    try {
      db.exec(MIGRATION_001_SQL)
      db.exec(MIGRATION_002_SQL)

      const conversationFks = db
        .query(`PRAGMA foreign_key_list('conversations')`)
        .all() as Array<{ table: string; from: string; to: string }>
      expect(
        conversationFks.some((fk) => fk.table === 'spaces' && fk.from === 'space_id' && fk.to === 'id')
      ).toBeTrue()

      const spacesIndexes = db
        .query(`PRAGMA index_list('spaces')`)
        .all() as Array<{ name: string }>
      expect(spacesIndexes.some((index) => index.name === 'idx_spaces_sort_order')).toBeTrue()

      const conversationIndexes = db
        .query(`PRAGMA index_list('conversations')`)
        .all() as Array<{ name: string }>
      expect(
        conversationIndexes.some((index) => index.name === 'idx_conversations_updated_at')
      ).toBeTrue()
      expect(
        conversationIndexes.some((index) => index.name === 'idx_conversations_space_updated')
      ).toBeTrue()
      expect(
        conversationIndexes.some((index) => index.name === 'idx_conversations_space_pinned_order')
      ).toBeTrue()

      const messageIndexes = db
        .query(`PRAGMA index_list('messages')`)
        .all() as Array<{ name: string }>
      expect(
        messageIndexes.some((index) => index.name === 'idx_messages_conversation_created_at')
      ).toBeTrue()
    } finally {
      db.close()
    }
  })

  test('keeps Slice 1 conversation inserts working via space_id default', () => {
    const db = createInMemoryDb()
    try {
      db.exec(MIGRATION_001_SQL)
      db.exec(MIGRATION_002_SQL)

      db.exec(`
        INSERT INTO conversations (
          id,
          title,
          model,
          provider_id,
          pinned,
          created_at,
          updated_at
        )
        VALUES (
          'compat_conv',
          'Compat',
          'gpt-4o-mini',
          'openai',
          0,
          '2026-01-08T00:00:00.000Z',
          '2026-01-08T00:00:00.000Z'
        );
      `)

      const row = db
        .query(`SELECT id, space_id, pinned_order FROM conversations WHERE id = 'compat_conv'`)
        .get() as { id: string; space_id: string; pinned_order: number | null } | null

      expect(row).not.toBeNull()
      expect(row?.space_id).toBe('space_general')
      expect(row?.pinned_order).toBeNull()
    } finally {
      db.close()
    }
  })
})
