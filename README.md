# Entropy Chat

Phase-1 foundation scaffold for a desktop AI chat app using Electron, React, and TypeScript.

## Prerequisites

- Bun 1.1+ (preferred runtime and package manager)
- Node.js 20+ (fallback only, for environments where Bun is unavailable)

## Run Commands

- `bun install`
- `bun run dev`
- `bun run typecheck`
- `bun run build`
- `bun run preview`

If Bun is not available in your environment, use `npm install` and `npm run <script>` as a temporary fallback.

## Architecture Notes

- Renderer is isolated from Node APIs.
- Main and renderer communicate through a typed preload API exposed at `window.entropy`.
- IPC payloads are validated in both preload and main process handlers.

## Current Scope

This bootstrap includes:

- Electron + React + TypeScript strict app wiring
- Typed IPC skeleton (`system.ping`, `settings.get`, `settings.set`)
- Shared types and validators
- DB bootstrap stubs for later SQLite integration

Upcoming Phase-1 implementation will add:

- SQLite (`better-sqlite3`) schema + migrations
- encrypted credential storage (`safeStorage`)
- initial chat UI and OpenAI provider integration
