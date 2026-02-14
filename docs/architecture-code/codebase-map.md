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
- `tests/src/components/layout/AppShell.interaction.test.tsx`: AppShell interaction and workspace-control integration coverage.
- `tests/src/styles/visualTokens.test.ts`: visual style-contract regression gate.

## Style Contract Maintenance

- Gate test:
  - `tests/src/styles/visualTokens.test.ts` is the gate for style-contract regressions.
- What it guards:
  - Flat/no-glass/no-gradient constraints across renderer source.
  - Typography contract (`body` sans, `code/pre` mono).
  - Required semantic token presence (`shell`, `surface-*`, `border-strong`).
  - Tailwind token wiring for these semantic tokens.
  - Absence of blur/glow visual primitives (`backdrop-blur`, `blur()`, `drop-shadow`).
- Required update set when visual contract changes:
  - `src/index.css`
  - `tailwind.config.ts`
  - `tests/src/styles/visualTokens.test.ts`
  - Relevant docs under `docs/architecture-code/*`
- Reviewer checklist rule:
  - Reject visual PRs that bypass or weaken this gate without explicit contract update rationale.
