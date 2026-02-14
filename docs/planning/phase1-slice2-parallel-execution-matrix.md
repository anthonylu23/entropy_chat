# Phase 1 Slice 2 Parallel Execution Matrix

Setup assumed: 1 orchestrator agent (planning/review/merge) + 2 coding agents.

Source of truth for task IDs: `docs/planning/phase1-slice2-arc-workspace-plan.md` (`S2-*` tasks).

Worktree mode: not used. This matrix is optimized for a single shared working tree.

## Role Split

- `Orchestrator`: task assignment, dependency gating, code review, merge sequencing, regression checks.
- `Coder-A (Data/IPC)`: DB migration, data backfill, IPC contracts, main/preload wiring.
- `Coder-B (UI/UX)`: shell components, UI state, pane behavior, keyboard shortcuts, visual polish.

## File Ownership (Conflict Control)

- `Coder-A` owns `electron/db/**`, `electron/ipc/**`, `electron/preload.ts`, `shared/types.ts`, `shared/validators.ts`, `electron/ipc/channels.ts`, renderer IPC client typing.
- `Coder-B` owns `src/components/layout/**`, `src/stores/uiStore.ts`, keyboard shortcut wiring, shell styling updates.
- `Orchestrator` is the only agent that edits both lanes in one commit when integration is required.

## Single-Worktree Operation Rules

- Use lane lock files before editing: `agents/locks/coder-a.lock` and `agents/locks/coder-b.lock`.
- Only the lane owner may hold its lock. Orchestrator may break stale locks after timeout.
- Agents do not run `git checkout`, `git switch`, or `git rebase` while another agent is active.
- Agents deliver changes as patch artifacts: `agents/patches/coder-a/<task-id>.patch` and `agents/patches/coder-b/<task-id>.patch`.
- Orchestrator is the only role that applies patches to the integration branch and resolves conflicts.

## Parallel Task Matrix

| Batch | Owner | Task IDs | Parallel-safe with | Status |
| --- | --- | --- | --- | --- |
| `B0` | Orchestrator | Freeze acceptance checklist and assign IDs in tracker | N/A | `Complete` |
| `A1` | Coder-A | `S2-DB-01..S2-DB-16`, `S2-MIG-01..S2-MIG-06` | `B1` | `Complete` |
| `B1` | Coder-B | `S2-STORE-01..S2-STORE-08`, `S2-UI-01..S2-UI-06`, `S2-KEY-01..S2-KEY-05` | `A1` | `Complete` |
| `A2` | Coder-A | `S2-IPC-01..S2-IPC-15`, `S2-WIRE-01..S2-WIRE-11` | `B2` | `Complete` |
| `B2` | Coder-B | `S2-UI-07..S2-UI-08` (pane targeting + single-instance behavior), final shell polish | `A2` | `Complete` |
| `A3` | Coder-A | `S2-INT-03` backend behavior tests + data semantics hardening | `B3` | `Complete` |
| `B3` | Coder-B | `S2-INT-01`, `S2-INT-02`, `S2-INT-04` UI integration hardening | `A3` | `Complete` |
| `INT` | Orchestrator | `S2-INT-05` acceptance/regression pass + merge sequencing | After `A3` and `B3` | `Complete` |
| `A4` | Coder-A | `VIS-A1`, `VIS-A2`, `VIS-A3`, `VIS-A4` (design-system and docs lane) | `B4` (after `VIS-A1`) | `Planned` |
| `B4` | Coder-B | `VIS-B1`, `VIS-B2`, `VIS-B3`, `VIS-B4`, `VIS-B5` (layout visual alignment lane) | `A4` (after `VIS-A1`) | `Planned` |
| `INT-VIS` | Orchestrator | Visual alignment acceptance pass (`bun test tests`, `bun run typecheck`, `bun run build`) | After `A4` and `B4` | `Planned` |

## Dependency Gates

- `Gate-1` (`A1` complete): DB schema + migration must land before any space/pinned data writes are exercised end-to-end.
- `Gate-2` (`A2` complete): typed contracts and preload surface must land before final UI-to-IPC integration.
- `Gate-3` (`B1` complete): shell/store/shortcut behavior can be reviewed independently before backend wiring is merged.
- `Gate-4` (`A3` + `B3` complete): integration hardening tasks (`S2-INT-*`) must be done before final acceptance.
- `Gate-5` (`INT`): run full acceptance checks from `docs/planning/phase1-slice2-arc-workspace-plan.md`.
- `Gate-6` (`VIS-A1` complete): flat Arc-minimal tokens must land before parallel visual refactor work.
- `Gate-7` (`A4` + `B4` complete): visual-direction alignment tasks (`VIS-*`) must be complete before visual acceptance.
- `Gate-8` (`INT-VIS`): run visual acceptance checks (`bun test tests`, `bun run typecheck`, `bun run build`).

## Patch and Merge Protocol (No Worktrees)

- Patch sizing rule: one patch should cover one contiguous batch or a small subset of IDs in a single lane.
- Patch naming rule: prefix with task IDs, example `S2-DB-01..04_create-spaces-table.patch`.
- Apply rule: orchestrator applies patches in order `A1 -> B1 -> A2 -> B2 -> A3 -> B3 -> INT -> A4 -> B4 -> INT-VIS`.
- Apply command pattern (orchestrator): `git apply --index agents/patches/coder-a/<patch-file>` and `git apply --index agents/patches/coder-b/<patch-file>`.
- Commit message rule (orchestrator): include all landed task IDs in subject prefix.

## Orchestrator Review Checklist

- Verify patch task IDs match changed files and acceptance intent.
- Reject patches that mix both lanes without explicit integration reason.
- Confirm no unchecked `S2-*` task is marked complete without code/tests.
- Confirm keyboard shortcuts and focus/split behavior still preserve existing streaming chat flow.
- Run final regression pass before marking Slice 2 tasks shipped.
