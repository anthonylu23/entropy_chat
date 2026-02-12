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

### Phase 1 — Foundation (2–3 weeks)

Status: shipped (Slice 1 baseline).

- [x] Scaffold Electron + Vite + React with TypeScript (use `electron-vite`)
- [x] Set up preload script with typed IPC bridge
- [x] Integrate `better-sqlite3`, define schema, write migrations
- [x] Build basic chat UI: single thread, message list, input bar (shadcn/ui)
- [x] Implement first provider (OpenAI) via Vercel AI SDK with streaming
- [x] Settings panel for API key input, encrypted storage via safeStorage
- [x] Conversation persistence: save/load threads from SQLite
- [x] Basic sidebar with conversation list

**Milestone:** Working single-provider chat app with encrypted local key storage.

### Phase 1 — Slice 2 (Arc Workspace UI) (1–2 weeks)

Status: planned.

Detailed plan: [`docs/phase1-slice2-arc-workspace-plan.md`](/Users/anthony/Documents/CS/Coding/entropy_chat/docs/phase1-slice2-arc-workspace-plan.md)

- [ ] Add SQLite migration for spaces and conversation space assignment.
- [ ] Add `spaces.*` IPC/preload API (`list`, `create`, `update`, `reorder`).
- [ ] Extend `conversations.*` with `create(spaceId)`, `pin`, `reorderPinned`, `moveToSpace`.
- [ ] Add planned `ConversationSummary` fields: `spaceId`, `pinnedOrder`.
- [ ] Refactor shell into Arc-style workspace (spaces rail, sidebar, pinned tabs, split workspace).
- [ ] Implement two-pane split (`left` + `right`) with draggable divider.
- [ ] Implement focus modes: Zen mode and single-pane focus.
- [ ] Expand UI store for active space, pane focus, split/focus flags, and per-space open tabs.
- [ ] Add keyboard shortcuts for spaces, split toggle, and focus toggles.
- [ ] Apply Arc neutral dark visual direction for shell/navigation surfaces.

**Planned milestone:** Arc-style workspace shell on top of Slice 1 baseline (spaces, per-space pinned tabs, two-pane split, focus modes).

### Phase 2 — Multi-Provider & Model Switching (3–4 weeks)

- [ ] Add Anthropic, Gemini, and Ollama provider adapters (Tier 1 — API key)
- [ ] Build provider registry with auth tier awareness
- [ ] Build model selector component with provider grouping
- [ ] Implement in-context model switching with message history re-serialization
- [ ] GitHub Copilot OAuth device flow (Tier 2)
- [ ] Token usage tracking per message and per provider
- [ ] Conversation search and filtering
- [ ] Keyboard shortcuts: `Cmd+K` model switch, `Cmd+N` new chat, `Cmd+,` settings
- [ ] Implement core design system: CSS variables, glassmorphism utilities, IBM Plex Mono
- [ ] Configure Tailwind with design tokens (colors, shadows, radii)
- [ ] Theme engine: JSON loader, `:root` variable injection, dark/light defaults
- [ ] Theme selector in settings with live preview
- [ ] Persist theme choice in SQLite, respect system dark/light preference as default

**Milestone:** Full multi-provider support with seamless mid-conversation model switching.

### Phase 3 — Advanced Workspace, Memory & Subscription Bridges (3–4 weeks)

- [ ] Advanced multi-pane workspace (3-4 panes) and grid variants
- [ ] Broadcast prompt mode across active panes
- [ ] Advanced pane orchestration (add/remove/reorder beyond two-pane slice)
- [ ] Convex backend: schema, auth setup, deployment
- [ ] User sign-up/login via Convex Auth
- [ ] Memory system: CRUD, category tagging, system prompt injection
- [ ] Preference sync across devices
- [ ] Memory management UI (view, edit, delete memories)
- [ ] ChatGPT Plus subscription bridge (Tier 3 — experimental)
  - [ ] Embedded webview login flow
  - [ ] Session token extraction and encrypted storage
  - [ ] Internal API endpoint proxy
  - [ ] Auto-refresh and expiry detection
- [ ] Claude Pro subscription bridge (Tier 3 — experimental)
  - [ ] Same flow as ChatGPT Plus, targeting claude.ai
- [ ] "Experimental" badge and warning UI for subscription bridges
- [ ] Graceful fallback: prompt user to switch to API key on bridge failure

**Milestone:** Advanced workspace + cloud-synced personalization and experimental subscription bridges.

### Phase 4 — Polish & Distribution (2–3 weeks)

- [ ] Auto-updates via `electron-updater` + GitHub Releases
- [ ] System tray with minimize-to-tray
- [ ] Conversation export (Markdown, JSON)
- [ ] Performance audit: code splitting, lazy-load panes, startup time
- [ ] Cross-platform builds and testing (macOS, Windows, Linux)
- [ ] Packaging with `electron-builder` (DMG, NSIS, AppImage)
- [ ] Custom theme import (user `.json` theme files)
- [ ] Theme editor with live preview (stretch goal)
- [ ] README, docs, landing page

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
