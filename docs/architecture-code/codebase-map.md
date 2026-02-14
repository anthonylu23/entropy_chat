# Codebase Map

## Top-Level

- `electron/`: main process, preload, IPC handlers, and DB layer.
- `src/`: renderer UI (React), hooks, stores, and utilities.
- `shared/`: cross-process types and validators.
- `tests/`: bun tests for shared validators, DB semantics, migrations, and UI store behavior.

## Main Process

- `electron/main.ts`: app startup and BrowserWindow bootstrap.
- `electron/preload.ts`: typed `window.entropy` bridge.
- `electron/ipc/index.ts`: IPC handler registration.
- `electron/ipc/db.ts`: spaces/conversations/messages handlers and DB semantics.
- `electron/ipc/auth.ts`: credential handling endpoints.
- `electron/ipc/providers.ts`: provider stream orchestration.
- `electron/db/bootstrap.ts`: DB initialization and pragmas.
- `electron/db/schema.ts`: migration registration and execution.
- `electron/db/migrations/*.sql`: schema versions.

## Renderer

- `src/App.tsx`: root renderer entry.
- `src/components/layout/AppShell.tsx`: workspace composition root.
- `src/components/layout/SpacesRail.tsx`: space navigation and basic space actions.
- `src/components/layout/WorkspaceSidebar.tsx`: space-scoped conversation list.
- `src/components/layout/PinnedTabStrip.tsx`: open tab strip for active space.
- `src/components/layout/SplitPaneWorkspace.tsx`: split pane UI and divider behavior.
- `src/components/chat/*`: chat thread/input/message rendering.
- `src/hooks/useConversations.ts`: conversation/message query and creation hooks.
- `src/hooks/useSpaces.ts`: spaces query/mutation hooks.
- `src/stores/uiStore.ts`: workspace UI state model and pane/space invariants.
- `src/lib/ipc.ts`: safe accessor for `window.entropy`.

## Shared Contracts

- `shared/types.ts`: IPC channel constants + request/response interfaces.
- `shared/validators.ts`: runtime payload validators used by preload and main handlers.

## Test Coverage

- `tests/electron/migrations.test.ts`: migration correctness and compatibility checks.
- `tests/electron/ipc-db-spaces-conversations.test.ts`: space/pin/move backend semantics.
- `tests/shared/validators.test.ts`: contract validator behavior.
- `tests/src/stores/uiStore.test.ts`: pane/space store invariants.
- `tests/src/lib/ipc.test.ts`: preload bridge utility behavior.
