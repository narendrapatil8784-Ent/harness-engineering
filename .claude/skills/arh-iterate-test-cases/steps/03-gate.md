# Phase 3 — Gate

Goal: keep the Product Gate honest. An approved gate approved a SPECIFIC test-case set;
after a delta, that approval no longer covers what exists on disk.

## When the gate was APPROVE at entry (recorded in Phase 0) AND Phase 1 changed anything

1. Write `gate: "PENDING"` per `docs/state/SCHEMA.md § Writer rule` — B-tier (mirrored):
   - PRIMARY — `docs/features/$ARGUMENTS[0]/state.json`:
     ```json
     { "gate": "PENDING", "last_updated": "<iso8601>" }
     ```
   - MIRROR — `docs/state/features.json[$ARGUMENTS[0]]`:
     ```json
     { "gate": "PENDING", "last_updated": "<iso8601>" }
     ```
   Only `gate` and `last_updated` move — `phase`, `prd`, and every other field stay
   untouched.

2. Immediately offer re-approval with **`AskUserQuestion`** — never have the user type the
   verdict, never auto-answer it. One question, three options, same state literals as the
   Product Gate (Approve→`APPROVE`, Request changes→`CHANGES`, Pending→`PENDING`), against
   this condensed checklist surfaced in the question text:

   - `coverage_audit.uncovered == []` in `docs/test-cases/$ARGUMENTS[0]/index.json`
   - every changed TC's `requirement_id` resolves to a real AC / FR / NFR id
   - the reviewer has seen the Added / Modified / Removed delta from Phase 1

3. Apply the verdict:
   - **Approve** → write `gate: "APPROVE"` (primary + mirror, `last_updated`). The
     approval now covers the iterated set; downstream phases proceed as before.
   - **Request changes** → ask a follow-up free-text question for the specific changes
     (same discipline as the Product Gate — the verdict question never collects prose).
     Then write `gate: "CHANGES"` (primary + mirror), append the collected changes to
     `REQUIREMENTS.md ## Change requests`, and point at the fix:
     `Re-run /arh-iterate-test-cases <story_id> --feedback "<the collected changes>"`.
   - **Pending** → leave `gate: "PENDING"`. State plainly:
     `/arh-plan-implementation and /arh-implement stay blocked until the gate passes.`

## When the gate was PENDING or CHANGES at entry AND Phase 1 changed anything

A previous round (this command's, or the Product Gate's) already opened the gate — there
is no APPROVE to drop, so skip step 1 and go straight to step 2's `AskUserQuestion`
re-approval, then apply the verdict per step 3. This is how a CHANGES round re-closes:
the previous round's step 3 pointed the user at
`/arh-iterate-test-cases <story_id> --feedback "…"`, and this re-run collects the fresh
verdict against the fixed set. Without this branch the gate could never return to
`APPROVE` through this command.

## When the story has never been gated (no `gate` field written yet)

No gate write at all. Pre-gate iteration is normal drafting; the Product Gate in
`/arh-plan-requirements` Phase 4 remains the single FIRST-approval site — this command
only re-collects a verdict where Phase 4 has already collected one.

## When Phase 1 changed nothing

(No-op sync, refused removal only, or the agent found nothing to do.) No gate write —
an unchanged set keeps its approval.

## Final summary

Emit the command hand-off block from the SKILL body (round, mode, Added / Modified /
Removed / Moved ids, coverage, tracker counts from Phase 2, gate outcome, baseline
archive path).
