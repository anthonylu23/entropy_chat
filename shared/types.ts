export const IPC_CHANNELS = {
  SYSTEM_PING: 'system:ping',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

export interface SettingsGetRequest {
  key: string
}

export interface SettingsSetRequest {
  key: string
  value: string
}

export type SettingsGetResponse = string | null
export type SettingsSetResponse = void
export type SystemPingResponse = string

export interface EntropyApi {
  system: {
    ping: () => Promise<SystemPingResponse>
  }
  settings: {
    get: (key: string) => Promise<SettingsGetResponse>
    set: (key: string, value: string) => Promise<SettingsSetResponse>
  }
}
