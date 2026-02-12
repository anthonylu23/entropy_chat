import { ipcMain } from 'electron'
import { getDatabase } from '@electron/db/bootstrap'
import { hasOpenAIApiKey, setOpenAIApiKey } from '@electron/db/keystore'
import { IPC_CHANNELS } from '@electron/ipc/channels'
import { validateCredentialsSetOpenAIKeyRequest } from '@shared/validators'

export function registerAuthHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.CREDENTIALS_HAS_OPENAI_KEY, async () => {
    const db = getDatabase()
    return hasOpenAIApiKey(db)
  })

  ipcMain.handle(IPC_CHANNELS.CREDENTIALS_SET_OPENAI_KEY, async (_event, payload: unknown) => {
    validateCredentialsSetOpenAIKeyRequest(payload)
    const db = getDatabase()
    setOpenAIApiKey(db, payload.apiKey)
  })
}
