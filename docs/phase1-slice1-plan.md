# Next Steps: Phase-1 Slice 1 (E2E Single-Provider Chat)

## Status

Completed baseline (shipped).

## Follow-up Slice

Arc workspace planning is tracked in:
[`docs/phase1-slice2-arc-workspace-plan.md`](/Users/anthony/Documents/CS/Coding/entropy_chat/docs/phase1-slice2-arc-workspace-plan.md)

## Summary

Build the first usable milestone on top of the bootstrap: OpenAI streaming chat with encrypted local key storage, SQLite-backed conversations/messages, and a minimal Tailwind + shadcn UI shell (sidebar + single thread).
This slice targets the Phase-1 milestone: a working single-provider desktop chat with secure local credentials.

## Scope (In / Out)

### In scope

- OpenAI-only provider path
- `safeStorage` + SQLite credential persistence
- Streaming assistant responses over IPC
- Conversation list + message thread + input
- Tailwind + shadcn base setup

### Out of scope

- Multi-provider registry
- Convex integration
- OAuth/device flows
- Split-pane architecture

## Implementation Plan (Decision Complete)

### 1. Stabilize baseline + dependencies

- Add runtime deps: `better-sqlite3`, `ai`, `@ai-sdk/openai`, `zod`, `zustand`, `@tanstack/react-query`.
- Add UI deps: `tailwindcss`, `postcss`, `autoprefixer`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tailwindcss-animate`.
- Add native rebuild tooling for Electron ABI: `@electron/rebuild`.
- Add scripts in `/Users/anthony/Documents/CS/Coding/entropy_chat/package.json`:
  - `postinstall`: rebuild `better-sqlite3` for Electron
  - keep existing `dev/build/typecheck/preview`.

### 2. Tailwind + shadcn foundation

- Create and wire:
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/tailwind.config.ts`
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/postcss.config.cjs`
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/src/index.css`
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/src/lib/utils.ts`
- Add initial shadcn primitives used in this slice only:
  - `Button`, `Input`, `Textarea`, `Card`, `ScrollArea`.
- Keep current warm/glass token direction; migrate existing `/Users/anthony/Documents/CS/Coding/entropy_chat/src/styles.css` styles into Tailwind tokenized classes.

### 3. SQLite core + migrations

- Implement DB bootstrap in:
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/electron/db/bootstrap.ts`
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/electron/db/schema.ts`
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/electron/db/migrations/001_init.sql`
- Tables for this slice:
  - `providers` (OpenAI key only for now)
  - `conversations`
  - `messages`
  - `settings`
- Add migration journal table (`schema_migrations`) and idempotent startup migration runner.

### 4. Credential encryption + storage

- Implement real encryption in:
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/electron/db/keystore.ts`
- Use `safeStorage.encryptString/decryptString`.
- Store encrypted OpenAI key blob in `providers.credentials_encrypted`.
- Fail with explicit error when OS-level `safeStorage` unavailable.

### 5. IPC contracts expansion

- Extend shared contracts:
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/shared/types.ts`
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/shared/validators.ts`
- Add typed channels and payloads for:
  - `credentials.hasOpenAIKey`
  - `credentials.setOpenAIKey`
  - `conversations.list`
  - `conversations.create`
  - `messages.listByConversation`
  - `chat.stream.start`
  - `chat.stream.cancel`
- Add streaming event contracts:
  - `chat.stream.delta`
  - `chat.stream.done`
  - `chat.stream.error`

### 6. Main-process handlers

- Implement handlers in:
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/electron/ipc/auth.ts` (OpenAI key set/check)
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/electron/ipc/db.ts` (conversation/message reads/writes)
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/electron/ipc/providers.ts` (OpenAI stream orchestration)
- Keep renderer isolated; all provider traffic stays in main process.
- Persist user message immediately; stream assistant deltas; persist final assistant message on completion.

### 7. Preload API update

- Expand `/Users/anthony/Documents/CS/Coding/entropy_chat/electron/preload.ts` to expose:
  - credential methods
  - conversation/message methods
  - stream start/cancel
  - stream event subscribe/unsubscribe APIs
- Update `/Users/anthony/Documents/CS/Coding/entropy_chat/src/vite-env.d.ts` and typed renderer client.

### 8. Renderer MVP chat UI

- Replace smoke UI with minimal app shell:
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/src/App.tsx`
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/src/components/layout/*`
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/src/components/chat/*`
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/src/components/settings/*`
- UX flow:
  - If no key: show settings card for OpenAI key entry.
  - If key exists: show sidebar + active conversation.
  - Send prompt => stream assistant text token-by-token into active thread.
  - New chat creates conversation row and switches context.

### 9. State + query wiring

- Add lightweight stores/hooks:
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/src/stores/uiStore.ts`
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/src/hooks/useConversations.ts`
  - `/Users/anthony/Documents/CS/Coding/entropy_chat/src/hooks/useChatStream.ts`
- Use TanStack Query for list/message loading and invalidation; keep stream buffer in local component/store state.

### 10. Docs + completion gate

- Update `/Users/anthony/Documents/CS/Coding/entropy_chat/README.md` with:
  - OpenAI key setup
  - native module rebuild note
  - run and verification steps
- Mark completed Phase-1 items in `/Users/anthony/Documents/CS/Coding/entropy_chat/project_plan.md` only for work actually shipped in this slice.

## Public APIs / Interfaces (Additions)

- `window.entropy.credentials.hasOpenAIKey(): Promise<boolean>`
- `window.entropy.credentials.setOpenAIKey(apiKey: string): Promise<void>`
- `window.entropy.conversations.list(): Promise<ConversationSummary[]>`
- `window.entropy.conversations.create(input?: { title?: string }): Promise<ConversationSummary>`
- `window.entropy.messages.listByConversation(conversationId: string): Promise<ChatMessage[]>`
- `window.entropy.chat.stream.start(input: ChatStreamStartInput): Promise<{ requestId: string }>`
- `window.entropy.chat.stream.cancel(requestId: string): Promise<void>`
- `window.entropy.chat.onDelta(listener)`
- `window.entropy.chat.onDone(listener)`
- `window.entropy.chat.onError(listener)`

## Test Cases and Scenarios

### 1. Type/build checks

- `bun run typecheck` passes.
- `bun run build` passes for main/preload/renderer.

### 2. Credential safety

- Saving an OpenAI key stores encrypted bytes; plaintext key is absent in SQLite.
- App restart retains decryptable key state and `hasOpenAIKey === true`.

### 3. Chat flow

- With valid key: send prompt, receive streamed deltas, final assistant message persists.
- Without key: send action blocked with clear UI state and no provider call.

### 4. Persistence

- Create multiple conversations; list order updates by recent activity.
- Reload app; conversations/messages rehydrate correctly.

### 5. IPC hardening

- Invalid payloads for every channel are rejected with typed validation errors.
- Stream cancel stops further deltas and does not leave dangling state.

### 6. Resilience

- Network/provider error emits `chat.stream.error`, surfaces to UI, and preserves previously saved user message.

## Assumptions and Defaults

- Priority is **E2E single-provider chat first**.
- Tailwind + shadcn are integrated **in this next slice** (not deferred).
- OpenAI key handling is **safeStorage + SQLite now** (no env-var-only shortcut).
- Bun is the primary runtime; Node/npm can remain fallback for local environments where needed.
