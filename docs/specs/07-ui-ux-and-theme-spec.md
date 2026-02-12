# UI UX and Theme Spec

## UX Priorities
1. Fast chat interaction and clear provider visibility.
2. Explicit auth state (guest vs signed in).
3. Explicit experimental state for bridge providers.
4. Reliable fallback guidance when any provider path fails.

## Required UI Surfaces
- Provider selector showing auth tier and readiness.
- Account section showing current `AuthMode` and sync status.
- Experimental badge for bridge-connected providers.
- Settings pages for provider config, user auth, and bridge controls.

## Theme and Design
- Preserve existing design direction: glassmorphism, warm neutrals, monospace-first typography.
- Keep theme token system JSON-driven.
- Ensure theme switching does not affect functional status indicators.

## Accessibility and Clarity
- Warnings/experimental labels must not rely on color alone.
- Keyboard navigation for settings and provider selection is required.
- Error states must provide direct recovery actions.
