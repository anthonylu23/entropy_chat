# Entropy Chat

A local-first desktop AI chat application built with Electron, React, and TypeScript. Currently supports streaming chat with OpenAI, encrypted API key storage, and SQLite-backed conversation persistence.

## Prerequisites

- Bun 1.1+ (preferred runtime and package manager)
- Node.js 20+ (fallback only, for environments where Bun is unavailable)

## Getting Started

```bash
bun install
bun run dev
```

`bun install` triggers a `postinstall` script that rebuilds `better-sqlite3` against Electron's native ABI via `@electron/rebuild`. This is required for SQLite to work inside the Electron main process. If the rebuild fails, ensure you have a working C++ toolchain (`xcode-select --install` on macOS).

If Bun is not available, use `npm install` and `npm run <script>` as a fallback.

## Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `bun run dev`        | Start Electron with Vite HMR             |
| `bun run build`      | Production build (main + preload + renderer) |
| `bun run preview`    | Preview the production build             |
| `bun run typecheck`  | Run `tsc --noEmit` across all processes  |

## OpenAI Key Setup

On first launch, the app presents an API key entry card. Enter a valid OpenAI API key to unlock the chat interface.

- The key is encrypted using Electron's `safeStorage` (Keychain on macOS, DPAPI on Windows, libsecret on Linux) and stored as an encrypted blob in the local SQLite database.
- The plaintext key never leaves the main process and is never written to disk unencrypted.
- The key persists across app restarts. To change it, the settings flow will overwrite the existing credential.

## Verification

After running `bun run dev`, confirm the following:

1. **Typecheck** — `bun run typecheck` passes with no errors.
2. **Build** — `bun run build` completes for main, preload, and renderer.
3. **Key entry** — First launch shows the API key card; entering a key transitions to the chat UI.
4. **Streaming chat** — Sending a message streams assistant tokens in real time with a blinking cursor.
5. **Persistence** — Restarting the app rehydrates conversations and messages from SQLite.
6. **Stream cancel** — Clicking cancel mid-stream stops further deltas without leaving dangling state.

## Architecture

- Renderer is fully isolated from Node APIs (sandbox enabled, nodeIntegration off).
- Main and renderer communicate through a typed preload API exposed at `window.entropy`.
- IPC payloads are validated in both the preload script and main process handlers.
- SQLite (WAL mode) stores conversations, messages, provider credentials, and settings locally.
- AI streaming is handled via the Vercel AI SDK (`@ai-sdk/openai`) in the main process.

## Current Scope (Phase 1 — Slice 1)

- Electron + React + TypeScript strict app wiring with `electron-vite`
- Typed IPC bridge with double validation
- SQLite schema + migration system (`better-sqlite3`)
- Encrypted credential storage (`safeStorage`)
- OpenAI streaming chat via Vercel AI SDK
- Chat UI: sidebar with conversation list, message thread, input bar (Tailwind + shadcn/ui)
- Zustand for UI state, TanStack Query for data fetching

## Next Planned Slice (Phase 1 — Slice 2: Arc Workspace UI)

Planned only (not yet shipped). Details: [`docs/phase1-slice2-arc-workspace-plan.md`](/Users/anthony/Documents/CS/Coding/entropy_chat/docs/phase1-slice2-arc-workspace-plan.md)

### Planned capabilities

- Persistent spaces users can create and reorder.
- Per-space pinned tabs with drag reorder.
- Two-pane split workspace.
- Focus modes: Zen mode and single-pane focus.
- Arc-neutral dark shell styling and workspace navigation polish.

### Planned API/data changes (not implemented yet)

- New `spaces.*` IPC/preload API: `list`, `create`, `update`, `reorder`.
- Extended `conversations.*` operations:
  - `create` with optional `spaceId`
  - `pin`
  - `reorderPinned`
  - `moveToSpace`
- `ConversationSummary` planned additions: `spaceId`, `pinnedOrder`.
- UI store planned additions for split/focus/pane state.
