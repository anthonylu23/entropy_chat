# Entropy Chat Architecture Overview

## Runtime Layers

Entropy Chat is an Electron app with strict renderer isolation.

1. Renderer process (`src/**`)
- React UI and interaction state.
- No direct Node.js access.
- Reads/writes app data via `window.entropy` only.

2. Preload bridge (`electron/preload.ts`)
- Exposes typed API methods on `window.entropy`.
- Validates IPC payloads before crossing process boundaries.

3. Main process (`electron/ipc/**`, `electron/main.ts`)
- Owns all privileged operations.
- Executes database access and model/provider calls.
- Validates IPC payloads again before handling.

4. Local persistence (`electron/db/**`)
- SQLite with migrations.
- Stores settings, providers, spaces, conversations, and messages.

## Core Data Domains

- Settings: key-value app configuration persisted in SQLite.
- Providers: API credential metadata and encrypted key material.
- Spaces: workspace containers for conversation grouping and ordering.
- Conversations: scoped to a space, with pin and pinned-order semantics.
- Messages: ordered chat messages attached to a conversation.

## IPC Contract Model

Shared API contracts are defined in `shared/types.ts` and runtime validators in `shared/validators.ts`.

Validation is intentionally duplicated:
- Preload validation guards renderer-originated payloads.
- Main-process validation guards handler execution.

This minimizes malformed payload risk and keeps contracts explicit.

## Workspace Behavior Model (Slice 2)

UI state (`src/stores/uiStore.ts`) tracks:
- active space
- focused pane (`left`/`right`)
- split mode and focus mode
- pane conversation assignments
- open tabs per space

Renderer hooks (`src/hooks/useConversations.ts`, `src/hooks/useSpaces.ts`) use TanStack Query for read caching and invalidation after mutations.

## Streaming Model

- Stream start/cancel is initiated from renderer through preload.
- Main process streams provider deltas and emits progress events.
- Renderer subscribes to delta/done/error events and updates active thread UI.

## Persistence and Migration

- Migrations are applied at startup through `electron/db/schema.ts`.
- `001_init.sql` establishes baseline schema.
- `002_spaces_layout.sql` adds spaces and conversation space/pin ordering fields with backfill.
