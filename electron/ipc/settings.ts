import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@electron/ipc/channels'
import {
  validateSettingsGetRequest,
  validateSettingsSetRequest
} from '@shared/validators'

const settingsStore = new Map<string, string>()

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (_event, payload: unknown) => {
    validateSettingsGetRequest(payload)
    return settingsStore.get(payload.key) ?? null
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, payload: unknown) => {
    validateSettingsSetRequest(payload)
    settingsStore.set(payload.key, payload.value)
  })
}
