import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type EntropyApi } from '@shared/types'
import {
  validateSettingsGetRequest,
  validateSettingsSetRequest
} from '@shared/validators'

const entropyApi: EntropyApi = {
  system: {
    ping: async () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_PING)
  },
  settings: {
    get: async (key: string) => {
      const payload = { key }
      validateSettingsGetRequest(payload)
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, payload)
    },
    set: async (key: string, value: string) => {
      const payload = { key, value }
      validateSettingsSetRequest(payload)
      await ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, payload)
    }
  }
}

contextBridge.exposeInMainWorld('entropy', entropyApi)
