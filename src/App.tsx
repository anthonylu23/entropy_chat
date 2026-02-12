import { FormEvent, useEffect, useState } from 'react'
import { getEntropyApi } from '@renderer/lib/ipc'
import { APP_NAME } from '@shared/constants'

const SETTINGS_KEY = 'smoke.key'

export default function App(): JSX.Element {
  const [pingStatus, setPingStatus] = useState('loading...')
  const [valueInput, setValueInput] = useState('')
  const [storedValue, setStoredValue] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const entropy = getEntropyApi()
    if (!entropy) {
      setError('Preload bridge not available')
      return
    }

    void entropy.system
      .ping()
      .then(setPingStatus)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to ping main process')
      })

    void entropy.settings
      .get(SETTINGS_KEY)
      .then((value) => {
        setStoredValue(value)
        setValueInput(value ?? '')
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to read setting')
      })
  }, [])

  const onSave = async (event: FormEvent) => {
    event.preventDefault()
    const entropy = getEntropyApi()
    if (!entropy) {
      setError('Preload bridge not available')
      return
    }

    setError(null)
    try {
      await entropy.settings.set(SETTINGS_KEY, valueInput)
      const refreshedValue = await entropy.settings.get(SETTINGS_KEY)
      setStoredValue(refreshedValue)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save setting')
    }
  }

  return (
    <main className="app">
      <section className="card">
        <h1>{APP_NAME} Foundation</h1>
        <p className="muted">System ping: {pingStatus}</p>
      </section>

      <section className="card">
        <h2>IPC Settings Smoke Test</h2>
        <form onSubmit={onSave}>
          <label htmlFor="settingsValue">Value</label>
          <input
            id="settingsValue"
            value={valueInput}
            onChange={(event) => setValueInput(event.target.value)}
            placeholder="Enter any value"
          />
          <button type="submit">Save and Reload</button>
        </form>
        <p className="muted">Stored value: {storedValue ?? '(null)'}</p>
      </section>

      {error ? <p className="error">Error: {error}</p> : null}
    </main>
  )
}
