---
name: arh-develop-feature
description: Code a feature's tasks.json DAG, commit it, and open an always-draft PR that lists the gates still pending. Validation, review, and merge follow on the branch afterwards, one command at a time.
argument-hint: "[story-id ...]"
disable-model-invocation: true
allowed-tools: Read Write Edit Bash Grep Glob Task
---
**Batch:** Split `$ARGUMENTS` on whitespace, commas, or semicolons. `--` tokens are flags; all others are story IDs.
- **0 story IDs** → abort: print `Usage: /arh-develop-feature <story-id> [story-id ...]`.
- **1 story ID** → skip this, continue to the phase below (single-story mode, unchanged).



**2+ story IDs — batch:**

**Batch mode: you only coordinate.** Do not read, validate, or edit any story yourself, and do not run the single-story steps below. Start one helper per story.

1. **Do NOT loop in this session.** For each story ID in order, fire one isolated general-purpose `Task` helper with the prompt: `Read and follow .claude/skills/arh-develop-feature/SKILL.md for story <story-id>`. A helper cannot run a slash command, so it is given the command's file instead. Each `Task` gets a fully isolated context window — no state, findings, or decisions from one story can affect another.
2. **Wait** for each `Task` to finish completely before starting the next.
3. **Display each story's complete output to the user immediately** after it finishes — do not collect silently and show only at the end.
4. After all complete, print: `BATCH COMPLETE — /arh-develop-feature (<N> stories)` with columns `Story | Tasks | Evidence | Draft PR`.
5. If `Task` is unavailable: do not loop — ask the user to run each story individually.



# /arh-develop-feature — Develop feature (draft-PR model)

Load the feature's context, develop its `tasks.json` DAG, commit it, and open a
**draft** PR that names every gate still owed. The full `/arh-implement` runs the
Validate ∥ Review gate *before* it commits, which means a coding round cannot end
until the whole gate cycle has run. This command inverts that order: the code lands on
a branch and in a PR first, and the gates run on the branch afterwards, while a
human holds the merge.

The draft status is what makes the inversion visible. It is the standing control
for the release gates that cannot run before validation exists: a draft PR cannot
be merged **by accident**, and its body names every gate still owed, so the gap is
on the artefact a reviewer actually opens rather than only in a session transcript.

Be precise about what that buys, because everything else here depends on it:

- It stops an accidental merge, and it makes the unrun gates legible to anyone who opens the PR.
- It is **not** a hard barrier. The same person can clear it with one `ready` command (the provider skills document that operation, labelled a human action), the branch is pushed so a second non-draft PR can be opened from it, and this command configures no branch protection and no required status check.
- Enforcement that a machine checks is branch protection plus a status check on the gate literals. Configuring that is the repo owner's job, and it is what turns this lane's checklist from a prompt into a gate.

So: draft status buys visibility and one deliberate human act between an ungated
commit and a merge. That is the honest claim, and it is enough to justify the
inversion — it is not a claim that the change cannot merge.

**Input:** `$ARGUMENTS` — one story id, or multiple space-separated ids for batch (see Batch mode above)

## Sequence

```
0. Context load  →  1. Develop (DAG → clarify → evidence → flags)
                 →  2. Commit + DRAFT PR  →  3. Tracker  →  4. Hand-off
```

## What this command does NOT do

**Never marks a PR ready, never merges.**

- The PR is created in draft state, always; this command has no path to any other state.
- Marking it ready and merging are the human's acts, after the gates pass on the branch.
- No flag, no `--force`, no "the diff is small" exception.

**Never runs a gate, never writes a verdict.**

- Never runs the Validate ∥ Review gate; never dispatches `validation-agent` or `code-review-agent`; never reads `steps/02-validate.md`, `03-fix-loop.md`, or `04-review.md`.
- Writes no `validation`, `validation_summary`, `review`, `review_report`, `gate`, or `security` field.
- A verdict recorded by a command that ran no gate is worse than an absent one — the next phase would open on evidence that does not exist.

**Never rewrites history or the tree.**

- No `git stash`, `git restore`, `git rebase`, `git reset`, amend, force-push, or push to `main` / `master`.
- The only history it writes is the in-scope commit + push from the referenced `/arh-implement` Step 5, plus its separate trailing activity-log commit.
- A dirty tree is the user's to resolve, never this command's.

**What it DOES do, on purpose.**

- Commit in PLAN.md scope, push the feature branch, open the draft PR, transition the tracker story to `in-review`.
- Those run through second call sites of `/arh-implement` Step 5 and Step 6, so the release checks that need no verdict still run: RC5 refuses the commit on a red evidence packet, RC4 refuses while any agent flag is `open`, and RC3 requires `--accept-pending` for anything in `pending_carry_forward[]`.

**Gates run before the merge, not before the commit — that is the whole design.**

- `/arh-validate-feature` still refuses to start without a clean `impl_evidence` packet.
- `/arh-review` still requires a recorded `validation` literal; `/arh-security-review` still requires a `review` verdict.
- The PR stays draft until a human confirms all of them — nothing is skipped, the order changed, and the merge is the barrier.

## Step 0 — Context load

_Single-story mode — batch detection (above) has already run; if there were multiple story IDs, this point is never reached._

Read and follow: `${CLAUDE_SKILL_DIR}/steps/00-context.md`

A reference wrapper around `/arh-implement` Step 0 plus this command's deltas: its own
precondition row, and a dirty-tree rule that does not trip over a previous stalled
round of this same command.

## Step 1 — Develop tasks

Read and follow: `${CLAUDE_SKILL_DIR}/steps/01-develop.md`

1. Run the `/arh-implement` Step 1 DAG scheduler unchanged: each round, dispatch a
   batch of ready tasks with disjoint-file scopes (cap 4) as concurrent single-task
   `implementation-agent` workers, with the orchestrator as the single writer of
   `tasks.json` / `QUESTIONS.md` / `FLAGS.md` and the sole merger into the working tree.
2. When the DAG is drained, run the clarification check, then invoke
   `implementation-agent` **once in evidence mode** (`--evidence`) for the
   six-dimension packet — READY, or BLOCKED on round-3 escalation.
3. Offer flag triage. On READY, continue to Step 2. On BLOCKED or a clarification
   pause, skip Steps 2 and 3 and go straight to Step 4 — nothing is committed.

## Step 2 — Commit + DRAFT PR

Read and follow: `${CLAUDE_SKILL_DIR}/steps/02-commit-draft-pr.md`

A second call site of `/arh-implement` Step 5 — staging rules, commit format, push
rules, user confirmation, and all three release gates (RC5 / RC4 / RC3) apply
unchanged. The deltas, in key points:

- **§ Preflight runs first — before the confirmation, before staging, before the commit.** Three checks, each aborting with nothing staged and nothing committed: **P1** no VCS provider configured (`integrations.vcs: none`), **P2** the provider has no draft PR/MR state (Bitbucket Cloud), **P3** no git remote. Each of the three would leave a commit with no draft PR behind it, which is the one outcome this lane must not produce — so in every one of the three cases the step **aborts before the commit**.
- The PR is a draft, always.
- A re-run pushes to the existing PR and refreshes its body — never a second PR.
- The PR body swaps the verdict sections for a human-maintained `## Gates pending` checklist.
- An RC refusal routes to Step 4 with `Commit: none (refused by RC<n>)`.
- The state write records commit receipts only (`impl`, `impl_branch`, `decisions_referenced`) — no verdict, no `phase`.

## Step 3 — Tracker

Read and follow: `${CLAUDE_SKILL_DIR}/steps/03-tracker.md`

A second call site of `/arh-implement` Step 6 — including its best-effort
transition mechanics and its refusal to transition to `done`. Two deltas: the
target stage is the agnostic **`in-progress`**, not `in-review` (nothing has been
reviewed, and the comment itself says the PR is not ready for review), and the
comment must not claim completion, because no gate ran.

## Step 4 — Hand-off

Read and follow: `${CLAUDE_SKILL_DIR}/steps/04-handoff.md`

## State writes

- `tasks[].status` / `completed_at` / `files_touched` / `reason` in
  `docs/features/$ARGUMENTS/tasks.json` — Step 1's scheduler.
- `impl_evidence` (P) in `docs/features/$ARGUMENTS/state.json` — inside `evidence-pass`.
- `impl` (B), `impl_branch` (P), `decisions_referenced` (P) — Step 2, after the
  commit and push succeed.
- `tracker_review_comment` (P) — Step 3, conditional on a tracker provider.
- `phase` (B), `last_updated` (B), `activity_log` (P) — Step 4. `phase` is written
  **only on the committed outcome** (it means "committed, not yet gated" — a run
  that landed nothing writes `last_updated` and the log entry alone) and
  **forwards only**: a feature already at `review` or `security-reviewed` keeps its
  value (`steps/04-handoff.md` § State write).

No verdict field is ever written — no `validation`, `validation_summary`, `review`,
`review_report`, `gate`, or `security*` — and neither is `pending_carry_forward[]`
or `agent_flags[]`. See `steps/04-handoff.md` § Fields this command never writes.

## Receipt

The header states what actually happened: `DEVELOP COMPLETE — committed, DRAFT PR
open, 0 of 4 gates run` only when Step 2 landed a commit; on the three no-commit
outcomes it is `DEVELOP STOPPED — nothing committed (<reason>)`
(`steps/04-handoff.md` § Receipt).

```
DEVELOP COMPLETE — committed, DRAFT PR open, 0 of 4 gates run
──────────────────────────────────────
Story:        $ARGUMENTS
Branch:       feature/$ARGUMENTS
Tasks:        <D>/<N> done, <B> blocked, <S> skipped
Evidence:     READY | BLOCKED after 3 rounds | not run — clarification pending
Questions:    <N queued → /arh-clarify> | none
Flags:        <M open → /arh-human-review> | none
Commit:       <sha> <subject>   | none (blocked before commit)   | none (refused by RC<n>)
PR:           <url>  (DRAFT — do not merge)   | none
Tracker:      $ARGUMENTS → in-progress, comment posted | skipped (<reason>)
Phase:        implementation | left at <current> (already past implementation) | unchanged (nothing committed)

Gates pending (you tick these on the PR; no command ticks a box for you):
  [ ] /arh-validate-feature $ARGUMENTS
  [ ] /arh-review $ARGUMENTS
  [ ] /arh-security-review $ARGUMENTS   (when the governance profile requires it)
  [ ] carry-forward items accepted

Next:
  gate it     → /arh-validate-feature $ARGUMENTS   then  /arh-review $ARGUMENTS
  then        → human marks the PR ready and merges
  keep coding → /arh-develop-feature $ARGUMENTS   (adds a commit to the same draft PR)
```

## Sequence enforcement (read once)

| Rule | Reason |
|---|---|
| The PR is created draft and stays draft. Never mark it ready, never merge. | Draft status is the standing control for gates that have not run: it blocks an accidental merge and keeps the gap visible on the PR. Marking it ready by hand converts a documented gap into a change anyone can merge — one deliberate human act, which is exactly why it must stay a human's and never this command's. |
| Never write a validation, review, or security verdict. | Those literals are what `/arh-review` and `/arh-security-review` gate on. A fabricated literal opens the next phase on evidence that does not exist — and it is indistinguishable from a real one afterwards. |
| Never run the Validate ∥ Review gate here, and never read its step files. | A gate half-run in the wrong command produces a verdict on an unrecorded snapshot. The gate belongs to `/arh-implement` Step 2 and to the standalone commands; this command's job ends at the draft PR. |
| A commit needs a green evidence packet, zero open flags, and accepted carry-forwards. | These are the release checks that do not need a verdict, so they still run — inherited verbatim as RC5 / RC4 / RC3 from the referenced Step 5. Committing past them would leave the draft PR the only remaining control. A refusal routes to Step 4 so the round still gets a receipt. |
| No draft support from the VCS provider → abort before the commit (§ Preflight P2). | Draft status is this lane's one standing control. On a provider without it there is nothing to degrade to, so the command declines the whole job rather than shipping a mergeable PR that every other surface calls a draft. `/arh-implement` is the path on such a provider — it gates before committing, so its PR needs no draft. |
| No VCS provider configured, or no git remote → abort before the commit (§ Preflight P1 / P3). | Both end in a commit with no PR at all: no draft status, no gates-pending checklist, nothing on any shared surface saying the gates are still owed. That is strictly worse than the Bitbucket case, so it gets the same answer. The referenced Step 5 stops *after* the local commit when there is no remote, and aborts for a missing provider only *after* its commit and push — correct for a lane whose gate already ran, wrong here, so this command overrides both and checks first. |
| BLOCKED evidence or a pending clarification means no commit and no PR. | Both mean the round did not finish. A PR opened on an unfinished round advertises work for review that its own author could not verify, and the receipt would claim a state the packet contradicts. |
| Once this command has committed a feature, never run `/arh-implement` on it. | Its Step 5 would commit a second time onto the same branch and open a second PR. `/arh-implement` is the all-in-one command for a feature that has not been started, not a finisher for this one. This binds what this command recommends — the user can still choose `/arh-implement` on purpose, and `/arh-implement` warns and asks at entry (`phase-preconditions` § Already-committed warning). |
