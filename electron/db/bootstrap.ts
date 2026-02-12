import BetterSqlite3 from 'better-sqlite3'
import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { MIGRATIONS, TABLES } from '@electron/db/schema'

type SqliteDatabase = InstanceType<typeof BetterSqlite3>

let database: SqliteDatabase | null = null

interface AppliedMigrationRow {
  id: number
}

function ensureMigrationTable(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${TABLES.schemaMigrations} (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

function runPendingMigrations(db: SqliteDatabase): void {
  const rows = db
    .prepare(`SELECT id FROM ${TABLES.schemaMigrations} ORDER BY id ASC`)
    .all() as AppliedMigrationRow[]
  const appliedIds = new Set(rows.map((row) => row.id))

  const recordMigration = db.prepare(
    `INSERT INTO ${TABLES.schemaMigrations} (id, name, applied_at)
     VALUES (@id, @name, datetime('now'))`
  )

  const applyPendingMigrations = db.transaction(() => {
    for (const migration of MIGRATIONS) {
      if (appliedIds.has(migration.id)) {
        continue
      }
      db.exec(migration.sql)
      recordMigration.run({ id: migration.id, name: migration.name })
    }
  })

  applyPendingMigrations()
}

function createDatabaseConnection(): SqliteDatabase {
  const userDataPath = app.getPath('userData')
  mkdirSync(userDataPath, { recursive: true })
  const dbPath = join(userDataPath, 'entropy-chat.sqlite')
  const db = new BetterSqlite3(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function bootstrapDatabase(): void {
  if (database) {
    return
  }

  const db = createDatabaseConnection()
  ensureMigrationTable(db)
  runPendingMigrations(db)
  database = db
}

export function getDatabase(): SqliteDatabase {
  if (!database) {
    throw new Error('Database has not been bootstrapped yet.')
  }
  return database
}
