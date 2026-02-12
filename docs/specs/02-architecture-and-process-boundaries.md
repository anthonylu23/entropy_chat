# Architecture and Process Boundaries

## System Layout
- Renderer: UI, routing, state, optimistic UX.
- Main process: provider calls, key handling, DB access, auth adapters, bridge control.
- Cloud backend: user identity, memory sync, preference sync.

## Mandatory Boundaries
1. Renderer must not access Node APIs, raw credentials, or SQLite directly.
2. Main process exposes only typed IPC handlers validated by schemas.
3. Provider secrets and bridge tokens are decrypted only at request time in main process.
4. Cloud sync excludes provider credentials and bridge session material.

## Auth Separation Model
- User auth: identity for Entropy Chat account/session state.
- Provider auth: credentials for provider API/OAuth/bridge.
- These are independently managed and independently revocable.

## Core Modules
- `electron/ipc/auth.ts`: user auth IPC.
- `electron/ipc/providers.ts`: provider lifecycle + chat calls.
- `electron/ipc/bridge.ts`: experimental bridge controls/health.
- `electron/db/*`: schema, migrations, encryption wrappers.
- `src/lib/ipc.ts`: typed renderer client.

## IPC Additions (Required)
User auth endpoints:
- `auth.getMode()`
- `auth.getSession()`
- `auth.signIn()`
- `auth.signOut()`

Bridge endpoints:
- `bridge.getEligibility(provider)`
- `bridge.enableExperimental(provider)`
- `bridge.disable(provider)`
- `bridge.getHealth(provider)`

Provider listing contract:
- `providers.listAvailable()` includes `authTier`, `requiresUserAuth`, and `bridgeStatus`.
