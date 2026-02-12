import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@electron/ipc/channels'

export function registerSystemHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SYSTEM_PING, async () => 'pong')
}
