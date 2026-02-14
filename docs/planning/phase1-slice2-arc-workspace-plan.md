# Phase 1 — Slice 2 Plan: Arc Workspace UI

## Status

Implemented in code (A1/B1/A2/B2/A3/B3 complete). Final release cut pending.

This document is the authoritative plan for the next slice after the shipped Phase 1 Slice 1 baseline.

Parallel execution setup (1 orchestrator + 2 coders):
[`docs/planning/phase1-slice2-parallel-execution-matrix.md`](phase1-slice2-parallel-execution-matrix.md)

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

- [x] `S2-DB-01` Create `electron/db/migrations/002_spaces_layout.sql`.
- [x] `S2-DB-02` Register migration `id: 2` in `electron/db/schema.ts`.
- [x] `S2-DB-03` Create `spaces` table with `id TEXT PRIMARY KEY`.
- [x] `S2-DB-04` Add `name TEXT NOT NULL` to `spaces`.
- [x] `S2-DB-05` Add `color TEXT` to `spaces`.
- [x] `S2-DB-06` Add `icon TEXT` to `spaces`.
- [x] `S2-DB-07` Add `sort_order INTEGER NOT NULL` to `spaces`.
- [x] `S2-DB-08` Add `is_default INTEGER NOT NULL DEFAULT 0` to `spaces`.
- [x] `S2-DB-09` Add `created_at TEXT NOT NULL` to `spaces`.
- [x] `S2-DB-10` Add `updated_at TEXT NOT NULL` to `spaces`.
- [x] `S2-DB-11` Add `space_id TEXT NOT NULL` to `conversations`.
- [x] `S2-DB-12` Add foreign key `conversations.space_id -> spaces.id`.
- [x] `S2-DB-13` Add `pinned_order INTEGER` to `conversations`.
- [x] `S2-DB-14` Add index `idx_spaces_sort_order`.
- [x] `S2-DB-15` Add index `idx_conversations_space_updated`.
- [x] `S2-DB-16` Add index `idx_conversations_space_pinned_order`.

### 2. Data migration behavior

- [x] `S2-MIG-01` Insert default space `id='space_general'`.
- [x] `S2-MIG-02` Set default space `name='General'`.
- [x] `S2-MIG-03` Set default space `is_default=1`.
- [x] `S2-MIG-04` Set default space `sort_order=0`.
- [x] `S2-MIG-05` Backfill existing conversations to `space_id='space_general'`.
- [x] `S2-MIG-06` Compute deterministic `pinned_order` from `updated_at DESC` for previously pinned conversations.

### 3. IPC contract additions (implemented)

- [x] `S2-IPC-01` Add `spaces.list()` contract in `shared/types.ts`.
- [x] `S2-IPC-02` Add `spaces.create(input)` contract in `shared/types.ts`.
- [x] `S2-IPC-03` Add `spaces.update(input)` contract in `shared/types.ts`.
- [x] `S2-IPC-04` Add `spaces.reorder(input)` contract in `shared/types.ts`.
- [x] `S2-IPC-05` Add `conversations.create(input?: { title?: string; spaceId?: string })` contract in `shared/types.ts`.
- [x] `S2-IPC-06` Add `conversations.pin(input)` contract in `shared/types.ts`.
- [x] `S2-IPC-07` Add `conversations.reorderPinned(input)` contract in `shared/types.ts`.
- [x] `S2-IPC-08` Add `conversations.moveToSpace(input)` contract in `shared/types.ts`.
- [x] `S2-IPC-09` Add `ConversationSummary.spaceId` in `shared/types.ts`.
- [x] `S2-IPC-10` Add `ConversationSummary.pinnedOrder` in `shared/types.ts`.
- [x] `S2-IPC-11` Add validators for all new `spaces.*` payloads in `shared/validators.ts`.
- [x] `S2-IPC-12` Add validators for `conversations.pin` payloads in `shared/validators.ts`.
- [x] `S2-IPC-13` Add validators for `conversations.reorderPinned` payloads in `shared/validators.ts`.
- [x] `S2-IPC-14` Add validators for `conversations.moveToSpace` payloads in `shared/validators.ts`.
- [x] `S2-IPC-15` Register all new channel constants in `electron/ipc/channels.ts`.

### 4. Main/preload/renderer client wiring (implemented)

- [x] `S2-WIRE-01` Implement `spaces.list` handler in `electron/ipc/db.ts`.
- [x] `S2-WIRE-02` Implement `spaces.create` handler in `electron/ipc/db.ts`.
- [x] `S2-WIRE-03` Implement `spaces.update` handler in `electron/ipc/db.ts`.
- [x] `S2-WIRE-04` Implement `spaces.reorder` handler in `electron/ipc/db.ts`.
- [x] `S2-WIRE-05` Implement `conversations.pin` handler in `electron/ipc/db.ts`.
- [x] `S2-WIRE-06` Implement `conversations.reorderPinned` handler in `electron/ipc/db.ts`.
- [x] `S2-WIRE-07` Implement `conversations.moveToSpace` handler in `electron/ipc/db.ts`.
- [x] `S2-WIRE-08` Register all new handlers in `electron/ipc/index.ts`.
- [x] `S2-WIRE-09` Expose `spaces.*` APIs in `electron/preload.ts`.
- [x] `S2-WIRE-10` Expose new `conversations.*` APIs in `electron/preload.ts`.
- [x] `S2-WIRE-11` Update renderer IPC client types to consume new `window.entropy` methods.

### 5. Renderer shell refactor (implemented baseline)

- [x] `S2-UI-01` Refactor `src/components/layout/AppShell.tsx` to host the workspace composition root.
- [x] `S2-UI-02` Add `SpacesRail` component.
- [x] `S2-UI-03` Add `WorkspaceSidebar` component for space-scoped conversation lists.
- [x] `S2-UI-04` Add `PinnedTabStrip` component for per-space pinned tabs.
- [x] `S2-UI-05` Add `SplitPaneWorkspace` component with left/right panes.
- [x] `S2-UI-06` Add draggable divider behavior to `SplitPaneWorkspace`.
- [x] `S2-UI-07` Route conversation-open actions to the currently focused pane.
- [x] `S2-UI-08` Enforce single-instance rule for open conversation across both panes.

### 6. UI store expansion (implemented baseline)

- [x] `S2-STORE-01` Add `activeSpaceId` to `src/stores/uiStore.ts`.
- [x] `S2-STORE-02` Add `focusedPane` to `src/stores/uiStore.ts`.
- [x] `S2-STORE-03` Add `splitEnabled` to `src/stores/uiStore.ts`.
- [x] `S2-STORE-04` Add `zenMode` to `src/stores/uiStore.ts`.
- [x] `S2-STORE-05` Add `singlePaneFocus` to `src/stores/uiStore.ts`.
- [x] `S2-STORE-06` Add `paneConversations` to `src/stores/uiStore.ts`.
- [x] `S2-STORE-07` Add `openTabsBySpace` to `src/stores/uiStore.ts`.
- [x] `S2-STORE-08` Persist workspace layout settings under `ui.workspaceLayout.v1`.

### 7. Keyboard shortcuts (implemented baseline)

- [x] `S2-KEY-01` Implement `Cmd/Ctrl+T` for "new chat in active space".
- [x] `S2-KEY-02` Implement `Cmd/Ctrl+\` for split toggle.
- [x] `S2-KEY-03` Implement `Cmd/Ctrl+Shift+F` for Zen mode toggle.
- [x] `S2-KEY-04` Implement `Cmd/Ctrl+Shift+1` for single-pane focus toggle.
- [x] `S2-KEY-05` Implement `Cmd/Ctrl+1..9` for indexed space switching.

### 8. Integration hardening (complete)

- [x] `S2-INT-01` Bind spaces rail to live `spaces.list()` data instead of a static local list.
- [x] `S2-INT-02` Add UI flows for `spaces.create`, `spaces.update`, and `spaces.reorder`.
- [x] `S2-INT-03` Add DB/IPC behavior tests for `spaces.*`, `conversations.pin`, `conversations.reorderPinned`, and `conversations.moveToSpace`.
- [x] `S2-INT-04` Add UI store tests for pane targeting + single-instance invariants across space switches.
- [x] `S2-INT-05` Execute and document final acceptance/regression checklist results (`bun test tests`, `bun run typecheck`, `bun run build` all passing).

### 9. Visual direction alignment (atomic task split)

Agent A (design-system lane):
- [x] `VIS-A1` Define flat Arc-minimal tokens (remove/deprecate blur/glow/gradient styling tokens).
- [x] `VIS-A2` Wire Tailwind token usage to flat Arc-minimal tokens only.
- [x] `VIS-A3` Align shared UI primitives to flat defaults (solid surfaces + borders only).
- [x] `VIS-A4` Sync architecture/code docs to the flat Arc-minimal system model.

Agent B (layout lane):
- [ ] `VIS-B1` Refactor shell container to flat wrapped viewport (no radial gradient/blur surfaces).
- [ ] `VIS-B2` Convert spaces rail to flat styling while preserving compact density and behavior.
- [ ] `VIS-B3` Convert workspace sidebar to flat styling and move utility controls into bottom bar.
- [ ] `VIS-B4` Convert pinned tab strip and split pane visuals to flat styling while preserving focus affordances.
- [ ] `VIS-B5` Add/adjust tests for unchanged pane/focus behavior after visual refactor.

Execution gates:
1. `VIS-A1` must land before `VIS-A2` and before final layout polish.
2. `VIS-A2` and `VIS-B1..VIS-B4` may run in parallel after `VIS-A1`.
3. `VIS-A3` runs after `VIS-A2`.
4. `VIS-B5` runs after `VIS-B1..VIS-B4`.
5. Final acceptance gate: `bun test tests`, `bun run typecheck`, `bun run build`.

Atomicity rule:
- One task equals one primary outcome, limited file set, independently patchable.
- Design-token tasks must not be mixed with layout-structure tasks.

## Visual Direction (Arc-Inspired Clean Minimal)

- **Flat, solid surfaces** — no gradients, no blur, no glassmorphism, no glare effects.
- **Arc-style border wrapping** — the main chat viewport sits inside a rounded, bordered container, creating the distinctive Arc "content wrapped by sidebar" look.
- **Sidebar bottom bar** — workspace mode controls and pane switcher at the bottom of the sidebar.
- **Neutral dark palette** — true neutral grays, not warm-tinted.
- **Restrained accent** — accent color for active/selected states only, not decorative.
- **Compact desktop density** — navigation controls and tab strips use minimal spacing.
- **shadcn/ui components** — use shadcn defaults as the component foundation.
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

## Public API and Interface Additions (implemented)

- `spaces.*` IPC/preload surface (`list`, `create`, `update`, `reorder`).
- Extended `conversations.*` operations (`create` with `spaceId`, `pin`, `reorderPinned`, `moveToSpace`).
- `ConversationSummary.spaceId` and `ConversationSummary.pinnedOrder`.
- UI store additions for split/focus/pane state.

## Doc QA Checklist

1. README, Slice 1 doc, and roadmap all link to this file.
2. Status and task checkboxes reflect tested implementation state.
3. Slice 1 remains baseline single-thread scope.
4. API names remain consistent across planning docs.
5. Terminology remains consistent: "Zen mode" and "single-pane focus".
