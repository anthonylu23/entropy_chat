# Product Scope and Phasing

## Product Goal
Build a desktop AI chat app that supports multiple providers with strong local privacy, optional cloud sync, and an experimental bring-your-own-subscription bridge.

## In Scope
- Desktop app with local conversation storage.
- Multi-provider chat (OpenAI, Anthropic, Gemini, Ollama, Copilot OAuth).
- Optional user account for memory/preferences sync.
- Experimental subscription bridge for personal-use workflows.

## Out of Scope (Current Roadmap)
- Mandatory cloud account for all users.
- Mobile client parity.
- Marketplace/plugin ecosystem.
- Production guarantee for subscription bridge reliability.

## Phases and Exit Criteria

## Phase 1: Local Core (3-4 weeks)
Work:
- Electron + React + typed IPC scaffold.
- SQLite schema/migrations.
- Single-provider chat + streaming.
- Encrypted provider-key storage.
- Conversation list and persistence.

Exit criteria:
- Full chat loop works offline except provider API calls.
- Provider secrets are never exposed to renderer.

## Phase 2: Multi-Provider Stable (4-5 weeks)
Work:
- Add Anthropic/Gemini/Ollama and provider registry.
- Add model switching + compatibility handling.
- Add Copilot OAuth device flow.
- Add usage tracking and search/filtering.

Exit criteria:
- Stable operation across official provider pathways.
- Bridge code is not in critical path.

## Phase 3: User Auth and Cloud Sync (3-4 weeks)
Work:
- Add optional sign-in mode with Convex auth.
- Sync memory/preferences across devices.
- Preserve fully functional guest-local mode.

Exit criteria:
- Signed-out users can use core app normally.
- Signed-in users receive sync without credential sync.

## Phase 4: Experimental Subscription Bridge (4-6 weeks)
Work:
- Add ChatGPT Plus and Claude Pro bridge adapters.
- Feature flags, user consent, health checks, kill-switch.
- Automatic fallback flows.

Exit criteria:
- Bridge failures do not degrade normal provider chat.
- Explicit experimental state is visible and enforceable.

## Phase 5: Polish and Distribution (2-3 weeks)
Work:
- Packaging and auto-update.
- Performance optimization.
- Cross-platform QA and docs.

Exit criteria:
- Installable builds on target OSes.
- Observability + release gates in place.
