import { safeStorage } from 'electron'
import type { Database } from 'better-sqlite3'

const OPENAI_PROVIDER_ID = 'openai'
const OPENAI_PROVIDER_NAME = 'openai'
const OPENAI_AUTH_TIER = 'api_key'

interface ProviderCredentialRow {
  credentials_encrypted: Buffer | null
}

interface OpenAICredentialPayload {
  apiKey: string
}

export class SafeStorageUnavailableError extends Error {
  constructor() {
    super(
      'OS-level encryption is unavailable (Electron safeStorage.isEncryptionAvailable() returned false).'
    )
    this.name = 'SafeStorageUnavailableError'
  }
}

function assertSafeStorageAvailable(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new SafeStorageUnavailableError()
  }
}

function parseOpenAICredentialPayload(credentialsEncrypted: Buffer): OpenAICredentialPayload {
  const payload = JSON.parse(decryptSecret(credentialsEncrypted)) as OpenAICredentialPayload
  if (typeof payload.apiKey !== 'string' || payload.apiKey.trim().length === 0) {
    throw new Error('Stored OpenAI credentials are invalid.')
  }
  return payload
}

export function encryptSecret(value: string): Buffer {
  if (value.trim().length === 0) {
    throw new Error('Cannot encrypt an empty secret.')
  }

  assertSafeStorageAvailable()
  return safeStorage.encryptString(value)
}

export function decryptSecret(value: Buffer): string {
  if (!Buffer.isBuffer(value) || value.length === 0) {
    throw new Error('Encrypted secret must be a non-empty Buffer.')
  }

  assertSafeStorageAvailable()
  return safeStorage.decryptString(value)
}

export function setOpenAIApiKey(db: Database, apiKey: string): void {
  const normalizedApiKey = apiKey.trim()
  if (normalizedApiKey.length === 0) {
    throw new Error('OpenAI API key cannot be empty.')
  }

  const encryptedPayload = encryptSecret(JSON.stringify({ apiKey: normalizedApiKey }))
  const now = new Date().toISOString()

  db.prepare(
    `
      INSERT INTO providers (
        id,
        name,
        auth_tier,
        credentials_encrypted,
        is_active,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @name,
        @authTier,
        @credentialsEncrypted,
        1,
        @now,
        @now
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        auth_tier = excluded.auth_tier,
        credentials_encrypted = excluded.credentials_encrypted,
        is_active = 1,
        updated_at = excluded.updated_at
    `
  ).run({
    id: OPENAI_PROVIDER_ID,
    name: OPENAI_PROVIDER_NAME,
    authTier: OPENAI_AUTH_TIER,
    credentialsEncrypted: encryptedPayload,
    now
  })
}

export function hasOpenAIApiKey(db: Database): boolean {
  const row = db
    .prepare(
      `
        SELECT credentials_encrypted
        FROM providers
        WHERE id = ?
      `
    )
    .get(OPENAI_PROVIDER_ID) as ProviderCredentialRow | undefined

  if (!row?.credentials_encrypted || row.credentials_encrypted.length === 0) {
    return false
  }

  try {
    parseOpenAICredentialPayload(row.credentials_encrypted)
    return true
  } catch (error) {
    if (error instanceof SafeStorageUnavailableError) {
      throw error
    }
    return false
  }
}

export function getOpenAIApiKey(db: Database): string | null {
  const row = db
    .prepare(
      `
        SELECT credentials_encrypted
        FROM providers
        WHERE id = ?
      `
    )
    .get(OPENAI_PROVIDER_ID) as ProviderCredentialRow | undefined

  if (!row?.credentials_encrypted) {
    return null
  }

  try {
    return parseOpenAICredentialPayload(row.credentials_encrypted).apiKey
  } catch (error) {
    throw new Error(`Failed to decrypt stored OpenAI credentials: ${(error as Error).message}`)
  }
}
