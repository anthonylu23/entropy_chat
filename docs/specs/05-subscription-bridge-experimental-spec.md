# Subscription Bridge Experimental Spec

## Status
Core roadmap feature with strict experimental controls.

## Bridge Status Contract
`BridgeStatus = "disabled" | "experimental_enabled" | "active" | "expired" | "failed" | "blocked_by_killswitch"`

## Guardrails (Mandatory)
1. Global feature flag default OFF.
2. Provider-level enablement requires explicit consent.
3. Runtime kill-switch evaluated before every bridge request.
4. Bridge adapters isolated from stable provider path.
5. Automatic fallback to stable provider auth path on failure.

## Consent UX
- Must show warning about instability and possible terms risks.
- Must store versioned consent timestamp per provider.
- Must require re-consent when warning version changes.

## Operational Controls
- Health checks on bridge sessions and token validity.
- Backoff and cool-down after repeated failures.
- Clear user-visible status and remediation actions.

## Failure Isolation
- Bridge startup cannot block app startup.
- Bridge failure cannot prevent API-key/OAuth provider usage.
- Bridge exceptions must be contained and typed.

## Logging and Privacy
- No raw bridge cookie/session material in logs.
- Redact tokens in errors/telemetry.
- Keep bridge secrets local-only and encrypted.
