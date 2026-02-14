# Entropy Chat — Desktop AI Chat App Project Plan

## Overview

Entropy Chat is a lightweight desktop AI chat application that provides a unified interface for multiple model providers (OpenAI, Anthropic, Google Gemini, GitHub Copilot, Ollama). It supports both direct API access and bring-your-own-subscription authentication for existing ChatGPT Plus, Copilot, Claude Pro, and Gemini Advanced plans. It prioritizes performance, privacy, and a minimal UI.

---

## Tech Stack

| Layer          | Technology                  | Why                                               |
| -------------- | --------------------------- | ------------------------------------------------- |
| Language       | TypeScript (strict)         | Type safety across main + renderer processes      |
| Runtime        | Bun                         | Fast installs, native TS, built-in test runner    |
| Desktop        | Electron                    | Cross-platform, mature ecosystem                  |
| UI Framework   | React + Vite                | Fast HMR, lean bundles, no SSR overhead           |
| Routing        | TanStack Router             | Type-safe file-based routing                      |
| Data Fetching  | TanStack Query              | Streaming management, caching, optimistic updates |
| Styling        | Tailwind CSS + shadcn/ui    | Utility-first with accessible, minimal components |
| AI Integration | Vercel AI SDK (`ai`)        | Unified streaming across all providers            |
| Local DB       | SQLite via `better-sqlite3` | Keys, conversations, settings — all local         |
| Cloud Backend  | Convex                      | Real-time memory sync, user auth                  |
| Local Models   | Ollama                      | OpenAI-compatible REST API on localhost           |
| State          | Zustand                     | Lightweight stores for UI state                   |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 Renderer (React)                 │
│  Arc Workspace (Spaces/Tabs/Split/Focus) · Chat UI · Model Selector │
└──────────────────┬──────────────────────────────┘
                   │ IPC (contextBridge)
┌──────────────────▼──────────────────────────────┐
│              Main Process (Electron)             │
│  SQLite · Provider Adapters · Key Encryption     │
│  OAuth Flows · Session Bridges · Auto-Update     │
└──┬──────────┬──────────┬──────────┬─────────────┘
   │          │          │          │
Cloud APIs  Copilot   Sub Bridge  Convex
(OpenAI,   (OAuth)   (ChatGPT+,  (memory +
Anthropic,            Claude Pro   user auth)
Gemini)              via session
                      tokens)
   │          │          │
   └──── Ollama (localhost) ─────┘
```

**Key principle:** The renderer never touches Node APIs, SQLite, or raw API keys. Everything goes through typed IPC handlers in the main process.

Near-term workspace planning is tracked in [`docs/planning/phase1-slice2-arc-workspace-plan.md`](phase1-slice2-arc-workspace-plan.md).

---

## Project Structure

```
entropy_chat/
├── electron/
│   ├── main.ts              # App entry, window lifecycle
│   ├── preload.ts           # contextBridge — typed IPC API
│   ├── ipc/
│   │   ├── providers.ts     # AI provider request handlers
│   │   ├── db.ts            # SQLite read/write handlers
│   │   ├── auth.ts          # OAuth flows, key encryption
│   │   └── settings.ts      # App preferences
│   └── db/
│       ├── schema.ts        # Table definitions
│       ├── migrations/      # Versioned migrations
│       └── keystore.ts      # safeStorage encrypt/decrypt
│
├── src/                     # Renderer (React app)
│   ├── routes/              # TanStack Router file routes
│   ├── components/
│   │   ├── chat/            # MessageBubble, ChatInput, ChatThread
│   │   ├── layout/          # SplitPane, Sidebar, Header
│   │   ├── models/          # ModelSelector, ModelBadge
│   │   └── settings/        # ProviderConfig, KeyInput, MemoryPanel
│   ├── hooks/
│   │   ├── useChat.ts       # Wraps Vercel AI SDK useChat
│   │   ├── useProviders.ts  # Available providers + active model
│   │   ├── useMemory.ts     # Convex memory queries
│   │   └── usePanes.ts      # Split-screen pane management
│   ├── stores/
│   │   ├── paneStore.ts     # Active panes, layout, focus
│   │   ├── themeStore.ts    # Active theme, CSS variable application
│   │   └── uiStore.ts       # Sidebar state, modals
│   ├── lib/
│   │   ├── ipc.ts           # Typed IPC client (calls preload API)
│   │   ├── convex.ts        # Convex client setup
│   │   └── providers.ts     # Provider registry + adapter configs
│   └── App.tsx
│
├── convex/
│   ├── schema.ts            # users, memories, sync_state
│   ├── auth.ts              # Convex Auth config
│   ├── memories.ts          # CRUD + query functions
│   └── sync.ts              # Cross-device preference sync
│
├── shared/
│   ├── types.ts             # Provider, Message, Conversation types
│   ├── constants.ts         # Model IDs, defaults
│   └── validators.ts        # Zod schemas for IPC payloads
│
├── themes/                  # Bundled theme JSON files
│   ├── dark.json
│   ├── light.json
│   ├── nord.json
│   ├── catppuccin.json
│   ├── dracula.json
│   └── ...
│
├── electron.vite.config.ts
├── tailwind.config.ts
├── tsconfig.json             # Strict, path aliases
├── bunfig.toml
└── package.json
```

---

## Data Design

### Local SQLite Tables

```sql
-- Provider credentials (API keys encrypted via safeStorage)
providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,              -- "openai", "anthropic", etc.
  auth_tier TEXT NOT NULL,         -- "api_key" | "oauth" | "subscription_bridge"
  credentials_encrypted BLOB,     -- encrypted JSON (key, tokens, or session)
  bridge_status TEXT,              -- "active" | "expired" | "failed" | NULL
  is_active INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
)

-- Chat threads
conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  model TEXT,                      -- last used model
  provider_id TEXT,
  pinned INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
)

-- Individual messages
messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,               -- "user" | "assistant" | "system"
  content TEXT NOT NULL,
  model TEXT,                       -- model that generated this message
  tokens_used INTEGER,
  created_at TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
)

-- Key-value settings
settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT
)
```

### Convex Cloud Tables

```typescript
// convex/schema.ts
users: defineTable({
  email: v.string(),
  name: v.optional(v.string()),
  createdAt: v.number(),
});

memories: defineTable({
  userId: v.id("users"),
  content: v.string(), // extracted fact or preference
  category: v.string(), // "preference" | "context" | "instruction"
  source: v.string(), // "explicit" | "extracted"
  createdAt: v.number(),
}).index("by_user", ["userId"]);

syncState: defineTable({
  userId: v.id("users"),
  deviceId: v.string(),
  preferences: v.string(), // JSON blob
  lastSync: v.number(),
}).index("by_user_device", ["userId", "deviceId"]);
```

---

## Core Features

### Multi-Provider Chat

The Vercel AI SDK provides a unified `useChat` hook that works across providers. Each provider is registered in a typed registry with its adapter config, available models, and auth requirements. Switching models mid-conversation re-serializes the message history into the target format. Provider-specific features (tool use, artifacts, etc.) degrade gracefully when switching to a provider that doesn't support them.

### Authentication & Provider Tiers

Entropy Chat supports three tiers of provider authentication, from stable official APIs to experimental subscription bridges that let users leverage existing paid plans without separate API billing.

#### Provider Tier Matrix

| Tier                    | Providers                         | Auth Method               | Stability    | Phase   |
| ----------------------- | --------------------------------- | ------------------------- | ------------ | ------- |
| **Official API**        | OpenAI, Anthropic, Gemini, Ollama | API key (local encrypted) | Stable       | Phase 2 |
| **Official OAuth**      | GitHub Copilot                    | OAuth device flow         | Stable       | Phase 2 |
| **Subscription Bridge** | ChatGPT Plus, Claude Pro          | Session token extraction  | Experimental | Phase 3 |

#### Tier 1 — Official API (Stable)

Standard API key authentication. Keys are encrypted via Electron's `safeStorage` API and stored in local SQLite. Keys are decrypted only in the main process at the moment of the API call, never exposed to the renderer or any remote server.

| Provider      | Auth    | Storage          | Notes                        |
| ------------- | ------- | ---------------- | ---------------------------- |
| OpenAI        | API Key | Encrypted SQLite | Standard `OPENAI_API_KEY`    |
| Anthropic     | API Key | Encrypted SQLite | Standard `ANTHROPIC_API_KEY` |
| Google Gemini | API Key | Encrypted SQLite | Generous free tier available |
| Ollama        | None    | N/A              | Localhost, no auth needed    |

#### Tier 2 — Official OAuth (Stable)

GitHub Copilot uses an OAuth device flow. The main process initiates a device authorization request, displays a user code, opens the browser for authorization, and polls for the access token. Tokens are stored in the OS keychain via `safeStorage` with automatic refresh before expiration. Requests are proxied through `https://api.githubcopilot.com`.

#### Tier 3 — Subscription Bridge (Experimental)

This is the "bring your own subscription" feature. Users with existing ChatGPT Plus or Claude Pro subscriptions can route requests through their paid plans instead of paying for API usage separately. This works by extracting session tokens from active web sessions.

**How it works:**

1. User clicks "Connect Subscription" for a provider
2. Entropy Chat opens an embedded auth window to the provider's login page (e.g., `chat.openai.com`, `claude.ai`)
3. After login, session cookies/tokens are captured from the webview
4. Requests are proxied through the provider's internal web API endpoints using those tokens
5. Token refresh is handled automatically; re-auth is prompted when sessions expire

**ChatGPT Plus bridge:**

- Extracts `__Secure-next-auth.session-token` from the ChatGPT web session
- Routes through OpenAI's internal chat completions endpoint
- Supports GPT-4o and all models available on the Plus plan

**Claude Pro bridge:**

- Extracts session token from the claude.ai session
- Routes through Anthropic's internal conversation API
- Supports Claude Sonnet/Opus and all models available on the Pro plan

**Important constraints:**

- These bridges use unofficial, reverse-engineered endpoints that can break at any time
- Clearly labeled as **"Experimental"** in the UI with a warning badge
- Users are informed that this may violate provider Terms of Service
- Graceful degradation: if a subscription bridge fails, the user is prompted to switch to API key auth
- Token extraction happens entirely locally — credentials never leave the device

#### Auth Storage Summary

| Data                        | Storage                    | Encrypted               | Synced |
| --------------------------- | -------------------------- | ----------------------- | ------ |
| API keys                    | Local SQLite               | AES-256 via safeStorage | Never  |
| OAuth tokens (Copilot)      | Local SQLite + OS keychain | safeStorage             | Never  |
| Session tokens (bridges)    | Local SQLite               | AES-256 via safeStorage | Never  |
| User account (Entropy Chat) | Convex Auth                | Managed                 | Cloud  |

### Workspace Layout

The workspace follows Arc browser's layout paradigm: a left sidebar containing spaces, conversation list, and bottom controls (workspace mode + pane switcher), with the main chat viewport rendered as a rounded, bordered container that the sidebar wraps around.

Planned near-term (Phase 1 Slice 2): Arc-style workspace shell with persistent spaces, per-space pinned tabs, two-pane split view, and focus modes (Zen mode + single-pane focus).

Planned later (Phase 3+): advanced multi-pane layouts (3-4 panes), grid variants, and broadcast comparison mode.

### Memory

Stored in Convex, injected into system prompts as context. Supports user-defined preferences/facts plus auto-extracted summaries from conversations (user-approved before syncing). Memory never includes raw conversation logs or API keys.

### Design System & Theme Engine

The app's visual identity is inspired by Arc browser: clean, minimal, and flat. No gradients, glassmorphism, glow, or blur effects. The design relies on solid backgrounds, clear borders, and restrained color usage with shadcn/ui components as the foundation.

#### Design Inspiration — Arc Browser

The layout follows Arc's distinctive pattern:

- **Sidebar + wrapped content area:** A narrow sidebar sits on the left. The main chat viewport is visually wrapped by a continuous border/rounded container, creating a clear separation between navigation and content — like Arc's sidebar wrapping around the web view.
- **Sidebar bottom bar:** Workspace mode controls and pane switcher live at the bottom of the sidebar (not the top), mirroring Arc-style bottom utility controls.
- **Flat, solid surfaces:** No gradients, no blur, no glare. Surfaces use solid background colors with subtle elevation through border and background shade differences only.
- **Compact, dense controls:** Navigation elements (space icons, conversation list, pinned tabs) use compact desktop density.
- **Minimal chrome:** The app should feel like content-first with navigation tucked away cleanly.

#### Core Aesthetic

- **System font stack** — uses the OS default sans-serif for a native feel; monospace reserved for code blocks only
- **Neutral darks** — true neutral grays (no warm tint), inspired by Arc's dark mode palette
- **Flat surfaces** — solid background colors, no gradients or blur
- **Rounded content container** — the main viewport has generous rounding (12-16px) with a visible border, echoing Arc's wrapped content area
- **Restrained accent** — accent color used sparingly for active/selected states only
- **shadcn/ui defaults** — leverage shadcn's built-in design tokens and component styling

#### Typography

```
Font Family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
Code Font: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace
Weights: 400 (regular), 500 (medium), 600 (semibold)
```

#### Color Tokens

**Dark Theme (Default)** — Arc-inspired neutral dark

| Token              | Hex       | Usage                                   |
| ------------------ | --------- | --------------------------------------- |
| `--background`     | `#1a1a1a` | App/window background (behind sidebar)  |
| `--sidebar`        | `#1a1a1a` | Sidebar background (same as app bg)     |
| `--surface`        | `#2b2b2b` | Main content area / chat viewport       |
| `--surface-hover`  | `#333333` | Hover state on surface elements         |
| `--muted`          | `#3a3a3a` | Muted backgrounds (input fields, etc.)  |
| `--accent`         | `#5b9bf7` | Primary accent (restrained blue)        |
| `--accent-hover`   | `#4a8ae6` | Hover state                             |
| `--text-primary`   | `#e4e4e4` | Primary text                            |
| `--text-secondary` | `#999999` | Secondary/muted text                    |
| `--border`         | `#3a3a3a` | Borders (subtle, low contrast)          |
| `--border-strong`  | `#4a4a4a` | Content area wrapper border             |
| `--destructive`    | `#e5484d` | Error/destructive actions               |

**Light Theme**

| Token              | Hex       | Usage                                   |
| ------------------ | --------- | --------------------------------------- |
| `--background`     | `#f0f0f0` | App/window background                   |
| `--sidebar`        | `#f0f0f0` | Sidebar background                      |
| `--surface`        | `#ffffff` | Main content area / chat viewport       |
| `--surface-hover`  | `#f5f5f5` | Hover state on surface elements         |
| `--muted`          | `#e8e8e8` | Muted backgrounds                       |
| `--accent`         | `#2563eb` | Primary accent (blue)                   |
| `--accent-hover`   | `#1d4ed8` | Hover state                             |
| `--text-primary`   | `#1a1a1a` | Primary text                            |
| `--text-secondary` | `#666666` | Secondary text                          |
| `--border`         | `#e0e0e0` | Borders                                 |
| `--border-strong`  | `#d0d0d0` | Content area wrapper border             |
| `--destructive`    | `#dc2626` | Error/destructive actions               |

#### Layout Structure

```
┌──────────────────────────────────────────────────────┐
│ Window (--background)                                │
│ ┌─────────┬────────────────────────────────────────┐ │
│ │Sidebar  │ ┌────────────────────────────────────┐ │ │
│ │         │ │                                    │ │ │
│ │ Search  │ │  Chat Viewport (--surface)         │ │ │
│ │         │ │  rounded-xl border border-strong   │ │ │
│ │ Pinned  │ │                                    │ │ │
│ │ Convos  │ │                                    │ │ │
│ │         │ │                                    │ │ │
│ │ Recent  │ │                                    │ │ │
│ │ Convos  │ │                                    │ │ │
│ │         │ │                                    │ │ │
│ │         │ │                                    │ │ │
│ │         │ └────────────────────────────────────┘ │ │
│ │─────────│                                        │ │
│ │ Spaces  │                                        │ │
│ │Settings │                                        │ │
│ └─────────┴────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

The sidebar and content area share the same outer container. The chat viewport is a distinct rounded, bordered surface that sits inside this container — creating the Arc-style "border wrapping around content" effect.

#### Tailwind Config

```typescript
// tailwind.config.ts — extends shadcn/ui defaults
module.exports = {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        // Uses shadcn/ui CSS variable convention
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        sidebar: "hsl(var(--sidebar))",
        surface: "hsl(var(--surface))",
        "surface-hover": "hsl(var(--surface-hover))",
        muted: "hsl(var(--muted))",
        accent: "hsl(var(--accent))",
        "accent-hover": "hsl(var(--accent-hover))",
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        destructive: "hsl(var(--destructive))",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          '"SF Mono"',
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        xl: "1rem",
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

#### Custom Theme Engine (VS Code-style)

On top of the core design system, users can install additional themes. Themes are JSON files that override the CSS variable tokens, allowing full palette customization while preserving the flat/minimal aesthetic, typography, and spacing.

**Bundled themes:** Dark (default), Light, Nord, Catppuccin, Dracula, GitHub Dark, One Dark Pro.

**Theme file structure:**

```jsonc
// themes/nord.json
{
  "name": "Nord",
  "type": "dark",
  "colors": {
    "background": "220 16% 10%",
    "sidebar": "220 16% 10%",
    "surface": "220 16% 18%",
    "surface-hover": "220 16% 22%",
    "muted": "220 16% 26%",
    "accent": "193 43% 67%",
    "accent-hover": "193 43% 60%",
    "text-primary": "219 28% 88%",
    "text-secondary": "219 20% 65%",
    "border": "220 16% 24%",
    "border-strong": "220 16% 30%",
    "destructive": "354 42% 56%",
  },
}
```

**Custom themes:** Users can import `.json` theme files stored in `electron.app.getPath('userData')/themes/`. These appear alongside bundled themes in the selector. A built-in theme editor with live preview is a Phase 4 stretch goal.

### Local Models (Ollama)

Auto-detects running Ollama on localhost. Uses the same chat interface as cloud providers — the Vercel AI SDK treats Ollama's OpenAI-compatible endpoint like any other provider. Optionally manages the Ollama process lifecycle from within the app.

---

## Development Phases

Atomicity rule: each checklist item is one independently assignable task with one primary output.

### Phase 1 — Foundation (2–3 weeks)

Status: shipped (Slice 1 baseline).

- [x] `P1-01` Scaffold Electron + Vite + React with TypeScript (`electron-vite`).
- [x] `P1-02` Set up preload script with typed IPC bridge.
- [x] `P1-03` Integrate `better-sqlite3`.
- [x] `P1-04` Define initial SQLite schema.
- [x] `P1-05` Implement migration runner.
- [x] `P1-06` Build single-thread chat view.
- [x] `P1-07` Build message list UI.
- [x] `P1-08` Build message input UI.
- [x] `P1-09` Implement OpenAI provider path via Vercel AI SDK.
- [x] `P1-10` Implement streaming responses to renderer.
- [x] `P1-11` Add settings panel for API key input.
- [x] `P1-12` Encrypt API key with `safeStorage`.
- [x] `P1-13` Persist conversations to SQLite.
- [x] `P1-14` Load persisted conversations from SQLite.
- [x] `P1-15` Add sidebar conversation list.

**Milestone:** Working single-provider chat app with encrypted local key storage.

### Phase 1 — Slice 2 (Arc Workspace UI) (1–2 weeks)

Status: implemented in code and validated (`bun test tests`, `bun run typecheck`, `bun run build`); release cut pending.

Detailed plan: [`docs/planning/phase1-slice2-arc-workspace-plan.md`](phase1-slice2-arc-workspace-plan.md)

Parallel execution matrix (1 orchestrator + 2 coders): [`docs/planning/phase1-slice2-parallel-execution-matrix.md`](phase1-slice2-parallel-execution-matrix.md)

Next queued atomic tasks for agent execution:
- `A6-INPUT-GUARDS` (Coder-A): strict payload bounds for space naming + backend semantics tests.
- `B7-SPACE-UX` (Coder-B): replace prompt-based space create/rename with explicit UI controls.

- [x] `P1S2-01` Add SQLite migration file for spaces schema.
- [x] `P1S2-02` Backfill existing conversations with default `space_id`.
- [x] `P1S2-03` Add `spaces.list` IPC + preload API.
- [x] `P1S2-04` Add `spaces.create` IPC + preload API.
- [x] `P1S2-05` Add `spaces.update` IPC + preload API.
- [x] `P1S2-06` Add `spaces.reorder` IPC + preload API.
- [x] `P1S2-07` Add `conversations.create(...spaceId)` API support.
- [x] `P1S2-08` Add `conversations.pin` API support.
- [x] `P1S2-09` Add `conversations.reorderPinned` API support.
- [x] `P1S2-10` Add `conversations.moveToSpace` API support.
- [x] `P1S2-11` Add `ConversationSummary.spaceId`.
- [x] `P1S2-12` Add `ConversationSummary.pinnedOrder`.
- [x] `P1S2-13` Add Arc workspace shell container.
- [x] `P1S2-14` Add spaces rail UI.
- [x] `P1S2-15` Add per-space sidebar UI.
- [x] `P1S2-16` Add per-space pinned tab strip UI.
- [x] `P1S2-17` Add two-pane split workspace UI.
- [x] `P1S2-18` Add draggable split divider behavior.
- [x] `P1S2-19` Add Zen mode toggle behavior.
- [x] `P1S2-20` Add single-pane focus toggle behavior.
- [x] `P1S2-21` Add workspace state fields to UI store.
- [x] `P1S2-22` Persist workspace layout settings.
- [x] `P1S2-23` Add keyboard shortcuts for spaces and focus/split toggles.
- [x] `P1S2-24` Apply Arc neutral dark styling to shell navigation surfaces.
- [x] `P1S2-25` Bind space navigation UI to live `spaces.list` data (remove static local fallback as primary source).
- [x] `P1S2-26` Add UI flows for `spaces.create`, `spaces.update`, and `spaces.reorder`.
- [x] `P1S2-27` Add backend behavior tests for new spaces/pinned/move operations.
- [x] `P1S2-28` Add pane/space invariants test coverage in UI store and shell integration paths.
- [x] `P1S2-29` Run and document final Slice 2 acceptance/regression pass.

**Planned milestone:** Arc-style workspace shell on top of Slice 1 baseline (spaces, per-space pinned tabs, two-pane split, focus modes).

### Phase 2 — Multi-Provider & Model Switching (3–4 weeks)

- [ ] `P2-01` Add Anthropic adapter (Tier 1 API key path).
- [ ] `P2-02` Add Gemini adapter (Tier 1 API key path).
- [ ] `P2-03` Add Ollama adapter (Tier 1 local path).
- [ ] `P2-04` Add provider registry metadata for auth tiers.
- [ ] `P2-05` Add provider capability metadata for model features.
- [ ] `P2-06` Build model selector UI with provider grouping.
- [ ] `P2-07` Implement model selection persistence per conversation.
- [ ] `P2-08` Implement message-history re-serialization for model switches.
- [ ] `P2-09` Implement GitHub Copilot OAuth device-code start flow.
- [ ] `P2-10` Implement GitHub Copilot OAuth token polling + storage.
- [ ] `P2-11` Implement Copilot token refresh handling.
- [ ] `P2-12` Record token usage for each assistant message.
- [ ] `P2-13` Add provider-level token usage aggregation.
- [ ] `P2-14` Add conversation search by title/content metadata.
- [ ] `P2-15` Add conversation filtering by provider/model.
- [ ] `P2-16` Add `Cmd+K` model switch shortcut.
- [ ] `P2-17` Add `Cmd+N` new chat shortcut.
- [ ] `P2-18` Add `Cmd+,` settings shortcut.
- [ ] `P2-19` Define CSS variable tokens for Arc-minimal design system.
- [ ] `P2-20` Add reusable flat surface/border utility classes (no glassmorphism).
- [ ] `P2-21` Configure system font stack typography tokens.
- [ ] `P2-22` Wire Tailwind config to design tokens (colors, shadows, radii).
- [ ] `P2-23` Implement theme JSON loader.
- [ ] `P2-24` Implement runtime `:root` variable injection.
- [ ] `P2-25` Provide dark/light default theme selection.
- [ ] `P2-26` Add theme selector UI with live preview.
- [ ] `P2-27` Persist theme choice in SQLite.
- [ ] `P2-28` Respect system dark/light preference when no explicit theme is saved.

**Milestone:** Full multi-provider support with seamless mid-conversation model switching.

### Phase 3 — Advanced Workspace, Memory & Subscription Bridges (3–4 weeks)

- [ ] `P3-01` Add 3-pane workspace layout support.
- [ ] `P3-02` Add 4-pane workspace layout support.
- [ ] `P3-03` Add grid layout variants for multi-pane mode.
- [ ] `P3-04` Add broadcast prompt dispatch to all active panes.
- [ ] `P3-05` Add pane create/remove actions.
- [ ] `P3-06` Add pane reorder actions.
- [ ] `P3-07` Define Convex schema for auth + memory + sync.
- [ ] `P3-08` Configure Convex auth providers and deployment settings.
- [ ] `P3-09` Deploy Convex backend for production environment.
- [ ] `P3-10` Implement user sign-up flow via Convex Auth.
- [ ] `P3-11` Implement user login flow via Convex Auth.
- [ ] `P3-12` Implement memory create operation.
- [ ] `P3-13` Implement memory read/list operations.
- [ ] `P3-14` Implement memory update operation.
- [ ] `P3-15` Implement memory delete operation.
- [ ] `P3-16` Add memory category tagging support.
- [ ] `P3-17` Inject approved memory entries into system prompt assembly.
- [ ] `P3-18` Sync user preferences across devices.
- [ ] `P3-19` Build memory management UI list view.
- [ ] `P3-20` Build memory edit UI flow.
- [ ] `P3-21` Build memory delete UI flow.
- [ ] `P3-22` Build ChatGPT Plus embedded webview login flow (experimental).
- [ ] `P3-23` Implement ChatGPT Plus session token capture + encrypted storage (experimental).
- [ ] `P3-24` Implement ChatGPT Plus internal endpoint proxying (experimental).
- [ ] `P3-25` Implement ChatGPT Plus token refresh + expiry detection (experimental).
- [ ] `P3-26` Build Claude Pro embedded webview login flow (experimental).
- [ ] `P3-27` Implement Claude Pro session token capture + encrypted storage (experimental).
- [ ] `P3-28` Implement Claude Pro internal endpoint proxying (experimental).
- [ ] `P3-29` Implement Claude Pro token refresh + expiry detection (experimental).
- [ ] `P3-30` Add subscription-bridge experimental badge UI.
- [ ] `P3-31` Add subscription-bridge warning copy + consent affordance.
- [ ] `P3-32` Add fallback prompt to switch from bridge auth to API key auth on failure.

**Milestone:** Advanced workspace + cloud-synced personalization and experimental subscription bridges.

### Phase 4 — Polish & Distribution (2–3 weeks)

- [ ] `P4-01` Integrate `electron-updater` into desktop app lifecycle.
- [ ] `P4-02` Configure GitHub Releases channel for update distribution.
- [ ] `P4-03` Add system tray icon and menu actions.
- [ ] `P4-04` Add minimize-to-tray behavior.
- [ ] `P4-05` Implement conversation export as Markdown.
- [ ] `P4-06` Implement conversation export as JSON.
- [ ] `P4-07` Audit bundle code splitting opportunities.
- [ ] `P4-08` Implement lazy-loading for heavy pane/workspace modules.
- [ ] `P4-09` Measure and report startup-time baseline + post-optimization delta.
- [ ] `P4-10` Run macOS build + smoke test pass.
- [ ] `P4-11` Run Windows build + smoke test pass.
- [ ] `P4-12` Run Linux build + smoke test pass.
- [ ] `P4-13` Configure `electron-builder` DMG target.
- [ ] `P4-14` Configure `electron-builder` NSIS target.
- [ ] `P4-15` Configure `electron-builder` AppImage target.
- [ ] `P4-16` Add custom theme import from user `.json` files.
- [ ] `P4-17` Build theme editor with live preview (stretch goal).
- [ ] `P4-18` Update README for production workflows.
- [ ] `P4-19` Update technical docs for release/distribution workflows.
- [ ] `P4-20` Publish landing page content and deployment.

**Milestone:** Production-ready builds with auto-updates.

---

## Risks

| Risk                          | Mitigation                                                                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Electron memory bloat         | Lazy-load panes, aggressive code splitting, profile with `electron-debug`                                                                                            |
| Provider API changes          | Vercel AI SDK absorbs most; pin versions, add integration tests                                                                                                      |
| Copilot OAuth complexity      | Build as isolated module, test early, fallback to API key entry                                                                                                      |
| Subscription bridges breaking | Label as experimental, build health checks that detect failures fast, prompt fallback to API key auth, keep bridge code isolated so breakage doesn't affect core app |
| Provider ToS enforcement      | Inform users of risk in UI, never store session tokens in cloud, make bridges opt-in                                                                                 |
| Convex lock-in                | Keep usage minimal (memory + auth only), abstract behind interface                                                                                                   |
| Split-screen state leaks      | Isolated React subtrees with independent query clients                                                                                                               |

---

## Future Ideas

- Plugin system for community provider adapters and UI extensions
- Voice input (Whisper) and TTS output
- Local RAG with document indexing and vector search
- Prompt template library (saveable, shareable system prompts)
- Usage/cost dashboard with per-provider analytics
- Mobile companion app sharing the Convex memory layer
