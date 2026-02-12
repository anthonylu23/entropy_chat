# Security Privacy and Compliance Spec

## Threat Model Focus
- Credential leakage across process boundary.
- Sensitive token leakage to logs or telemetry.
- Over-syncing local secrets to cloud storage.
- Experimental bridge path destabilizing core app.

## Security Controls
1. Typed IPC with input/output validation.
2. Credential encryption at rest (local only).
3. Decrypt-on-use in main process only.
4. Redaction middleware for logs/errors.
5. Least-privilege handling for auth and provider modules.

## Privacy Controls
- Credentials and bridge materials never leave local device.
- Sync payload allowlist for cloud-bound data.
- Explicit user consent for experimental bridge feature.

## Compliance Posture
- Bridge is marked experimental and user-opt-in.
- Terms-risk warning is required before activation.
- Architecture must support disabling bridge globally if policy changes.
