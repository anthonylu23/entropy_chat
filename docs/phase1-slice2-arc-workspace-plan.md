# Phase 1 — Slice 2 Plan: Arc Workspace UI

## Status

Planned (not yet implemented).

This document is the authoritative plan for the next slice after the shipped Phase 1 Slice 1 baseline.

Parallel execution setup (1 orchestrator + 2 coders):
[`docs/phase1-slice2-parallel-execution-matrix.md`](/Users/anthony/Documents/CS/Coding/entropy_chat/docs/phase1-slice2-parallel-execution-matrix.md)

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

Atomicity rule for this slice: each checklist line is one independently shippable task with one clear output artifact.

### 1. SQLite migration and schema changes

- [ ] `S2-DB-01` Create `electron/db/migrations/002_spaces_layout.sql`.
- [ ] `S2-DB-02` Register migration `id: 2` in `electron/db/schema.ts`.
- [ ] `S2-DB-03` Create `spaces` table with `id TEXT PRIMARY KEY`.
- [ ] `S2-DB-04` Add `name TEXT NOT NULL` to `spaces`.
- [ ] `S2-DB-05` Add `color TEXT` to `spaces`.
- [ ] `S2-DB-06` Add `icon TEXT` to `spaces`.
- [ ] `S2-DB-07` Add `sort_order INTEGER NOT NULL` to `spaces`.
- [ ] `S2-DB-08` Add `is_default INTEGER NOT NULL DEFAULT 0` to `spaces`.
- [ ] `S2-DB-09` Add `created_at TEXT NOT NULL` to `spaces`.
- [ ] `S2-DB-10` Add `updated_at TEXT NOT NULL` to `spaces`.
- [ ] `S2-DB-11` Add `space_id TEXT NOT NULL` to `conversations`.
- [ ] `S2-DB-12` Add foreign key `conversations.space_id -> spaces.id`.
- [ ] `S2-DB-13` Add `pinned_order INTEGER` to `conversations`.
- [ ] `S2-DB-14` Add index `idx_spaces_sort_order`.
- [ ] `S2-DB-15` Add index `idx_conversations_space_updated`.
- [ ] `S2-DB-16` Add index `idx_conversations_space_pinned_order`.

### 2. Data migration behavior

- [ ] `S2-MIG-01` Insert default space `id='space_general'`.
- [ ] `S2-MIG-02` Set default space `name='General'`.
- [ ] `S2-MIG-03` Set default space `is_default=1`.
- [ ] `S2-MIG-04` Set default space `sort_order=0`.
- [ ] `S2-MIG-05` Backfill existing conversations to `space_id='space_general'`.
- [ ] `S2-MIG-06` Compute deterministic `pinned_order` from `updated_at DESC` for previously pinned conversations.

### 3. IPC contract additions (planned)

- [ ] `S2-IPC-01` Add `spaces.list()` contract in `shared/types.ts`.
- [ ] `S2-IPC-02` Add `spaces.create(input)` contract in `shared/types.ts`.
- [ ] `S2-IPC-03` Add `spaces.update(input)` contract in `shared/types.ts`.
- [ ] `S2-IPC-04` Add `spaces.reorder(input)` contract in `shared/types.ts`.
- [ ] `S2-IPC-05` Add `conversations.create(input?: { title?: string; spaceId?: string })` contract in `shared/types.ts`.
- [ ] `S2-IPC-06` Add `conversations.pin(input)` contract in `shared/types.ts`.
- [ ] `S2-IPC-07` Add `conversations.reorderPinned(input)` contract in `shared/types.ts`.
- [ ] `S2-IPC-08` Add `conversations.moveToSpace(input)` contract in `shared/types.ts`.
- [ ] `S2-IPC-09` Add `ConversationSummary.spaceId` in `shared/types.ts`.
- [ ] `S2-IPC-10` Add `ConversationSummary.pinnedOrder` in `shared/types.ts`.
- [ ] `S2-IPC-11` Add validators for all new `spaces.*` payloads in `shared/validators.ts`.
- [ ] `S2-IPC-12` Add validators for `conversations.pin` payloads in `shared/validators.ts`.
- [ ] `S2-IPC-13` Add validators for `conversations.reorderPinned` payloads in `shared/validators.ts`.
- [ ] `S2-IPC-14` Add validators for `conversations.moveToSpace` payloads in `shared/validators.ts`.
- [ ] `S2-IPC-15` Register all new channel constants in `electron/ipc/channels.ts`.

### 4. Main/preload/renderer client wiring (planned)

- [ ] `S2-WIRE-01` Implement `spaces.list` handler in `electron/ipc/db.ts`.
- [ ] `S2-WIRE-02` Implement `spaces.create` handler in `electron/ipc/db.ts`.
- [ ] `S2-WIRE-03` Implement `spaces.update` handler in `electron/ipc/db.ts`.
- [ ] `S2-WIRE-04` Implement `spaces.reorder` handler in `electron/ipc/db.ts`.
- [ ] `S2-WIRE-05` Implement `conversations.pin` handler in `electron/ipc/db.ts`.
- [ ] `S2-WIRE-06` Implement `conversations.reorderPinned` handler in `electron/ipc/db.ts`.
- [ ] `S2-WIRE-07` Implement `conversations.moveToSpace` handler in `electron/ipc/db.ts`.
- [ ] `S2-WIRE-08` Register all new handlers in `electron/ipc/index.ts`.
- [ ] `S2-WIRE-09` Expose `spaces.*` APIs in `electron/preload.ts`.
- [ ] `S2-WIRE-10` Expose new `conversations.*` APIs in `electron/preload.ts`.
- [ ] `S2-WIRE-11` Update renderer IPC client types to consume new `window.entropy` methods.

### 5. Renderer shell refactor (planned)

- [ ] `S2-UI-01` Refactor `src/components/layout/AppShell.tsx` to host the workspace composition root.
- [ ] `S2-UI-02` Add `SpacesRail` component.
- [ ] `S2-UI-03` Add `WorkspaceSidebar` component for space-scoped conversation lists.
- [ ] `S2-UI-04` Add `PinnedTabStrip` component for per-space pinned tabs.
- [ ] `S2-UI-05` Add `SplitPaneWorkspace` component with left/right panes.
- [ ] `S2-UI-06` Add draggable divider behavior to `SplitPaneWorkspace`.
- [ ] `S2-UI-07` Route conversation-open actions to the currently focused pane.
- [ ] `S2-UI-08` Enforce single-instance rule for open conversation across both panes.

### 6. UI store expansion (planned)

- [ ] `S2-STORE-01` Add `activeSpaceId` to `src/stores/uiStore.ts`.
- [ ] `S2-STORE-02` Add `focusedPane` to `src/stores/uiStore.ts`.
- [ ] `S2-STORE-03` Add `splitEnabled` to `src/stores/uiStore.ts`.
- [ ] `S2-STORE-04` Add `zenMode` to `src/stores/uiStore.ts`.
- [ ] `S2-STORE-05` Add `singlePaneFocus` to `src/stores/uiStore.ts`.
- [ ] `S2-STORE-06` Add `paneConversations` to `src/stores/uiStore.ts`.
- [ ] `S2-STORE-07` Add `openTabsBySpace` to `src/stores/uiStore.ts`.
- [ ] `S2-STORE-08` Persist workspace layout settings under `ui.workspaceLayout.v1`.

### 7. Keyboard shortcuts (planned)

- [ ] `S2-KEY-01` Implement `Cmd/Ctrl+T` for "new chat in active space".
- [ ] `S2-KEY-02` Implement `Cmd/Ctrl+\` for split toggle.
- [ ] `S2-KEY-03` Implement `Cmd/Ctrl+Shift+F` for Zen mode toggle.
- [ ] `S2-KEY-04` Implement `Cmd/Ctrl+Shift+1` for single-pane focus toggle.
- [ ] `S2-KEY-05` Implement `Cmd/Ctrl+1..9` for indexed space switching.

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
