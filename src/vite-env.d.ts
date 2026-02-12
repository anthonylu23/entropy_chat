/// <reference types="vite/client" />

import type { EntropyApi } from '@shared/types'

declare global {
  interface Window {
    entropy?: EntropyApi
  }
}

export {}
