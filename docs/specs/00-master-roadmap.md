# Entropy Chat Master Roadmap

## Purpose
This document is the source-of-truth index for Entropy Chat planning artifacts. It links all active specs and defines the execution order.

## Spec Index
1. [01 Product Scope and Phasing](./01-product-scope-and-phasing.md)
2. [02 Architecture and Process Boundaries](./02-architecture-and-process-boundaries.md)
3. [03 User Auth Spec](./03-user-auth-spec.md)
4. [04 Provider Auth and Registry Spec](./04-provider-auth-and-registry-spec.md)
5. [05 Subscription Bridge Experimental Spec](./05-subscription-bridge-experimental-spec.md)
6. [06 Data Model and Sync Spec](./06-data-model-and-sync-spec.md)
7. [07 UI UX and Theme Spec](./07-ui-ux-and-theme-spec.md)
8. [08 Security Privacy and Compliance Spec](./08-security-privacy-and-compliance-spec.md)
9. [09 Testing Observability and Release Spec](./09-testing-observability-and-release-spec.md)

## Program Priorities
1. Hybrid user auth: usable guest-local by default, optional cloud sign-in for sync.
2. Stable provider stack via official APIs/OAuth before experimental bridge expansion.
3. Subscription bridge is a core feature, but strictly experimental and isolated.
4. Explicit separation of user auth from provider/subscription auth in code and UX.
5. Release quality is gated by test, observability, and fallback behavior.

## Revised Phase Order
1. Phase 1: Local Core (3-4 weeks)
2. Phase 2: Multi-Provider Stable (4-5 weeks)
3. Phase 3: User Auth and Cloud Sync (3-4 weeks)
4. Phase 4: Experimental Subscription Bridge Track (4-6 weeks)
5. Phase 5: Polish and Distribution (2-3 weeks)

## Shared Contracts
- `AuthMode = "guest_local" | "cloud_signed_in"`
- `ProviderAuthTier = "api_key" | "oauth" | "subscription_bridge"`
- `BridgeStatus = "disabled" | "experimental_enabled" | "active" | "expired" | "failed" | "blocked_by_killswitch"`

See detailed contract ownership in:
- [03 User Auth Spec](./03-user-auth-spec.md)
- [04 Provider Auth and Registry Spec](./04-provider-auth-and-registry-spec.md)
- [05 Subscription Bridge Experimental Spec](./05-subscription-bridge-experimental-spec.md)
- [06 Data Model and Sync Spec](./06-data-model-and-sync-spec.md)

## Legacy Plan
The original single-file plan is archived at:
- `docs/archive/project-plan-v1.md`
