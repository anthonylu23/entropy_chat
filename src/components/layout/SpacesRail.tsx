import { useState, type FormEvent } from 'react'
import type { SpaceSummary } from '@shared/types'
import { SPACE_NAME_MAX_LENGTH, SPACE_NAME_MIN_LENGTH } from '@shared/constants'
import { cn } from '@renderer/lib/utils'
import { Layers, Plus, Pencil, ArrowUp, ArrowDown } from 'lucide-react'

interface SpacesRailProps {
  spaces: SpaceSummary[]
  activeSpaceId: string
  onSelectSpace: (spaceId: string) => void
  onCreateSpace: (name: string) => Promise<void> | void
  onRenameSpace: (spaceId: string, name: string) => Promise<void> | void
  onReorderSpaces: (orderedSpaceIds: string[]) => void
}

function getSpaceMonogram(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed[0]!.toUpperCase()
}

export function SpacesRail({
  spaces,
  activeSpaceId,
  onSelectSpace,
  onCreateSpace,
  onRenameSpace,
  onReorderSpaces,
}: SpacesRailProps) {
  const [editorMode, setEditorMode] = useState<'create' | 'rename' | null>(null)
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null)
  const [editorSeed, setEditorSeed] = useState('')
  const [editorError, setEditorError] = useState<string | null>(null)
  const [editorSubmitting, setEditorSubmitting] = useState(false)
  const activeIndex = spaces.findIndex((space) => space.id === activeSpaceId)

  const closeEditor = () => {
    setEditorMode(null)
    setEditingSpaceId(null)
    setEditorSeed('')
    setEditorError(null)
    setEditorSubmitting(false)
  }

  const openCreateEditor = () => {
    setEditorMode('create')
    setEditingSpaceId(null)
    setEditorSeed('')
    setEditorError(null)
  }

  const openRenameEditor = (space: SpaceSummary) => {
    setEditorMode('rename')
    setEditingSpaceId(space.id)
    setEditorSeed(space.name)
    setEditorError(null)
  }

  const getEditorFailureMessage = (error: unknown): string => {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message
    }

    return 'Unable to save space name. Please try again.'
  }

  const handleSubmitEditor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const input = event.currentTarget.elements.namedItem('spaceName')
    const rawName = input instanceof HTMLInputElement ? input.value : ''
    const normalized = rawName.trim()
    if (!normalized) {
      setEditorError('Space name is required.')
      return
    }
    if (
      normalized.length < SPACE_NAME_MIN_LENGTH ||
      normalized.length > SPACE_NAME_MAX_LENGTH
    ) {
      setEditorError(
        `Space name must be between ${SPACE_NAME_MIN_LENGTH} and ${SPACE_NAME_MAX_LENGTH} characters.`
      )
      return
    }

    try {
      setEditorSubmitting(true)
      setEditorError(null)

      if (editorMode === 'create') {
        await Promise.resolve(onCreateSpace(normalized))
        closeEditor()
        return
      }

      if (editorMode === 'rename' && editingSpaceId) {
        const targetSpace = spaces.find((space) => space.id === editingSpaceId)
        if (targetSpace && targetSpace.name !== normalized) {
          await Promise.resolve(onRenameSpace(editingSpaceId, normalized))
        }
        closeEditor()
      }
    } catch (error) {
      setEditorError(getEditorFailureMessage(error))
    } finally {
      setEditorSubmitting(false)
    }
  }

  const moveActiveSpace = (direction: 'up' | 'down') => {
    if (activeIndex < 0) return
    const targetIndex = direction === 'up' ? activeIndex - 1 : activeIndex + 1
    if (targetIndex < 0 || targetIndex >= spaces.length) return

    const orderedIds = spaces.map((space) => space.id)
    const [moved] = orderedIds.splice(activeIndex, 1)
    orderedIds.splice(targetIndex, 0, moved!)
    onReorderSpaces(orderedIds)
  }

  return (
    <aside className="relative flex h-full w-20 shrink-0 flex-col items-center gap-3 border-r border-border bg-surface-1 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-2 text-primary">
        <Layers className="h-5 w-5" />
      </div>
      <button
        type="button"
        onClick={openCreateEditor}
        disabled={editorSubmitting}
        title="Create space"
        aria-label="Create space"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-2 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-surface-3 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
      </button>
      <div className="flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto pb-2">
        {spaces.map((space, index) => {
          const active = space.id === activeSpaceId
          return (
            <button
              key={space.id}
              type="button"
              disabled={editorSubmitting}
              onClick={() => onSelectSpace(space.id)}
              onDoubleClick={() => openRenameEditor(space)}
              className={cn(
                'group relative flex h-12 w-12 items-center justify-center rounded-2xl border text-xs font-semibold transition-all',
                active
                  ? 'border-primary/70 bg-primary/15 text-primary'
                  : 'border-border bg-surface-2 text-muted-foreground hover:border-primary/40 hover:bg-surface-3 hover:text-foreground',
                editorSubmitting && 'cursor-not-allowed opacity-60'
              )}
              title={`${space.name} (${index + 1})`}
              aria-label={`Switch to ${space.name}`}
            >
              {getSpaceMonogram(space.name)}
            </button>
          )
        })}
      </div>
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => moveActiveSpace('up')}
          disabled={activeIndex <= 0 || editorSubmitting}
          title="Move active space up"
          aria-label="Move active space up"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => moveActiveSpace('down')}
          disabled={activeIndex < 0 || activeIndex >= spaces.length - 1 || editorSubmitting}
          title="Move active space down"
          aria-label="Move active space down"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        {activeIndex >= 0 && (
          <button
            type="button"
            disabled={editorSubmitting}
            onClick={() => openRenameEditor(spaces[activeIndex]!)}
            title="Rename active space"
            aria-label="Rename active space"
            className="mt-1 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {editorMode && (
        <form
          className="absolute bottom-3 left-full z-20 ml-2 w-52 rounded-lg border border-border bg-surface-1 p-2"
          onSubmit={handleSubmitEditor}
        >
          <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {editorMode === 'create' ? 'New Space' : 'Rename Space'}
          </p>
          <input
            autoFocus
            name="spaceName"
            defaultValue={editorSeed}
            key={`${editorMode}-${editingSpaceId ?? 'new'}`}
            aria-label={editorMode === 'create' ? 'New space name' : 'Rename space name'}
            maxLength={SPACE_NAME_MAX_LENGTH}
            onInput={() => {
              if (editorError) {
                setEditorError(null)
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                closeEditor()
              }
            }}
            className="h-8 w-full rounded-md border border-border bg-surface-2 px-2 text-xs text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-primary/60"
            placeholder={editorMode === 'create' ? 'Space name' : 'Rename space'}
          />
          {editorError && (
            <p role="alert" className="mt-2 text-[11px] text-destructive-foreground">
              {editorError}
            </p>
          )}
          <div className="mt-2 flex items-center justify-end gap-1">
            <button
              type="button"
              disabled={editorSubmitting}
              onClick={closeEditor}
              className="h-7 rounded-md border border-border px-2 text-[11px] text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editorSubmitting}
              className="h-7 rounded-md border border-primary/60 bg-primary/15 px-2 text-[11px] text-foreground transition-colors hover:bg-primary/25"
            >
              {editorSubmitting ? 'Saving...' : editorMode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </aside>
  )
}
