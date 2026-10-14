# Step 4 — Hand-off (writes the receipt)

Goal: record that a run of this command happened, state plainly what was and was
not gated, and point the next actor at the gates that stand between the draft PR
and a merge. This step is unique to this command — there is no `/arh-implement`
step behind it.

## Contents

- The four outcomes (one committed, three not)
- State write — `phase` only on the committed outcome, forwards only
- Fields this command never writes
- Routing — next action per outcome, and the never-`/arh-implement`-after rule
- Commit-discipline check (report-only)
- Receipt — example plus the no-commit variants

It runs on **all four** outcomes — three from Step 1 and one from Step 2:

- `Evidence: READY` — the packet is green, the work is committed, and a draft PR is
  open (steps 02 and 03 ran). There is no fifth, committed-without-a-PR outcome:
  step 02's § Preflight aborts before staging when there is no VCS provider, no
  draft state at the provider, or no git remote — the three ways a commit could
  otherwise land with nothing holding it. So whenever this outcome fires, a draft
  PR exists and its url is real; never print this header, and never write `phase`,
  on the strength of a commit alone.
- `Evidence: BLOCKED` — round-3 escalation; the packet is red, **nothing was
  committed**, no PR exists.
- `Evidence: not run — clarification pending` — Step 1 paused at the clarification
  round, which sits *before* the evidence pass, so no packet exists at all and
  **nothing was committed**.
- `Commit: none (refused by RC<n>)` — Step 2's inherited release gate refused: RC5
  on a red packet, RC4 on an open agent flag, RC3 on an unaccepted carry-forward.
  Step 03 was skipped, **nothing was committed**, no PR exists.

A stalled or refused run is still a run — a receipt that only exists on success
teaches the reader nothing about the three ways a round can fail to land.

## State write

- Apply per `docs/state/SCHEMA.md § Writer rule`: `phase` and `last_updated` are B-tier (primary per-feature record, mirrored to the index in the same write); `activity_log` is P-tier.
- `phase: "implementation"` means exactly "committed, not yet gated" — write it **only on the committed outcome**, where Step 2 landed a commit **and** a draft PR. Never on a commit without a PR: step 02's § Preflight makes that state unreachable, so if you are somehow looking at one, something went wrong — report it and write nothing.
- On the three no-commit outcomes: write `last_updated` and the `activity_log` entry alone, leave `phase` untouched in both files, and print `Phase: unchanged (nothing committed)` on the receipt.

PRIMARY — `docs/features/$ARGUMENTS/state.json` (full record; `phase` only on the
committed outcome):
```json
{
  "phase": "implementation",
  "last_updated": "<iso8601>",
  "activity_log": ["<one appended entry — shape below>"]
}
```

MIRROR — `docs/state/features.json[$ARGUMENTS]` (B-tier fields only; same rule for
`phase`):
```json
{
  "phase": "implementation",
  "last_updated": "<iso8601>"
}
```

The appended `activity_log` entry:
```json
{
  "command": "develop-feature",
  "description": "Tasks developed; evidence <READY | BLOCKED | not run — clarification pending>; <draft PR <url> | no commit>",
  "timestamp": "<iso8601>",
  "result": "PASS | FAIL",
  "agent": "implementation-agent",
  "phase_transition": "implementation | none"
}
```

- `result` is `PASS` on READY evidence, `FAIL` on BLOCKED and the clarification pause — a round with no trustworthy packet did not pass, whatever the reason.
- `phase_transition` records what this run actually wrote: `"implementation"` when it wrote `phase`, `"none"` when it left `phase` untouched (a no-commit outcome, or a feature already downstream).
- Even with a draft PR open, `phase: "implementation"` is the honest literal: `/arh-implement` writes `review` at its commit step *because* its gate already ran — this command's has not.

**Never write `phase` backwards:**

- Step 0 delta 3 permits a run on an already-committed feature, whose `phase` may already be `review` or `security-reviewed`.
- `docs/state/SCHEMA.md § Transitions` calls a backward transition a bug — the SessionStart context loader would misfile the feature as un-gated work.
- So: read the current `phase` first; write it **only** when absent or at/before `implementation` in the § Transitions order.
- Already downstream → write `last_updated` + the log entry alone, leave `phase` untouched (index mirror included), and print `Phase: left at <current> (already past implementation).` The entry records `phase_transition: "none"`.

Everything else was **written where it happened** — never rewrite it here: `tasks[].status` by the Step 1 scheduler, `impl_evidence` by `evidence-pass`, `impl` / `impl_branch` / `decisions_referenced` by step 02, `tracker_review_comment` by step 03.

## Fields this command never writes

| Field | Whose it is |
|---|---|
| `validation`, `validation_summary` | the `/arh-implement` Step 2 gate, or a standalone `/arh-validate-feature` (skill `validation-execution` § State write). No validation ran here, so there is no verdict to record |
| `review`, `review_report` | the same gate, or a standalone `/arh-review`. A review that did not happen has no report |
| `gate` | `/arh-plan-requirements` Phase 4 — a product-gate verdict, upstream of this command |
| `security`, `security_findings`, `security_report` | `/arh-security-review` |
| `tracker_story`, `tracker_research`, `tracker_prd`, `tracker_plan` | their own upstream phases; step 03 writes `tracker_review_comment` and nothing else |
| `pending_carry_forward[]` | `/arh-implement`'s post-join gate orchestrator, `/arh-human-review` Phase 2, and standalone `/arh-validate-feature` / `/arh-review` |
| `agent_flags[]` | raised as `### AF-NN` blocks in `FLAGS.md` during Step 1; the state array is `/arh-human-review`'s to write on triage |

Writing any of these here would fabricate a receipt for work that did not run —
exactly what the downstream gates read to decide whether they may start. The
draft PR is the honest version of the same statement.

## Routing

| Situation | Next action |
|---|---|
| Evidence READY, draft PR open, no open flags | `/arh-validate-feature $ARGUMENTS` → `/arh-review $ARGUMENTS` → `/arh-security-review $ARGUMENTS` when the governance profile requires it → then a **human** marks the PR ready and merges |
| `Commit: none (refused by RC4)` — open agent flags | Run `/arh-human-review $ARGUMENTS` to triage, then re-run this command. There is no PR yet |
| `Commit: none (refused by RC3)` — unaccepted carry-forwards | `harness carry-forward resolve <id> --evidence <path>`, or re-run with `--accept-pending <ids>`. There is no PR yet |
| `Commit: none (refused by RC5)` — red evidence packet | Same remedy as a BLOCKED packet below: fix the failing dimension and re-run this command |
| Questions queued in `QUESTIONS.md` | `/arh-clarify $ARGUMENTS`, then `/arh-clarify $ARGUMENTS --apply`, then re-run this command |
| Evidence BLOCKED | Read `docs/features/$ARGUMENTS/EVIDENCE-ESCALATION.md`, fix the cause, re-run this command. Recommend nothing downstream |
| Tasks left `blocked` | Surface each task's `reason` and stop. No downstream recommendation — a partially-developed DAG is not ready for a gate or a PR |

Notes on the chain:

- It actually runs: a standalone `/arh-validate-feature` writes the `validation` literal, and `/arh-review`'s Phase 0 precondition reads it (skill `validation-execution` § State write; `phase-preconditions` § Matrix).
- The PR's `## Gates pending` checklist is **human-maintained**: tick each box yourself as the gate passes — no harness command edits that checklist; this command's own re-run refreshes the PR body's lists but always keeps your ticks.
- Tell the user: an unticked box means "not confirmed", never "not run" — nobody should wait for a tick that will never arrive on its own.

**Once this command has committed a feature, do not run `/arh-implement` on it:**

- A commit and a draft PR already exist; `/arh-implement`'s Step 5 would commit a second time onto the same branch and try to open a second PR.
- `/arh-implement` stays the all-in-one command **for a feature that has not been started** — code, gate, and commit in one run.
- Once this command has opened the PR, the route to merge is the gate chain above.
- The user *can* still choose `/arh-implement` on purpose — it warns at entry and asks, per `phase-preconditions` § Already-committed warning; this receipt just never recommends it.

## Commit-discipline check (report-only)

- Run `git status --short` and `git log --oneline -n 2`; print both under the receipt.
- Expected on a READY run: the feature commit on `feature/$ARGUMENTS` (plus the referenced step's trailing activity-log commit when `docs/activity/` changed), a clean or in-scope-only tree, nothing staged.
- Expected on a BLOCKED or paused run: **no new commit at all**, the round's work still in the tree.
- Always a violation — report it, never quietly fix it: a commit on `main` / `master`, a PR not in draft state, or a new commit with no PR at all (step 02's § Preflight exists to make that last one unreachable; seeing it means the preflight was skipped).
- Never "tidy up" with `git reset`, `git stash`, or `git restore` — the only permitted history writes are the in-scope commit and push the referenced Step 5 performs.

## Receipt

```
DEVELOP COMPLETE — committed, DRAFT PR open, 0 of 4 gates run
──────────────────────────────────────
Story:        AUTH-14
Branch:       feature/AUTH-14
Tasks:        7/7 done, 0 blocked, 0 skipped
Evidence:     READY
Questions:    none
Flags:        none open
Commit:       9f3c1ab  feat(auth): rotate session tokens on privilege change
              (or: none (refused by RC4) — see Next)
PR:           https://github.com/acme/app/pull/412   (DRAFT — do not merge)
Tracker:      AUTH-14 → in-progress, comment posted
Phase:        implementation

Gates pending (you tick these on the PR; no command ticks a box for you):
  [ ] /arh-validate-feature AUTH-14
  [ ] /arh-review AUTH-14
  [ ] /arh-security-review AUTH-14
  [ ] carry-forward items accepted

Next:
  gate it     → /arh-validate-feature AUTH-14   then  /arh-review AUTH-14
  then        → human marks the PR ready and merges
  keep coding → /arh-develop-feature AUTH-14   (adds a commit to the same draft PR)
```

The example above is the committed outcome. On the three no-commit outcomes:

- Header: `DEVELOP STOPPED — nothing committed (<evidence BLOCKED | clarification pending | refused by RC<n>>)` — never the "complete" header.
- Same field list; `Commit:` / `PR:` / `Tracker:` lines take their `none` / `skipped` variants; `Phase: unchanged (nothing committed)`.
- Checklist retitled: `Gates pending (no PR yet — they run after a successful re-run):`.
- A receipt whose title says "complete" over a body that says "none" reads as a lie in both directions.
