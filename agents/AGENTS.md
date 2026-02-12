# Entropy Chat Agents Guide

## Mission and Scope
Entropy Chat is a local-first desktop AI chat app with multi-provider support, optional cloud sync, and an experimental subscription bridge track. Agent work should prioritize reliable core chat behavior and strong boundary/security discipline.

## Coding Standards and Architecture Principles
- TypeScript strict mode for shared contracts and IPC types.
- Renderer and main process responsibilities must remain separated.
- Keep provider auth separate from user auth.
- Prefer explicit contracts for status enums and state transitions.
- Maintain local-first behavior and graceful fallbacks.

## Non-Goals and Safety Constraints
- Do not require cloud sign-in for baseline app usage.
- Do not sync provider credentials or bridge tokens to cloud.
- Do not let experimental bridge code block stable provider paths.
- Do not expose raw secrets in logs, telemetry, or renderer state.

## Workflow Conventions
### Branching
- Use `codex/<short-task-name>` branch naming.

### Pull Request Checklist
- Scope and acceptance criteria documented.
- Tests added or updated for changed behavior.
- Security/privacy impact reviewed.
- Fallback behavior verified.

### Testing Expectations
- Run targeted unit/integration tests for changed modules.
- Validate IPC contract changes end-to-end.
- Validate guest mode and signed-in mode behavior for auth changes.

## Current Phase Focus
- Active roadmap reference: `docs/specs/00-master-roadmap.md`.
- Current implementation target phase: _fill in as project progresses_.
- Immediate priorities: _fill in_.

## Active Decisions
- User auth mode: Hybrid local + cloud sync.
- Subscription bridge posture: Core experimental with strict guardrails.
- Source-of-truth plans: `docs/specs/*`.

## Change Log
- 2026-02-10: Initialized `docs/specs` and `agents/agents.md` baseline.
- _Add future changes below this line._
