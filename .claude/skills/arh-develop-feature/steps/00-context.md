# Step 0 — Context load (second call site of /arh-implement Step 0)

Read `.claude/skills/arh-implement/steps/00-context.md` in full — the whole
file, never a preview or partial read; a skipped tail means a missed
precondition — and follow it verbatim. That step OWNS the read order, the skills to load, the hard
preconditions, the G14 decision-log load, the G15 specs-freshness check, and
the G2 resume/restart check — this step is a **second call site, never a second
definition**. Do not restate any of it here; in particular the test-case-manifest
existence gate and its legacy-manifest message live in the referenced step only.

## Deltas for this command (these override the referenced step)

### 1. Preconditions — this command's own row

- Load skill `phase-preconditions` and apply the **`/arh-develop-feature <id>`** row, not the `/arh-implement` row: `gate == "APPROVE"` AND `plan == "complete"` in `docs/features/<id>/state.json`.
- Also run that skill's § Clarification gate scan of `docs/features/<id>/PLAN.md`.
- The gate is identical to `/arh-implement`'s — this split loosens nothing; everything else in the referenced § Hard preconditions applies unchanged.

### 2. Dirty tree — this command's own output is not a precondition failure

- A round that ended BLOCKED or paused never reached its commit step, so its work is still in the tree — this command invites exactly that re-run; do not trip on it.
- Modified or untracked paths **inside** the feature's `file_plan` (from `docs/features/$ARGUMENTS/tasks.json`), or under `docs/features/$ARGUMENTS/`, are **expected** — report them on the output line and continue.
- Paths **outside** that scope are genuinely unrelated → apply the referenced step's stop unchanged. The remedy is the user's (`git commit` / `git stash` / `git restore`, their call), never something this command offers to run.
- This command itself never runs `git stash` or `git restore` — not to tidy the tree, not for any reason.

### 3. Already-committed check — warn and confirm, never abort

- `impl == "complete"` in `docs/features/$ARGUMENTS/state.json` means the feature is already committed — by `/arh-implement`, or by an earlier round of this command.
- Warn: `<id> is already committed (impl: complete); another round will add a commit to the existing branch, and its draft PR if one is open. Unrelated new work normally belongs in /arh-fix or a new story` — then ask the user to confirm before continuing.
- A second coding round on a drafted PR is the normal way this command is used; it just must be a deliberate choice, not a surprise.

### 4. Early draft-capability warning — tell them before they code, not after

- `steps/02-commit-draft-pr.md` § Preflight decides whether a commit may happen at all: P1 a VCS provider is configured, P2 that provider has a draft PR/MR state, P3 a git remote exists. Any failure aborts that step with nothing committed.
- Finding that out at Step 2 costs the user the whole DAG run. So check the same three conditions **here**, read-only, and warn before any task is dispatched.
- Read the loaded `vcs-*` skill's § Operations for a draft-create entry (PR or MR), and run `git remote -v`. Do not stage, commit, or push anything in this step.
- Any of the three missing → print:

  ```
  Heads-up before you start: this command cannot finish on this setup.
  <the failing condition — no vcs provider / <provider> has no draft PR state / no git remote>

  /arh-develop-feature commits before any gate runs, and the draft PR is the
  control that makes that acceptable. Without one, steps/02 aborts before the
  commit and this round produces no PR.

  Run /arh-implement $ARGUMENTS instead (it gates BEFORE committing, so its PR
  needs no draft), or fix the condition above and re-run this command.
  ```

- This is a **warning at Step 0, not a second abort** — the user may want the code written regardless, and the real refusal still lives in `steps/02-commit-draft-pr.md` § Preflight, which is the only place it is enforced. Ask before continuing.

### 5. Output line

- Print the referenced step's one-line confirmation, then one more line: `Mode: develop-only (commit + DRAFT PR; no validate / review / merge). Branch: <current>. In-scope uncommitted paths: <N> (expected). Unrelated: <N>. Draft-PR preflight: OK | WILL ABORT (<reason>).`
