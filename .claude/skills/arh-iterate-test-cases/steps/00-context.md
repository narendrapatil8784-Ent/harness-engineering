# Phase 0 — Context + preconditions

Goal: parse the invocation arguments, verify preconditions, archive the baseline, and
prepare the iteration context for test-case-agent.

## Argument parsing

`$ARGUMENTS` is split positionally:

- `$ARGUMENTS[0]` → story id (e.g. `CHK-014`). Required; abort with
  `Usage: /arh-iterate-test-cases <story-id> [--feedback "..."] [--sync] [--tc <TC-id>] [--reset]`
  when missing.
- Remaining args scanned for `--feedback "<text>"` (value captured verbatim — may include
  spaces; preserve the user's prose), `--sync`, `--tc <TC-id>`, and `--reset`.
- Exactly one mode of `--feedback` | `--sync` | `--reset` is required. None (or more than
  one) → abort with the usage line plus
  `Pick one mode: --feedback (directed delta), --sync (catch coverage up to the PRD), --reset (regenerate against the current PRD).`
- `--tc <TC-id>` composes with `--feedback` only; with `--sync` or `--reset` it is an
  error (`--tc narrows a directed edit; sync and reset are whole-set operations.`).

Store the parsed args:

```
story_id  = $ARGUMENTS[0]
mode      = feedback | sync | reset
feedback  = <--feedback value | empty>
tc_filter = <--tc value | empty>
```

## Preconditions

Load skill `phase-preconditions`. Apply the `/arh-iterate-test-cases <id>` row:

- `docs/test-cases/$ARGUMENTS[0]/index.json` must exist.
  - Missing → stop: `No test cases for <story_id>. Run /arh-plan-requirements <story_id> first.`
  - Missing, but legacy flat `docs/test-cases/$ARGUMENTS[0].json` exists → stop:
    `Legacy single-file test-case manifest found — re-run /arh-plan-requirements <story_id> to regenerate the per-layer layout.`
- `state[story_id].prd == "complete"` — otherwise abort:
  `Run /arh-plan-requirements <id> first; no PRD to iterate against.`

Do NOT require `gate == APPROVE`. Iteration runs at any phase — before the Product Gate
(refining the draft set), after it (Phase 3 handles the gate consequence), or between
`/arh-implement` rounds (the fix-loop already adds TCs post-APPROVE by the same contract).

**One timing rule:** do NOT run this while a `/arh-implement` Validate ∥ Review gate round
is in flight in another session. The validation-agent writes `last_run` into the same
layer files, and the gate's tree snapshot deliberately excludes `docs/test-cases` — a
concurrent iterate is invisible to the gate and can clobber freshly written results with
its stale baseline. Finish (or stop) the round first.

## Read in order

1. `docs/test-cases/$ARGUMENTS[0]/index.json` — `counts`, the `files` map (the id registry),
   `coverage_audit`. Load skill `test-case-generation` for the schema, the § File layout,
   and the § Index-update contract this whole command operates under.
2. The layer files the `files` map lists — the baseline TC set.
3. `docs/stories/$ARGUMENTS[0].md` `## Acceptance criteria` and
   `docs/features/$ARGUMENTS[0]/REQUIREMENTS.md` FR/NFR sections — the coverage obligation
   (`--sync` diffs against these; `--feedback` validates new `requirement_id`s against them).
4. `docs/features/$ARGUMENTS[0]/state.json` — `gate` (recorded now; Phase 3 compares against
   it), `tracker_story` presence (Phase 2 needs it).

## Round counter

`N = prior_max + 1`, where `prior_max` is the highest `round-<N>-*` under
`docs/features/$ARGUMENTS[0]/test-cases.history/` (0 when the directory is absent). Derived,
never stored in state — every invocation is one round, finished or not.

## Archive the baseline

Copy `index.json` + every layer file the `files` map lists to
`docs/features/$ARGUMENTS[0]/test-cases.history/round-<N>-<ISO8601>/`. Idempotent — never
overwrite an existing archive directory (timestamps make collisions vanishingly rare).

The archive is for audit / diff / rollback-by-rolling-forward: future readers can see how
the TC set evolved across rounds. Never read by code; humans (and the Phase 1 baseline
instruction) only. It lives under `docs/features/` so the live `docs/test-cases/<id>/`
directory holds nothing but `index.json` and the files its map lists.

## Reset handling

When `--reset` is passed, nothing is deleted here — the archive above IS the safety copy.
Phase 1 hands test-case-agent the regeneration directive with the carry-over rule
(preserve each surviving TC's integration-added fields and `last_run` by id where its
given/when/then is unchanged).

## Output

```
/arh-iterate-test-cases <story-id>  round <N>
  Mode:        feedback | sync | reset
  Feedback:    <verbatim | (n/a)>
  TC filter:   <TC-id | (none)>
  Baseline:    <T> TCs archived to docs/features/<id>/test-cases.history/round-<N>-<iso>/
  Gate at entry: <value>
  Next:        invoke test-case-agent
```

Then proceed to Phase 1.
