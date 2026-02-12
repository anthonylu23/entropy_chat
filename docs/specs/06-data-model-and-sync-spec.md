# Data Model and Sync Spec

## Objective
Maintain local-first persistence with optional selective cloud sync.

## Local SQLite Domains
Required local tables:
- `providers`
- `conversations`
- `messages`
- `settings`
- `user_session_state`
- `bridge_consents`
- `bridge_health_events`
- `provider_request_events`
- `sync_queue`
- `sync_conflicts`

## Cloud Domains
Cloud tables hold:
- user profile identity metadata
- memory records
- preferences/sync metadata

Cloud must not hold:
- provider credentials
- OAuth refresh tokens for providers
- bridge session tokens/cookies
- raw local conversation logs unless explicitly future-scoped

## Sync Policy
- Guest mode: no cloud writes.
- Signed-in mode: selective sync only.
- Conflict resolution:
  - preferences: last-write-wins with timestamp
  - memory events: append + dedupe key

## Integrity and Migration
- Schema changes are versioned migrations.
- Migration scripts must be idempotent.
- Include data backfill rules when adding new enum/status fields.
