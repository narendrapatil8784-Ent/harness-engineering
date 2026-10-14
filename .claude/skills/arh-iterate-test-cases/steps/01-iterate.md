# Phase 1 — Iterate

Goal: invoke `test-case-agent` in **iteration mode** with the baseline set + the user's
delta. The agent already knows how to author every layer (it loads `test-case-generation`
and all its `layers/*.md`); this step routes inputs into it and pins the delta discipline.

## Procedure

Invoke `test-case-agent` with the following context block prepended to its normal prompt:

```
## Iteration context (from /arh-iterate-test-cases)

You are iterating, not regenerating. Read docs/test-cases/<story_id>/index.json and the
layer files its files map lists as your BASELINE, then apply the requested change as a
DELTA on top of it. Skip your normal step 3 full-generation; everything else in your
procedure (inputs, requirement_id validation, coverage audit) applies unchanged.

- story_id:   <story_id>
- round:      <N>
- mode:       feedback | sync | reset
- feedback:   <verbatim text from --feedback, or "(n/a)">
- tc_filter:  <TC-id, or "(none)">
- baseline:   docs/features/<story_id>/test-cases.history/round-<N>-<iso>/
              (the pre-edit copy; diff against it when unsure what changed)

Delta rules (all from the test-case-generation skill — § File layout and
§ Index-update contract are binding):

1. PRESERVE on every TC you do not change: its id, its `last_run` block, and any
   integration-added fields it carries. On a TC you modify, change only the fields the
   delta names — the rest survives byte-identical.
2. New TC ids = max <NN> across the index files map + 1 (globally sequential; never
   renumber existing TCs).
3. A TC whose `type` or `automatable` changes MOVES to the matching file
   (automatable:false → manual.json, else <type>.json); create the file if absent,
   delete a layer file that becomes empty.
4. Every add / remove / move updates index.json in the same operation: counts, the
   files map, and a re-run of coverage_audit. A modify that changes a TC's
   requirement_id (a re-anchor) also re-runs coverage_audit — counts and the files map
   stay, but the audit is stale the moment the anchor moves. `uncovered` must stay [].
5. A removal that would leave an AC / delta-FR / budgeted-NFR uncovered is REFUSED —
   report the id and the coverage it carries instead of deleting. Coverage minimum is
   non-negotiable; shrink coverage by changing the story, not the tests.
6. Adds are cross-checked against REQUIREMENTS.md ## Scope → Out: — an Out-scope
   requirement gets no TC.
7. Mode `sync`: enumerate the story ACs + PRD delta-FR/NFR ids, diff against
   coverage_audit. Generate TCs for uncovered ids; list (do NOT auto-delete) any TC
   whose requirement_id no longer resolves — those are removal CANDIDATES for the
   orchestrator to confirm. Precedence: for BASELINE TCs during sync, an unresolvable
   requirement_id is a removal candidate under this rule, NOT a defect to fix — the
   refuse/fix validation gate applies only to TCs you create or change this round.
   Never silently rebind a baseline TC's requirement_id to a different requirement.
   Resolution alone is not enough: for each covered id, check the anchor's CURRENT text
   still matches the TC's given/when/then intent — an id that resolves but now describes
   something else (requirements were renumbered) makes the TC a RETARGET candidate,
   surfaced exactly like removal candidates, never silently kept or rebound.
8. Mode `reset`: regenerate the full set from the current PRD, but carry over each
   surviving TC's integration-added fields and last_run by id wherever its
   given/when/then is unchanged. A reworded TC is a different test — it gets a NEW id
   (files map max + 1; never reuse the old id) and loses nothing it never had. Its old
   id counts as REMOVED in the hand-off, so Phase 2 comments the old tracker issue for
   manual close and pushes the new one — never a silent identity swap.
9. Write order: layer files FIRST, index.json LAST (same rule as your normal
   procedure). A crash then leaves at worst an unindexed TC — invisible and harmless —
   never a files-map entry pointing at a TC that does not exist.
10. After every file write, re-validate it parses as JSON; restore that file from your
   in-memory copy on failure.

Extend your normal hand-off with:
Added: <ids | none> / Modified: <ids | none> / Removed: <ids | none> /
Moved: <id: old-file → new-file | none> / Removal candidates (sync): <ids | none> /
Retarget candidates (sync): <ids | none>
```

## Orchestrator follow-up

- **Consistency check (always, even on agent error):** after the agent returns — or
  fails — verify `index.json` against the directory: every mapped TC id appears exactly
  once across the layer files, and in exactly the file its `files`-map entry names (this
  is what catches a crashed MOVE — the map pointing at the old file, or the TC present
  in two files); every TC id found in any layer file appears in the map; and `counts`
  (total, automatable, manual, by_type) match the actual totals. On any mismatch: STOP
  before Phase 2 — report the mismatch and point at
  this round's baseline archive (`docs/features/$ARGUMENTS[0]/test-cases.history/round-<N>-…/`)
  for manual restore. Never auto-restore over the user's files, and never proceed to
  tracker sync or a gate write on an inconsistent set.

- **Removal / retarget candidates** (sync mode): surface each to the user with the TC's
  title and the unresolved (or content-drifted) `requirement_id`; act only on
  confirmation (one more `test-case-agent` invocation with a `--feedback`-shaped
  directive naming the confirmed ids and the action — remove, or retarget to the named
  id). Never auto-delete or auto-rebind on the first pass.
- **Refused removals**: report verbatim — the fix is a story/PRD change, not a retry.
- **Coverage gap** in the hand-off (`uncovered` non-empty after the agent's one
  self-correction round): stop and surface before Phase 2 — do not sync a broken set to
  the tracker.

## Anti-patterns

- Skipping the baseline read — without it, "iteration" is just "redraft" and ids,
  `last_run`, and returned keys get lost. That loss is exactly what this command exists
  to prevent.
- Renumbering ids to close gaps after a removal — `regression-<id>` tags and tracker
  links point at the old ids; a gap in the sequence is correct and harmless.
- Applying a `--tc`-narrowed edit to neighbours "while in there" — the filter is the
  scope; anything else is a new invocation.
