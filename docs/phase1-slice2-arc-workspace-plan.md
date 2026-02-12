# Phase 1 — Slice 2 Plan: Arc Workspace UI

## Status

Planned (not yet implemented).

This document is the authoritative plan for the next slice after the shipped Phase 1 Slice 1 baseline.

## Summary

Build an Arc-inspired workspace shell on top of the existing single-thread chat baseline. This slice adds persistent spaces, per-space pinned tabs, two-pane split view, and focus modes (Zen mode + single-pane focus) while preserving current OpenAI streaming chat behavior.

## Scope and UX Goals

### In scope

- Persistent spaces users can create, rename, reorder, and switch.
- Per-space pinned tabs with pin/unpin and drag reorder.
- Two-pane split workspace (`left` and `right` panes only).
- Focus modes:
  - Zen mode (hide navigation chrome).
  - Single-pane focus (temporarily hide secondary pane).
- Arc-neutral dark visual direction and shell-level interaction polish.
- Keyboard shortcuts for space navigation, split toggle, focus toggles, and new chat.

### Out of scope

- Three-plus pane layouts and grid layouts.
- Broadcast prompt mode to all panes.
- Multi-window workspace management.
- Provider expansion beyond current OpenAI path.
- Cloud sync for workspace layout state.

## Decision-Complete Implementation Plan

### 1. SQLite migration and schema changes

- Add `electron/db/migrations/002_spaces_layout.sql`.
- Update `electron/db/schema.ts` to include migration `id: 2`.
- Create `spaces` table:
  - `id TEXT PRIMARY KEY`
  - `name TEXT NOT NULL`
  - `color TEXT`
  - `icon TEXT`
  - `sort_order INTEGER NOT NULL`
  - `is_default INTEGER NOT NULL DEFAULT 0`
  - `created_at TEXT NOT NULL`
  - `updated_at TEXT NOT NULL`
- Alter `conversations` table:
  - Add `space_id TEXT NOT NULL` (foreign key to `spaces.id`)
  - Add `pinned_order INTEGER` (nullable; set when pinned)
- Add indexes:
  - `idx_spaces_sort_order`
  - `idx_conversations_space_updated`
  - `idx_conversations_space_pinned_order`

### 2. Data migration behavior

- Insert a default space row:
  - `id = 'space_general'`
  - `name = 'General'`
  - `is_default = 1`
  - `sort_order = 0`
- Backfill all existing conversations with `space_id = 'space_general'`.
- Preserve `conversations.pinned`; derive deterministic `pinned_order` per space from `updated_at DESC` for already-pinned conversations.

### 3. IPC contract additions (planned)

- Add planned `spaces.*` IPC methods:
  - `spaces.list()`
  - `spaces.create(input)`
  - `spaces.update(input)`
  - `spaces.reorder(input)`
- Extend planned `conversations.*` methods:
  - `conversations.create(input?: { title?: string; spaceId?: string })`
  - `conversations.pin(input: { conversationId: string; pinned: boolean })`
  - `conversations.reorderPinned(input: { spaceId: string; orderedConversationIds: string[] })`
  - `conversations.moveToSpace(input: { conversationId: string; spaceId: string })`
- Extend `ConversationSummary` with planned fields:
  - `spaceId: string`
  - `pinnedOrder: number | null`
- Update validators/channels in:
  - `shared/types.ts`
  - `shared/validators.ts`
  - `electron/ipc/channels.ts`

### 4. Main/preload/renderer client wiring (planned)

- Add DB handlers for spaces CRUD/reorder and conversation pin/move/reorder in `electron/ipc/db.ts`.
- Register new handlers in `electron/ipc/index.ts`.
- Expose new APIs in `electron/preload.ts`.
- Keep renderer access through typed `window.entropy` contracts only.

### 5. Renderer shell refactor (planned)

- Refactor `src/components/layout/AppShell.tsx` into Arc-style workspace shell.
- Add new components:
  - `SpacesRail`
  - `WorkspaceSidebar` (space-scoped conversation list)
  - `PinnedTabStrip` (per-space tabs)
  - `SplitPaneWorkspace` (max two panes + resizer)
- Opening a conversation targets the focused pane.
- Same conversation cannot be open in both panes; selecting it focuses the pane where it is already open.

### 6. UI store expansion (planned)

- Extend `src/stores/uiStore.ts` with workspace state:
  - `activeSpaceId`
  - `focusedPane`
  - `splitEnabled`
  - `zenMode`
  - `singlePaneFocus`
  - `paneConversations: { left: string | null; right: string | null }`
  - `openTabsBySpace: Record<string, string[]>`
- Persist layout preferences using settings key `ui.workspaceLayout.v1`.

### 7. Keyboard shortcuts (planned)

- `Cmd/Ctrl+T`: new chat in active space.
- `Cmd/Ctrl+\`: toggle split view.
- `Cmd/Ctrl+Shift+F`: toggle Zen mode.
- `Cmd/Ctrl+Shift+1`: toggle single-pane focus.
- `Cmd/Ctrl+1..9`: switch to indexed space.

## Visual Direction (Arc Neutral Dark)

- Neutral dark surface stack with subtle translucency.
- Restrained accent usage for active state, not broad gradients.
- Compact desktop density for navigation controls and tab strips.
- Focus-mode transitions should be subtle and quick.

## Acceptance and Regression Criteria

### Acceptance criteria

- Users can create/reorder spaces and state persists after app restart.
- Pinned tabs are per-space and reorderable.
- Two-pane mode works with independent active conversations.
- Zen mode and single-pane focus are independently toggleable.
- Keyboard shortcuts operate as documented.

### Regression criteria

- Existing single-pane send/stream/cancel flow still works.
- Existing conversation/message persistence remains intact.
- No Arc feature is documented as shipped until implementation lands.

## Public API and Interface Additions (planned, not shipped)

- `spaces.*` IPC/preload surface (`list`, `create`, `update`, `reorder`).
- Extended `conversations.*` operations (`create` with `spaceId`, `pin`, `reorderPinned`, `moveToSpace`).
- `ConversationSummary.spaceId` and `ConversationSummary.pinnedOrder`.
- UI store additions for split/focus/pane state.

## Doc QA Checklist

1. No document claims Arc workspace features are already implemented.
2. README, Slice 1 doc, and roadmap all link to this file.
3. Slice 1 remains baseline single-thread scope.
4. Planned API names are consistent across docs.
5. Terminology remains consistent: "Zen mode" and "single-pane focus".
