---
name: arh-iterate-test-cases
description: Re-invoke test-case-agent to refine a story's test cases in place — add, modify, remove, or sync with an edited PRD — without re-running /arh-plan-requirements.
argument-hint: "[story-id] [--feedback \"<text>\"] [--sync] [--tc <TC-id>] [--reset]"
disable-model-invocation: true
allowed-tools: Read Write Edit Bash Task AskUserQuestion
---
# /arh-iterate-test-cases

Iterate the test cases for one story without redrafting the PRD or re-running the
`/arh-plan-requirements` fan-out. Use when:

- PO / BA reviews the generated TCs and wants specific cases added, reworded, or removed.
- An AC was edited in the story / PRD and the coverage must catch up (`--sync`).
- One TC needs a body fix — wrong steps, stale test_data, wrong priority (`--tc <TC-id>`).
- The whole set should be regenerated cheaply against the CURRENT PRD without a PRD
  redraft (`--reset`).

Full regeneration via `/arh-plan-requirements` redrafts the PRD and re-runs the whole
three-agent fan-out plus the Product Gate — heavy machinery when only the tests need to
move (its Phase 2 § Regeneration guard does preserve ids, tracker keys, and `last_run`
on unchanged TCs). This command edits as a delta and skips the PRD redraft entirely.

**Input:** `$ARGUMENTS` (story id). Parsed positionally from `$ARGUMENTS[0]`. Flags
`--feedback "<text>"`, `--sync`, `--tc <TC-id>`, and `--reset` are extracted from the
remainder. Exactly one mode (`--feedback` | `--sync` | `--reset`) is required.

## Pipeline

```
0. Context + preconditions  (parse args, existence gate, archive baseline, round counter)
1. Iterate                   (invoke test-case-agent in iteration mode — delta on baseline)
2. Tracker sync              (best-effort: push added, update modified, comment removed)
3. Gate                      (drop APPROVE → PENDING on change; re-collect the verdict —
                              a PENDING/CHANGES gate re-closes here too)
```

## Phase 0 — Context

Read and follow: `${CLAUDE_SKILL_DIR}/steps/00-context.md`

## Phase 1 — Iterate

Read and follow: `${CLAUDE_SKILL_DIR}/steps/01-iterate.md`

## Phase 2 — Tracker sync

Read and follow: `${CLAUDE_SKILL_DIR}/steps/02-tracker.md`

## Phase 3 — Gate

Read and follow: `${CLAUDE_SKILL_DIR}/steps/03-gate.md`

## State writes

This command owns no test-case state field — TC status lives only in
`docs/test-cases/$ARGUMENTS[0]/index.json`, and the round counter is derived from the
archive directory (Phase 0). The ONLY state write is the Phase 3 gate transition
(`gate` is B-tier: primary per-feature `state.json`, mirrored to
`docs/state/features.json`), and only when the story has been gated before (any recorded
`gate` verdict at entry) and a TC actually changed. A never-gated story gets no gate
write — first approval stays with the Product Gate.

## Hand-off

```
Test cases iterated (round <N>).
  Mode:            feedback | sync | reset
  Added:           <ids | none>
  Modified:        <ids | none>
  Removed:         <ids | none>
  Moved:           <id: old-file → new-file | none>
  Coverage:        uncovered=<none | ids>
  Tracker:         <P> pushed, <U> updated, <C> commented | skipped (<reason>)
  Gate:            never gated (no write) | unchanged (<value>) | re-approved (APPROVE) | CHANGES | PENDING
  Baseline:        docs/features/<id>/test-cases.history/round-<N>-<iso>/
```

## Anti-patterns

- Using this command to change SCOPE — a new AC or a requirement change belongs in the
  story / PRD first (`/arh-plan-requirements` on a real scope change); `--sync` then pulls
  the coverage up to it. The test-case-agent will refuse a TC whose `requirement_id`
  resolves to nothing.
- Removing a TC to make the coverage audit pass — the audit fails because coverage IS
  missing; a removal that would leave an AC uncovered is refused in Phase 1.
- Editing the per-layer files by hand instead — possible, but this command applies the
  `test-case-generation` § Index-update contract for you and keeps the tracker in sync.
- Expecting `--reset` to renumber ids from 01 — ids are preserved where the TC's
  given/when/then survives; renumbering breaks `regression-<id>` tags and trace links.
