import { useState, type FormEvent } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { getEntropyApi } from '@renderer/lib/ipc'

interface ApiKeyCardProps {
  onKeySaved: () => void
}

export function ApiKeyCard({ onKeySaved }: ApiKeyCardProps) {
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const entropy = getEntropyApi()
    if (!entropy) return

    setSaving(true)
    setError(null)

    try {
      await entropy.credentials.setOpenAIKey(apiKey)
      onKeySaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome to Entropy Chat</CardTitle>
        <CardDescription>
          Enter your OpenAI API key to get started. Your key is encrypted and
          stored locally.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={saving}
          />
          <Button type="submit" disabled={saving || apiKey.trim().length === 0}>
            {saving ? 'Saving...' : 'Save Key'}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  )
}
