import { registerAuthHandlers } from '@electron/ipc/auth'
import { registerDatabaseHandlers } from '@electron/ipc/db'
import { registerProviderHandlers } from '@electron/ipc/providers'
import { registerSettingsHandlers } from '@electron/ipc/settings'
import { registerSystemHandlers } from '@electron/ipc/system'

export function registerIpcHandlers(): void {
  registerSystemHandlers()
  registerSettingsHandlers()
  registerDatabaseHandlers()
  registerProviderHandlers()
  registerAuthHandlers()
}
