# Provider Auth and Registry Spec

## Objective
Unify provider selection and request dispatch while supporting multiple auth tiers.

## Auth Tier Contract
`ProviderAuthTier = "api_key" | "oauth" | "subscription_bridge"`

## Registry Requirements
Each provider record must declare:
- provider id and display name
- supported models
- auth tier
- capability set (streaming/tools/artifacts/etc.)
- status (`ready`, `degraded`, `unavailable`)

## Tier Rules
1. API key providers: local encrypted key storage.
2. OAuth providers: device/browser flow with refresh handling.
3. Subscription bridge providers: delegated to bridge subsystem with strict gating.

## Provider/Auth Separation
- A provider can be configured without user cloud sign-in.
- User cloud sign-in never implies provider auth completion.
- Provider credential lifecycle is independent of user auth lifecycle.

## Model Switching
- Must reserialize history per target provider format.
- Capability mismatches degrade gracefully with explicit user notice.

## Telemetry (Local/Internal)
Track request outcomes by provider/model/auth tier to support diagnostics and fallback prompts.
