import { ipcMain } from 'electron'
import { getDatabase } from '@electron/db/bootstrap'
import { IPC_CHANNELS } from '@electron/ipc/channels'
import {
  validateSettingsGetRequest,
  validateSettingsSetRequest
} from '@shared/validators'

interface SettingRow {
  value: string | null
}

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (_event, payload: unknown) => {
    validateSettingsGetRequest(payload)
    const db = getDatabase()
    const row = db
      .prepare(
        `
          SELECT value
          FROM settings
          WHERE key = ?
        `
      )
      .get(payload.key) as SettingRow | undefined
    return row?.value ?? null
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, payload: unknown) => {
    validateSettingsSetRequest(payload)
    const db = getDatabase()
    const now = new Date().toISOString()
    db.prepare(
      `
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `
    ).run(payload.key, payload.value, now)
  })
}
