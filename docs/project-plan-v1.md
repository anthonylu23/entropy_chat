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

Near-term workspace planning is tracked in [`docs/phase1-slice2-arc-workspace-plan.md`](/Users/anthony/Documents/CS/Coding/entropy_chat/docs/phase1-slice2-arc-workspace-plan.md).

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

Planned near-term (Phase 1 Slice 2): Arc-style workspace shell with persistent spaces, per-space pinned tabs, two-pane split view, and focus modes (Zen mode + single-pane focus).

Planned later (Phase 3+): advanced multi-pane layouts (3-4 panes), grid variants, and broadcast comparison mode.

### Memory

Stored in Convex, injected into system prompts as context. Supports user-defined preferences/facts plus auto-extracted summaries from conversations (user-approved before syncing). Memory never includes raw conversation logs or API keys.

### Design System & Theme Engine

The app's visual identity is built on a glassmorphism-forward design system with warm neutrals, monospace typography, and generous rounding. A VS Code-style theming engine allows bundled and user-created custom themes on top of this foundation.

#### Core Aesthetic

- **Monospace-first typography** — IBM Plex Mono as primary font for a technical/minimal feel
- **Warm neutrals** — backgrounds have slight warmth (not pure gray)
- **Glassmorphism** — blur, saturation boost, subtle gradients, layered inset/depth shadows
- **Generous border radius** — 24px primary radius for a soft, modern feel
- **High contrast text** — warm off-white on dark, dark brown on light

#### Typography

```
Font Family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace
Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
```

#### Color Tokens

**Dark Theme (Default)**

| Token              | Hex       | Usage                         |
| ------------------ | --------- | ----------------------------- |
| `--base`           | `#3a3b3b` | Page background               |
| `--surface`        | `#434545` | Cards, elevated surfaces      |
| `--elevated`       | `#4c4d4d` | Higher elevation surfaces     |
| `--accent`         | `#00b8a9` | Primary accent (teal/cyan)    |
| `--accent-hover`   | `#00a899` | Hover state                   |
| `--glow`           | `#00b8a9` | Glow effects                  |
| `--text-primary`   | `#e8e5e2` | Primary text (warm off-white) |
| `--text-secondary` | `#b8b5b2` | Secondary/muted text          |
| `--text-inverse`   | `#16181c` | Text on light backgrounds     |
| `--border`         | `#5e6165` | Borders                       |
| `--destructive`    | `#c72c2c` | Error/destructive actions     |

**Light Theme**

| Token              | Hex       | Usage                         |
| ------------------ | --------- | ----------------------------- |
| `--base`           | `#e8d9b8` | Page background (warm tan)    |
| `--surface`        | `#fcf2d0` | Cards (warm cream)            |
| `--accent`         | `#d99a1f` | Primary accent (golden amber) |
| `--accent-hover`   | `#b37a11` | Hover state                   |
| `--text-primary`   | `#3a3736` | Primary text                  |
| `--text-secondary` | `#665f58` | Secondary text                |
| `--border`         | `#d4c8a8` | Borders                       |

#### Glassmorphism Effects

```css
/* Backdrop blur */
backdrop-filter: blur(18px) saturate(1.85) brightness(1.1);

/* Glass surface (dark) */
background: linear-gradient(
  145deg,
  rgba(20, 22, 30, 0.55),
  rgba(255, 255, 255, 0.08)
);
border: 1px solid rgba(255, 255, 255, 0.22);

/* Glass surface (light) */
background: linear-gradient(
  145deg,
  rgba(255, 255, 255, 0.2),
  rgba(255, 255, 255, 0.05)
);
border: 1px solid rgba(255, 255, 255, 0.32);

/* Glow shadow */
box-shadow: 0 20px 45px hsl(var(--glow) / 0.35);

/* Glass depth shadow (dark) */
box-shadow:
  inset 0 1px 0 rgba(255, 255, 255, 0.2),
  inset 0 -1px 0 rgba(255, 255, 255, 0.1),
  0 12px 32px rgba(3, 7, 18, 0.7),
  0 25px 55px rgba(3, 7, 18, 0.4);
```

#### Tailwind Config

```typescript
// tailwind.config.ts
module.exports = {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        base: "hsl(var(--base))",
        surface: "hsl(var(--surface))",
        elevated: "hsl(var(--elevated))",
        accent: "hsl(var(--accent))",
        accentHover: "hsl(var(--accent-hover))",
        textPrimary: "hsl(var(--text-primary))",
        textSecondary: "hsl(var(--text-secondary))",
        textInverse: "hsl(var(--text-inverse))",
      },
      fontFamily: {
        sans: [
          '"IBM Plex Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 20px 45px hsl(var(--glow) / 0.35)",
      },
      borderRadius: {
        lg: "1.5rem",
        md: "calc(1.5rem - 2px)",
        sm: "calc(1.5rem - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

#### Custom Theme Engine (VS Code-style)

On top of the core design system, users can install additional themes. Themes are JSON files that override the CSS variable tokens, allowing full palette customization while preserving the glassmorphism effects, typography, and spacing.

**Bundled themes:** Dark (default), Light, Monokai, Solarized Dark, Solarized Light, Nord, Catppuccin, Dracula, GitHub Dark, One Dark Pro.

**Theme file structure:**

```jsonc
// themes/nord.json
{
  "name": "Nord",
  "type": "dark",
  "colors": {
    "base": "220 16% 22%",
    "surface": "220 16% 26%",
    "elevated": "220 16% 30%",
    "accent": "193 43% 67%",
    "accent-hover": "193 43% 60%",
    "glow": "193 43% 67%",
    "text-primary": "219 28% 88%",
    "text-secondary": "219 20% 72%",
    "text-inverse": "220 16% 12%",
    "border": "220 16% 36%",
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

Status: planned.

Detailed plan: [`docs/phase1-slice2-arc-workspace-plan.md`](/Users/anthony/Documents/CS/Coding/entropy_chat/docs/phase1-slice2-arc-workspace-plan.md)

Parallel execution matrix (1 orchestrator + 2 coders): [`docs/phase1-slice2-parallel-execution-matrix.md`](/Users/anthony/Documents/CS/Coding/entropy_chat/docs/phase1-slice2-parallel-execution-matrix.md)

- [ ] `P1S2-01` Add SQLite migration file for spaces schema.
- [ ] `P1S2-02` Backfill existing conversations with default `space_id`.
- [ ] `P1S2-03` Add `spaces.list` IPC + preload API.
- [ ] `P1S2-04` Add `spaces.create` IPC + preload API.
- [ ] `P1S2-05` Add `spaces.update` IPC + preload API.
- [ ] `P1S2-06` Add `spaces.reorder` IPC + preload API.
- [ ] `P1S2-07` Add `conversations.create(...spaceId)` API support.
- [ ] `P1S2-08` Add `conversations.pin` API support.
- [ ] `P1S2-09` Add `conversations.reorderPinned` API support.
- [ ] `P1S2-10` Add `conversations.moveToSpace` API support.
- [ ] `P1S2-11` Add `ConversationSummary.spaceId`.
- [ ] `P1S2-12` Add `ConversationSummary.pinnedOrder`.
- [ ] `P1S2-13` Add Arc workspace shell container.
- [ ] `P1S2-14` Add spaces rail UI.
- [ ] `P1S2-15` Add per-space sidebar UI.
- [ ] `P1S2-16` Add per-space pinned tab strip UI.
- [ ] `P1S2-17` Add two-pane split workspace UI.
- [ ] `P1S2-18` Add draggable split divider behavior.
- [ ] `P1S2-19` Add Zen mode toggle behavior.
- [ ] `P1S2-20` Add single-pane focus toggle behavior.
- [ ] `P1S2-21` Add workspace state fields to UI store.
- [ ] `P1S2-22` Persist workspace layout settings.
- [ ] `P1S2-23` Add keyboard shortcuts for spaces and focus/split toggles.
- [ ] `P1S2-24` Apply Arc neutral dark styling to shell navigation surfaces.

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
- [ ] `P2-19` Define CSS variable tokens for design system.
- [ ] `P2-20` Add reusable glassmorphism utility classes.
- [ ] `P2-21` Configure IBM Plex Mono typography tokens.
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
