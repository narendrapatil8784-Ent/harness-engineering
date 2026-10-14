# Step 1 — Develop tasks (second call site of /arh-implement Step 1)

Read `.claude/skills/arh-implement/steps/01-implement.md` in full — the whole
file, never a preview or partial read; a skipped tail means a missed
constraint — and follow it verbatim. That step OWNS the DAG scheduler (ready-task selection → disjoint-scope
batch, cap 4 → concurrent single-task `implementation-agent` workers →
orchestrator-as-single-writer record → `T-NN`-order working-tree merge → block
cascade → cycle escalation), its Constraints block, the end-of-session
clarification round, the end-of-session evidence pass, and the end-of-session flag
triage. This step is a **second call site, never a second definition** — do not
restate or paraphrase the scheduler, the constraints, or the evidence contract
here.

**Audited against this command** — inherited verbatim, deliberately not repeated below:

- The Constraints' "never push, amend, or open a PR in this step".
- The flag-triage warning that commit-PR refuses while flags stay `open`.
- The routing of unrelated issues to the PR body's `## Carry-forward` section.
- The "evidence mode runs exactly once" rule.
- All four are already correct here — this command does commit and does open a PR, just in a later step.

## Deltas for this command (these override the referenced step)

### 1. The successor is a commit step, not a gate

- Every "continue to Step 2" / "Handing back to `/arh-implement` → Step 2" in the referenced step means the Validate ∥ Review gate — that reading **does not apply** here.
- On **READY**, continue to `${CLAUDE_SKILL_DIR}/steps/02-commit-draft-pr.md`.
- Never read `02-validate.md`, `03-fix-loop.md`, or `04-review.md`; never dispatch `validation-agent` or `code-review-agent` — this command has no gate to feed them.
- The referenced Step 5 and Step 6 *are* reached — as second call sites from this command's own steps 02 and 03, never from here.

### 2. BLOCKED evidence skips the commit entirely

- By the time the orchestrator sees BLOCKED, `evidence-pass` has already written `EVIDENCE-ESCALATION.md` and the FAIL `impl_evidence`.
- Do not continue to step 02 — go straight to `${CLAUDE_SKILL_DIR}/steps/04-handoff.md` with `Evidence: BLOCKED`; the only recommendation is *fix the cause and re-run this command*.
- Step 02's inherited RC5 gate would refuse that same packet anyway; routing around it makes the refusal cheap instead of theatrical, and leaves no half-built PR behind.

### 3. A clarification pause is a third outcome — it gets a receipt, and still no commit

- The referenced step's pause sits **before** the evidence pass: no packet exists, and nothing may be committed on top of an unanswered question.
- Skip steps 02 and 03; go to `${CLAUDE_SKILL_DIR}/steps/04-handoff.md` with `Evidence: not run — clarification pending` and `result: "FAIL"` in the activity-log entry.
- A round that ends with no receipt is a round nobody can tell happened.
