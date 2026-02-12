import { useEffect, useState, useCallback } from 'react'
import { getEntropyApi } from '@renderer/lib/ipc'
import { AppShell } from '@renderer/components/layout/AppShell'
import { ApiKeyCard } from '@renderer/components/settings/ApiKeyCard'

type AppState = 'loading' | 'needs-key' | 'ready'
const BRIDGE_RETRY_ATTEMPTS = 30
const BRIDGE_RETRY_DELAY_MS = 100

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading')
  const [error, setError] = useState<string | null>(null)

  const checkKey = useCallback(async () => {
    let entropy = getEntropyApi()
    for (let attempt = 0; !entropy && attempt < BRIDGE_RETRY_ATTEMPTS; attempt += 1) {
      await sleep(BRIDGE_RETRY_DELAY_MS)
      entropy = getEntropyApi()
    }
    if (!entropy) {
      setError(
        'Preload bridge not available. Make sure the app is launched through Electron (bun run dev / bun run preview).'
      )
      return
    }
    try {
      const hasKey = await entropy.credentials.hasOpenAIKey()
      setAppState(hasKey ? 'ready' : 'needs-key')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check API key')
      setAppState('needs-key')
    }
  }, [])

  useEffect(() => {
    void checkKey()
  }, [checkKey])

  const handleKeySaved = useCallback(() => {
    setAppState('ready')
  }, [])

  if (error && appState === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-destructive">{error}</p>
      </main>
    )
  }

  if (appState === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    )
  }

  if (appState === 'needs-key') {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <ApiKeyCard onKeySaved={handleKeySaved} />
      </main>
    )
  }

  return <AppShell />
}
