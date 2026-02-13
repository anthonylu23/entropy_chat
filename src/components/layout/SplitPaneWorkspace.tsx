import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { WorkspacePane } from '@renderer/stores/uiStore'
import { cn } from '@renderer/lib/utils'

interface SplitPaneWorkspaceProps {
  splitEnabled: boolean
  singlePaneFocus: boolean
  focusedPane: WorkspacePane
  onFocusPane: (pane: WorkspacePane) => void
  left: ReactNode
  right: ReactNode
}

const MIN_PANE_PERCENT = 25
const MAX_PANE_PERCENT = 75

export function SplitPaneWorkspace({
  splitEnabled,
  singlePaneFocus,
  focusedPane,
  onFocusPane,
  left,
  right,
}: SplitPaneWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [leftPanePercent, setLeftPanePercent] = useState(50)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return
      const bounds = containerRef.current.getBoundingClientRect()
      if (bounds.width === 0) return
      const relative = ((event.clientX - bounds.left) / bounds.width) * 100
      const clamped = Math.min(MAX_PANE_PERCENT, Math.max(MIN_PANE_PERCENT, relative))
      setLeftPanePercent(clamped)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  if (!splitEnabled) {
    return (
      <div className="flex h-full flex-1 flex-col">
        <div className="h-full" onMouseDown={() => onFocusPane('left')}>
          {left}
        </div>
      </div>
    )
  }

  if (singlePaneFocus) {
    return (
      <div className="flex h-full flex-1 flex-col">
        <div
          className="h-full"
          onMouseDown={() => onFocusPane(focusedPane)}
        >
          {focusedPane === 'left' ? left : right}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex h-full flex-1">
      <div
        style={{ width: `${leftPanePercent}%` }}
        onMouseDown={() => onFocusPane('left')}
        className={cn(
          'h-full overflow-hidden border-r border-border/40',
          focusedPane === 'left' && 'shadow-[inset_0_0_0_1px_rgba(0,184,169,0.25)]'
        )}
      >
        {left}
      </div>
      <button
        type="button"
        aria-label="Resize panes"
        onMouseDown={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        className={cn(
          'relative w-2 shrink-0 border-x border-border/40 bg-black/25 transition-colors',
          isDragging ? 'bg-primary/45' : 'hover:bg-primary/25'
        )}
      >
        <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70" />
      </button>
      <div
        style={{ width: `${100 - leftPanePercent}%` }}
        onMouseDown={() => onFocusPane('right')}
        className={cn(
          'h-full overflow-hidden',
          focusedPane === 'right' && 'shadow-[inset_0_0_0_1px_rgba(0,184,169,0.25)]'
        )}
      >
        {right}
      </div>
    </div>
  )
}
