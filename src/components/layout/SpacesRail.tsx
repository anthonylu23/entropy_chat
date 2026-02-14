import type { SpaceSummary } from '@shared/types'
import { cn } from '@renderer/lib/utils'
import { Layers, Plus, Pencil, ArrowUp, ArrowDown } from 'lucide-react'

interface SpacesRailProps {
  spaces: SpaceSummary[]
  activeSpaceId: string
  onSelectSpace: (spaceId: string) => void
  onCreateSpace: (name: string) => void
  onRenameSpace: (spaceId: string, name: string) => void
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
  const activeIndex = spaces.findIndex((space) => space.id === activeSpaceId)

  const handleCreateSpace = () => {
    const nextName = window.prompt('New space name')
    if (!nextName) return
    const normalized = nextName.trim()
    if (!normalized) return
    onCreateSpace(normalized)
  }

  const handleRenameSpace = (space: SpaceSummary) => {
    const nextName = window.prompt('Rename space', space.name)
    if (!nextName) return
    const normalized = nextName.trim()
    if (!normalized || normalized === space.name) return
    onRenameSpace(space.id, normalized)
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
    <aside className="flex h-full w-20 shrink-0 flex-col items-center gap-3 border-r border-border/70 bg-black/15 p-3 backdrop-blur-lg">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-black/25 text-primary shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
        <Layers className="h-5 w-5" />
      </div>
      <button
        type="button"
        onClick={handleCreateSpace}
        title="Create space"
        aria-label="Create space"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-black/20 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
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
              onClick={() => onSelectSpace(space.id)}
              onDoubleClick={() => handleRenameSpace(space)}
              className={cn(
                'group relative flex h-12 w-12 items-center justify-center rounded-2xl border text-xs font-semibold transition-all',
                active
                  ? 'border-primary/70 bg-primary/20 text-primary shadow-[0_10px_24px_rgba(0,184,169,0.25)]'
                  : 'border-border/70 bg-black/20 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-foreground'
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
          disabled={activeIndex <= 0}
          title="Move active space up"
          aria-label="Move active space up"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-black/20 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => moveActiveSpace('down')}
          disabled={activeIndex < 0 || activeIndex >= spaces.length - 1}
          title="Move active space down"
          aria-label="Move active space down"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-black/20 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        {activeIndex >= 0 && (
          <button
            type="button"
            onClick={() => handleRenameSpace(spaces[activeIndex]!)}
            title="Rename active space"
            aria-label="Rename active space"
            className="mt-1 flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-black/20 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </aside>
  )
}
