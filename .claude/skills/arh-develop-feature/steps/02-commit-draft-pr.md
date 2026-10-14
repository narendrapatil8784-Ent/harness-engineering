# Step 2 — Commit + DRAFT PR (second call site of /arh-implement Step 5)

Read `.claude/skills/arh-implement/steps/05-commit-pr.md` in full — the whole
file, never a preview or partial read; a skipped tail means a missed release
gate — and follow it verbatim. It OWNS: the user confirmation before commit/push, staging rules, the
commit-message format, remote check and push rules, the PR-body template, the
`vcs-<provider>` PR creation, the reporting-honesty rule, the activity-log
trailing commit, the G14 decisions section, and all three release gates — RC5
evidence, RC4 agent flags, RC3 carry-forward (including `--accept-pending`).
This step is a **second call site, never a second definition** — do not restate
or paraphrase any of it here.

**Step-number mapping**: its "Step 5" = this step; its "Step 6" =
`${CLAUDE_SKILL_DIR}/steps/03-tracker.md`; its "Step 2" produced nothing here,
because this command never runs the Validate ∥ Review gate.

## Contents

- **Preflight P1–P3 — run first, before anything is staged** (no VCS provider · no draft state · no git remote → abort)
- Deltas 1–7: draft always · re-run pushes to the same PR · gates-pending checklist replaces verdict sections · staging without gate artefacts · RC refusal routing · state write (commit receipts only) · blocked rounds never reach this step
- Output block

## Preflight — three checks BEFORE anything is staged

Run these three in order, as the **first** thing this step does. They come before
the user confirmation, before `git add`, before the commit, and before the push —
the referenced step's own order (confirm → stage → commit → push → open PR) is
overridden here, because every one of these checks decides whether a commit may
happen at all.

A commit this lane lands is ungated by design; the draft PR is the whole reason
that is acceptable. If any of the three fails there will be no draft PR, so the
commit would land with no merge control recorded anywhere. Each failure therefore
**aborts the step with nothing staged, nothing committed, nothing pushed** — the
user loses no work, and `/arh-implement` (which gates before it commits) stays
open to them.

There is no "committed but no PR" outcome in this lane. These three checks are
what removes it.

### P1 — a VCS provider is configured

- No `vcs-*` skill is loaded (`integrations.vcs: none`) → abort. The referenced step's own "vcs integration not configured" abort fires only after its commit and push have already happened; this one replaces it and runs first. Print exactly:

  ```
  Cannot continue — no VCS provider is configured (integrations.vcs: none).

  This command commits before any gate runs. The draft PR is what keeps that
  commit from being merged by accident while the gates are still owed. With no
  provider there is no PR to open, so nothing would record that the gates never ran.

  Nothing was committed. Run /arh-implement $ARGUMENTS instead
  (it runs the Validate ∥ Review gate BEFORE committing), or set integrations.vcs
  in harness.yaml and re-run harness generate.
  ```

### P2 — the provider has a draft PR / MR state

- Read the loaded provider skill's § Operations. No draft-create entry at all (PR or MR), or an explicit no-draft declaration (Bitbucket Cloud) → **abort BEFORE the commit**. Stop before staging anything — nothing is committed or pushed — and print exactly:

  ```
  Cannot continue — <provider> has no draft pull-request state.

  This command commits before any gate runs. The draft status is what keeps that
  commit from being merged by accident and keeps the unrun gates visible on the PR
  itself. Opening a ready PR instead would drop the one control this lane has.

  Nothing was committed. Run /arh-implement $ARGUMENTS instead
  (it runs the Validate ∥ Review gate BEFORE committing, so its PR needs no draft.)
  ```

### P3 — a git remote exists

- `git remote -v`. Empty → abort. The referenced step's § Push says to stop after the local commit when there is no remote; that is the right call for a lane whose gate already ran, and the wrong one here — it would leave an ungated commit on a local branch with no PR and no checklist. Print exactly:

  ```
  Cannot continue — no git remote is configured.

  This command commits before any gate runs. The draft PR is what keeps that
  commit from being merged by accident while the gates are still owed. With no
  remote the branch cannot be pushed, so no PR can exist and the commit would sit
  on a local branch with nothing recording that its gates never ran.

  Nothing was committed. Run /arh-implement $ARGUMENTS instead
  (it runs the Validate ∥ Review gate BEFORE committing, so a local-only commit is
  already a gated one), or add a remote and re-run this command.
  ```

- Do not offer to add the remote, and never substitute a local-only commit — that is the exact state this lane is shaped to prevent.

## Deltas for this command (these override the referenced step)

### 1. The PR is a DRAFT, always

- Create it draft via the provider skill's § Operations **Open DRAFT PR** entry; **Never** mark the PR ready and **never** merge it — a human does both, after the gates run on the branch.
- GitLab names the same entries **Open DRAFT MR** / **Find open MR for branch** / **Update MR body** — match the entry by its job, not its letters; a merge request is the same object.
- What draft status actually buys: it prevents an **accidental** merge, and it keeps the unrun gates visible on the PR itself. It is not a hard barrier — the same person can clear it with one `ready` command, the branch is pushed so a second non-draft PR can be opened from it, and this command configures no branch protection and no required status check. Treat it as the visible control this lane has, not as proof the change cannot merge.
- The capability check that backs this delta is § Preflight P2 — it runs before staging, never here.
- Never degrade to a ready PR, a `[WIP]` title, or a reviewer convention — a title is documentation, not a merge barrier.

### 2. A re-run pushes to the existing PR — never a second one

- Before creating anything, run § Operations **Find open PR for branch** against `feature/$ARGUMENTS`.
- Found → push the new commit, refresh the body via **Update PR body** (re-render the lists, preserve every box a human has ticked), report the existing URL, skip creation.
- This body refresh is the only PR edit any harness command makes — this command's own act on its own PR.
- PR already marked ready by a human → do **not** revert it; report and let them decide whether the new commit belongs there.
- Never two PRs for one feature — that splits the review history and the CI runs.

### 3. PR body — gates checklist instead of verdict sections

- The referenced template's `## Test case results`, `Validation rounds:` / `Environment:` lines, `## Code review` verdict, and `VALIDATION-<DATE>.md` / `REVIEW.md` links describe artefacts that do not exist yet — omit them all.
- Immediately after `## What was implemented`, add:

  ```
  ## Gates pending — DRAFT until every box is checked

  - [ ] /arh-validate-feature <id> → PASS or PARTIAL
  - [ ] /arh-review <id> → PASS or PASS WITH WARNINGS
  - [ ] /arh-security-review <id> → PASS   (omit only when the governance profile does not require it)
  - [ ] Carry-forward items accepted or resolved

  This PR was opened by /arh-develop-feature, which codes and commits but runs no
  gate. Do not mark it ready for review and do not merge until every box above is
  checked. Check each box yourself as the gate passes — no harness command edits
  this checklist, so an unticked box means "not confirmed", not "not run".
  ```

- Keep `## Links` for the artefacts that do exist: `PLAN.md` and the evidence packet directory — the one gate that DID run stays auditable.

### 4. Staging — no gate artefacts exist

- The referenced rule stages "PLAN.md scope plus the test artefacts written by Step 2"; none exist here.
- Stage the PLAN.md-scope source files + `docs/features/$ARGUMENTS/evidence/*`, `tasks.json`, and `QUESTIONS.md` / `FLAGS.md` when present.
- The never-`git add -A` rule and the `git status --short` verification apply unchanged.

### 5. RC gates — right command name, and a refusal gets routed

- RC5's refusal message says "re-run `/arh-implement`" → substitute `/arh-develop-feature $ARGUMENTS`; the gate's logic, tables, and no-`--force` rule are unchanged, RC4 and RC3 apply verbatim.
- **A refusal here is a routed outcome, not a dead stop** — surface the gate's message verbatim.
- Then **skip step 03** (no PR to tell the tracker about) and go to `${CLAUDE_SKILL_DIR}/steps/04-handoff.md` with `Commit: none (refused by RC<n>)`.
- The hand-off names the remedy: `/arh-human-review` (RC4), `harness carry-forward resolve` or `--accept-pending` (RC3), a re-run (RC5).
- Nothing is committed and no PR is opened in any of the three cases.

### 6. State write — commit receipts only, no verdicts, no `phase`

- Drop `validation`, `validation_summary`, and `review` — no gate ran, and a written literal fabricates exactly what `/arh-review`'s precondition reads.
- Drop `phase` — `steps/04-handoff.md` owns that write (committed-only, forwards-only).
- Write what this step genuinely produced:

  PRIMARY — `docs/features/$ARGUMENTS/state.json`:
  ```json
  {
    "impl": "complete",
    "impl_branch": "feature/$ARGUMENTS",
    "decisions_referenced": ["D-01", "D-02"],
    "last_updated": "<iso8601>"
  }
  ```

  MIRROR — `docs/state/features.json[$ARGUMENTS]` (B-tier only):
  ```json
  { "impl": "complete", "last_updated": "<iso8601>" }
  ```

- `impl: "complete"` means "the implementation is committed", not "the feature is done" — see `docs/state/SCHEMA.md § Field ownership`.

### 7. A blocked round never reaches this step

- `01-develop.md` routes BLOCKED evidence or a pending clarification straight to the hand-off — RC5 would refuse anyway; the routing makes the refusal cheap instead of theatrical, and leaves no half-built PR behind.

## Output

```
Commit:       <sha> on feature/$ARGUMENTS   | none (refused by RC<n>)   | none (preflight P<1|2|3>)
Pushed:       yes | no (nothing committed)
PR:           <url>  (DRAFT — 4 gates pending)   | none (nothing committed)
Gates:        none run by this command
```

`Pushed:` and `PR:` have no "committed but not pushed" or "committed but no PR"
variant, and must never be invented: § Preflight aborts the step before staging in
every case that would produce one. A `none` on either line therefore always sits
next to `Commit: none`.

Report a created PR only from the create command's success output, per the
referenced step's reporting-honesty rule, and say "DRAFT" in every line that
names the PR — a reader who skims must not come away thinking it is mergeable.
