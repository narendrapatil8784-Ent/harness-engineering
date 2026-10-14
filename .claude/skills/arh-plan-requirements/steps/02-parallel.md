# Phase 2 — Parallel: test cases, design, tracker

The PRD (`docs/features/$ARGUMENTS/REQUIREMENTS.md`) is complete from Phase 1. Three units of work
depend only on it and are independent of each other — dispatch them **concurrently in a single
turn** (multiple `Task` calls in one assistant message), then barrier before Phase 3.

All three READ the finished PRD and write disjoint targets, so there is no write conflict:

| Agent | When | Reads | Writes |
|---|---|---|---|
| `test-case-agent` | always | PRD `## Functional` / `## Non-functional requirements` | `docs/test-cases/$ARGUMENTS/` (index.json + per-layer files) |
| `ux-agent` (provider from `integrations.design`) | `design_mode != none` | PRD `## Screen inventory` | `DESIGN.md` + `design = complete` in `state.json` |
| `issue-tracking-agent` | tracker configured (`provider != none`) | PRD | tracker subtask + parent transition (remote); returns the subtask key |

## State-write safety (why this is race-free)

Only `ux-agent` writes `state.json` during this phase (`design = complete`). `test-case-agent`
writes no state. `issue-tracking-agent` performs remote operations only and RETURNS the subtask
key — the `tracker_prd` state write is deferred to Phase 3 (Consolidate). So exactly one writer
touches `state.json` in the parallel wave; there is no read-modify-write race.

## Regeneration guard (when test cases already exist)

Before dispatching, check `docs/test-cases/$ARGUMENTS/index.json`. When it exists, this run is a
REGENERATION over a live set that may carry integration-added returned keys (tracker pushes) and
per-TC `last_run` history (validation runs) — a from-scratch rewrite would wipe both, orphan every
pushed tracker issue, and duplicate them all on the next push. So:

1. Archive the baseline first: copy `index.json` + every layer file its `files` map lists to
   `docs/features/$ARGUMENTS/test-cases.history/round-<N>-<ISO8601>/`, where `N = prior_max + 1`
   over that directory (same archive `/arh-iterate-test-cases` uses; idempotent, humans-only).
2. Prepend this carry-over directive to the `test-case-agent` prompt:

   > ## Regeneration context (from /arh-plan-requirements Phase 2)
   > An existing set lives at docs/test-cases/<story_id>/ — read index.json and its layer files
   > BEFORE generating. Regenerate the full set from the current PRD, but for every TC whose
   > given/when/then is unchanged from the existing set, carry over its id, its `last_run` block,
   > and any integration-added fields byte-identical. A reworded TC is a different test — it gets
   > a new id (max <NN> across the existing files map + 1; never renumber or reuse) and loses
   > nothing it never had. Write layer files first, index.json LAST, per the
   > `test-case-generation` § Index-update contract.

When `index.json` does not exist and no legacy flat manifest exists either (first run), dispatch
plain — full generation is correct.

A legacy flat `docs/test-cases/$ARGUMENTS.json` (pre-v4) gets the SAME guard, with the flat file
as the baseline: archive that one file to the round directory, and issue the directive with its
first line adjusted to name the flat file as the existing set. Carry-over semantics are identical —
this is the migration path `test-case-generation` § Migrating promises: ids, `last_run` blocks, and
integration-added fields survive the move to the per-layer layout.

**Next-id source on the flat path.** The directive's new-id rule reads the `files` map, and a flat
manifest has none — there is no `index.json` yet. On this path the id registry is the flat file's
own `test_cases[]` array: the next id is **max `<NN>` across every `test_cases[].id` in the flat
file + 1**, computed ONCE over the archived baseline before any writing, never over the partially
written per-layer directory. Adjust the directive's parenthetical accordingly. This is the only path that
converts a human's live data, so the rule is stated rather than inferred: an id derived from an
empty map would restart at 01 and collide with every already-pushed tracker issue. The `files` map
written into the new `index.json` must list every carried-over id, so the NEXT run reads the map as
usual and the flat branch is never taken again.

Delete the flat file after the per-layer directory is written (its archived copy is the round
baseline).

## Dispatch

1. In one turn, invoke concurrently:
   - `test-case-agent` with `$ARGUMENTS` (plus the § Regeneration guard directive when it applies).
   - `ux-agent` with `$ARGUMENTS` — only when `design_mode != none` (the provider-specific skill is
     wired by the composer). It reads `## Screen inventory`, writes `DESIGN.md`, replaces the
     `## Visual spec` stub with a one-line pointer, and sets `design = complete` (B-tier; mirror to
     index).
   - `issue-tracking-agent` — only when a tracker is configured (see the call spec below).
2. **Barrier** — wait for every dispatched agent to finish before Phase 3.
3. Collect their hand-offs — the test-case coverage result, the DESIGN.md pointer, and the tracker
   subtask key — and carry them into Phase 3.

## issue-tracking-agent call (when tracker configured)

- Operation: `upsert-subtask`
- Parent story key: from `docs/stories/$ARGUMENTS.md` traceability header
- Subtask name: `Plan Requirements: <story title>`
- Subtask body: full markdown of `docs/features/$ARGUMENTS/REQUIREMENTS.md`
- Labels: `plan-requirements`, plus project labels
- Then advance the **parent story** to agnostic stage `in-progress` — best-effort, non-blocking:
  on any failure (no matching status, permission, MCP unavailable) log it and continue, never fail
  the phase, never roll back.

The agent does NOT write `state.json`; it returns the subtask key for Phase 3. Skip the tracker
branch silently when `provider: none`.
