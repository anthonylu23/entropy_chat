# Next Steps: Phase-1 Slice 1 (E2E Single-Provider Chat)

## Status

Completed baseline (shipped).

## Follow-up Slice

Arc workspace planning is tracked in:
[`docs/phase1-slice2-arc-workspace-plan.md`](/Users/anthony/Documents/CS/Coding/entropy_chat/docs/phase1-slice2-arc-workspace-plan.md)

Parallel execution matrix for the Slice 2 build:
[`docs/phase1-slice2-parallel-execution-matrix.md`](/Users/anthony/Documents/CS/Coding/entropy_chat/docs/phase1-slice2-parallel-execution-matrix.md)

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

Atomicity rule: each checklist line is one independently shippable task with one primary outcome.

### 1. Stabilize baseline + dependencies

- [x] `S1-DEP-01` Add runtime dependency `better-sqlite3`.
- [x] `S1-DEP-02` Add runtime dependency `ai`.
- [x] `S1-DEP-03` Add runtime dependency `@ai-sdk/openai`.
- [x] `S1-DEP-04` Add runtime dependency `zod`.
- [x] `S1-DEP-05` Add runtime dependency `zustand`.
- [x] `S1-DEP-06` Add runtime dependency `@tanstack/react-query`.
- [x] `S1-DEP-07` Add UI dependency `tailwindcss`.
- [x] `S1-DEP-08` Add UI dependency `postcss`.
- [x] `S1-DEP-09` Add UI dependency `autoprefixer`.
- [x] `S1-DEP-10` Add UI dependency `class-variance-authority`.
- [x] `S1-DEP-11` Add UI dependency `clsx`.
- [x] `S1-DEP-12` Add UI dependency `tailwind-merge`.
- [x] `S1-DEP-13` Add UI dependency `lucide-react`.
- [x] `S1-DEP-14` Add UI dependency `tailwindcss-animate`.
- [x] `S1-DEP-15` Add native rebuild tooling `@electron/rebuild`.
- [x] `S1-DEP-16` Add `postinstall` script to rebuild `better-sqlite3` for Electron.
- [x] `S1-DEP-17` Preserve existing `dev/build/typecheck/preview` scripts in `package.json`.

### 2. Tailwind + shadcn foundation

- [x] `S1-UI-01` Create and wire `tailwind.config.ts`.
- [x] `S1-UI-02` Create and wire `postcss.config.cjs`.
- [x] `S1-UI-03` Create and wire `src/index.css`.
- [x] `S1-UI-04` Create `src/lib/utils.ts`.
- [x] `S1-UI-05` Add shadcn `Button` primitive.
- [x] `S1-UI-06` Add shadcn `Input` primitive.
- [x] `S1-UI-07` Add shadcn `Textarea` primitive.
- [x] `S1-UI-08` Add shadcn `Card` primitive.
- [x] `S1-UI-09` Add shadcn `ScrollArea` primitive.
- [x] `S1-UI-10` Migrate existing `src/styles.css` styles to Tailwind tokenized classes while preserving warm/glass direction.

### 3. SQLite core + migrations

- [x] `S1-DB-01` Implement DB bootstrap in `electron/db/bootstrap.ts`.
- [x] `S1-DB-02` Implement schema registration in `electron/db/schema.ts`.
- [x] `S1-DB-03` Add `electron/db/migrations/001_init.sql`.
- [x] `S1-DB-04` Create `providers` table.
- [x] `S1-DB-05` Create `conversations` table.
- [x] `S1-DB-06` Create `messages` table.
- [x] `S1-DB-07` Create `settings` table.
- [x] `S1-DB-08` Create `schema_migrations` journal table.
- [x] `S1-DB-09` Implement idempotent startup migration runner.

### 4. Credential encryption + storage

- [x] `S1-SEC-01` Implement key encryption utilities in `electron/db/keystore.ts`.
- [x] `S1-SEC-02` Encrypt API keys with `safeStorage.encryptString`.
- [x] `S1-SEC-03` Decrypt API keys with `safeStorage.decryptString`.
- [x] `S1-SEC-04` Store encrypted OpenAI key blob in `providers.credentials_encrypted`.
- [x] `S1-SEC-05` Return explicit error when OS `safeStorage` is unavailable.

### 5. IPC contracts expansion

- [x] `S1-IPC-01` Add `credentials.hasOpenAIKey` contract in `shared/types.ts`.
- [x] `S1-IPC-02` Add `credentials.setOpenAIKey` contract in `shared/types.ts`.
- [x] `S1-IPC-03` Add `conversations.list` contract in `shared/types.ts`.
- [x] `S1-IPC-04` Add `conversations.create` contract in `shared/types.ts`.
- [x] `S1-IPC-05` Add `messages.listByConversation` contract in `shared/types.ts`.
- [x] `S1-IPC-06` Add `chat.stream.start` contract in `shared/types.ts`.
- [x] `S1-IPC-07` Add `chat.stream.cancel` contract in `shared/types.ts`.
- [x] `S1-IPC-08` Add `chat.stream.delta` event contract in `shared/types.ts`.
- [x] `S1-IPC-09` Add `chat.stream.done` event contract in `shared/types.ts`.
- [x] `S1-IPC-10` Add `chat.stream.error` event contract in `shared/types.ts`.
- [x] `S1-IPC-11` Add validators for new payloads in `shared/validators.ts`.

### 6. Main-process handlers

- [x] `S1-MAIN-01` Implement OpenAI key set/check handlers in `electron/ipc/auth.ts`.
- [x] `S1-MAIN-02` Implement conversation read/write handlers in `electron/ipc/db.ts`.
- [x] `S1-MAIN-03` Implement message read/write handlers in `electron/ipc/db.ts`.
- [x] `S1-MAIN-04` Implement OpenAI stream orchestration in `electron/ipc/providers.ts`.
- [x] `S1-MAIN-05` Keep provider network calls in main process only.
- [x] `S1-MAIN-06` Persist user message before starting stream.
- [x] `S1-MAIN-07` Emit streaming assistant deltas during generation.
- [x] `S1-MAIN-08` Persist final assistant message when stream completes.

### 7. Preload API update

- [x] `S1-PRE-01` Expose credential APIs in `electron/preload.ts`.
- [x] `S1-PRE-02` Expose conversation/message APIs in `electron/preload.ts`.
- [x] `S1-PRE-03` Expose stream start/cancel APIs in `electron/preload.ts`.
- [x] `S1-PRE-04` Expose stream event subscribe/unsubscribe APIs in `electron/preload.ts`.
- [x] `S1-PRE-05` Update `src/vite-env.d.ts` for new `window.entropy` types.
- [x] `S1-PRE-06` Update typed renderer IPC client to match preload surface.

### 8. Renderer MVP chat UI

- [x] `S1-REN-01` Replace smoke UI in `src/App.tsx` with app shell entry.
- [x] `S1-REN-02` Build layout shell components in `src/components/layout/*`.
- [x] `S1-REN-03` Build chat components in `src/components/chat/*`.
- [x] `S1-REN-04` Build settings components in `src/components/settings/*`.
- [x] `S1-REN-05` Show OpenAI key entry when no key is configured.
- [x] `S1-REN-06` Show sidebar + active conversation when key exists.
- [x] `S1-REN-07` Stream assistant text token-by-token into active thread.
- [x] `S1-REN-08` Create and switch to new conversation on "new chat".

### 9. State + query wiring

- [x] `S1-STATE-01` Add UI state in `src/stores/uiStore.ts`.
- [x] `S1-STATE-02` Add conversation loading hook in `src/hooks/useConversations.ts`.
- [x] `S1-STATE-03` Add stream orchestration hook in `src/hooks/useChatStream.ts`.
- [x] `S1-STATE-04` Use TanStack Query for conversation/message reads and invalidation.
- [x] `S1-STATE-05` Keep in-flight stream buffer in local component/store state.

### 10. Docs + completion gate

- [x] `S1-DOC-01` Update `README.md` with OpenAI key setup instructions.
- [x] `S1-DOC-02` Document native module rebuild note in `README.md`.
- [x] `S1-DOC-03` Add run + verification steps to `README.md`.
- [x] `S1-DOC-04` Mark shipped Slice 1 roadmap items as complete in project planning docs.

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
