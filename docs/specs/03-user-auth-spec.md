# User Auth Spec

## Objective
Support two modes: local guest usage by default, and optional cloud sign-in for cross-device sync.

## Auth Modes
`AuthMode = "guest_local" | "cloud_signed_in"`

## Behavior Requirements
1. App starts in `guest_local` unless user explicitly signs in.
2. Guest users can chat, configure providers, and store local history/settings.
3. `cloud_signed_in` enables sync of memory/preferences/profile metadata only.
4. Signing out disables sync but keeps local conversations/settings/provider credentials.

## UI Requirements
- Header/account panel must clearly show Guest vs signed-in identity.
- Settings must include explicit sign-in/out controls.
- Sync status must be visible (idle, syncing, error).

## Failure Handling
- Network/auth backend unavailable: app remains fully usable in guest mode.
- Expired session: downgrade to guest mode with non-destructive prompt.

## Security Rules
- User auth tokens stored encrypted at rest.
- User auth tokens are separate from provider credentials.
- No user auth token exposure to renderer beyond opaque session state.
