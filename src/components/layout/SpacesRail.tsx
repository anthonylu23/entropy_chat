import { cn } from '@renderer/lib/utils'
import { Layers } from 'lucide-react'

export interface WorkspaceSpace {
  id: string
  name: string
}

interface SpacesRailProps {
  spaces: WorkspaceSpace[]
  activeSpaceId: string
  onSelectSpace: (spaceId: string) => void
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
}: SpacesRailProps) {
  return (
    <aside className="flex h-full w-20 shrink-0 flex-col items-center gap-4 border-r border-border/70 bg-black/15 p-3 backdrop-blur-lg">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-black/25 text-primary shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
        <Layers className="h-5 w-5" />
      </div>
      <div className="flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto pb-2">
        {spaces.map((space, index) => {
          const active = space.id === activeSpaceId
          return (
            <button
              key={space.id}
              type="button"
              onClick={() => onSelectSpace(space.id)}
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
    </aside>
  )
}
