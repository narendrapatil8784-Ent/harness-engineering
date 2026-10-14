---
name: phase-preconditions
description: Precondition matrix for requirement-phase commands. Loaded by every workflow command's Step 0 to abort early if prior phase incomplete.
when_to_use: Step 0 of /arh-research, /arh-plan-requirements, /arh-plan-implementation. Loaded by /arh-sync to verify configs exist.
user-invocable: false
allowed-tools: Read
---
# Phase Preconditions

Single source of truth for which command requires which prior state. Every requirement-phase command MUST consult this matrix before running its body. Aborts early with a helpful next-step message instead of failing mid-run.

## Contents

- State location (which file each phase reads)
- Matrix (per-command required state + failure message)
- Already-committed warning (`/arh-implement` only — warn, never block)
- Clarification gate (open-questions hard gate)
- Procedure (every command's Step 0 follows this)
- Recovery options (a failed gate is not a dead end)
- Override
- Specs-skill freshness check (G15)

## State location

Project state splits by phase:

- **Pre-plan phases** (intake, validate-story, research): `docs/state/features.json[<id>]` — entry per feature.
- **Post-plan phases** (plan-requirements onward): `docs/features/<id>/state.json` — per-feature file. Created at `/arh-plan-requirements` (the migration point).

Each phase reads from the path appropriate for its phase. No runtime fallback — readers hardcode the path.

## Matrix

| Command | Reads from | Required state | Failure message |
|---|---|---|---|
| `/arh-research <id>` | `docs/state/features.json[<id>]` | `story == "validated"` | `Run /arh-validate-story <id> first.` |
| `/arh-plan-requirements <id>` | `docs/state/features.json[<id>]` | `research == "complete"` AND `research_verdict in {GO, GO-WITH-CONDITIONS}` | `Run /arh-research <id> first.` OR `Research verdict is <X>; address blockers before /arh-plan-requirements.` |
| `/arh-plan-implementation <id>` | `docs/features/<id>/state.json` | `gate == "APPROVE"` AND `docs/adr/0001-tech-stack.md` exists with at least one entry in § Decision Frameworks list | `Product Gate is <X>; pass it via /arh-plan-requirements <id>.` OR `No tech stack declared. Run `/arh-init` to write ADR-0001.` |
| `/arh-implement <id>` | `docs/features/<id>/state.json` | `gate == "APPROVE"` AND `plan == "complete"`. **Warn (do not block) when `impl == "complete"`** — see § Already-committed warning | `Run /arh-plan-implementation <id> first.` |
| `/arh-develop-feature <id>` | `docs/features/<id>/state.json` | `gate == "APPROVE"` AND `plan == "complete"` (same gate as `/arh-implement` — the develop-only split loosens nothing) | `Run /arh-plan-implementation <id> first.` |
| `/arh-validate-feature <id>` | `docs/features/<id>/state.json` | `impl_evidence.checks` present with no dimension `FAIL` and no untriaged `evidence-na` flag (written by `/arh-implement` **or** `/arh-develop-feature` Step 1; validation deliberately runs pre-commit, so no `impl` literal is required) | `impl_evidence missing — run /arh-implement <id> or /arh-develop-feature <id> first.` |
| `/arh-review <id>` | `docs/features/<id>/state.json` | `validation in {"passed", "partial"}` — a status literal, written by `/arh-implement`'s Step 2 gate **or** by a standalone `/arh-validate-feature` (skill `validation-execution` § State write). The `<DATE> P=<P>/<TOTAL>` shape is `validation_summary`, a P-tier detail field, and is never the gate condition | `Run /arh-validate-feature <id> first.` OR `Validation is failed; fix and re-run /arh-validate-feature <id> before review.` |
| `/arh-security-review <id>` | `docs/features/<id>/state.json` | `review == "<verdict>"` | `Run /arh-review <id> first.` |
| `/arh-iterate-design <id>` | `docs/features/<id>/state.json` | `prd == "complete"` AND `design != "n/a"` AND `integrations.design != "none"` | `Run /arh-plan-requirements <id> first; no PRD to iterate from.` OR `Feature <id> has design = n/a (backend-only).` OR `integrations.design == none. Run `harness add integration design <provider>` first.` |
| `/arh-iterate-test-cases <id>` | `docs/features/<id>/state.json` | `prd == "complete"` AND `docs/test-cases/<id>/index.json` exists (no gate requirement — iteration runs at any phase; its Phase 3 handles the gate consequence) | `Run /arh-plan-requirements <id> first; no PRD to iterate against.` OR `No test cases for <id>. Run /arh-plan-requirements <id> first.` |
| `/arh-sync` | (both files iterated) | `docs/config/issue-tracking.yaml` exists OR `docs/config/doc-tracker.yaml` exists | `Run /arh-init first to populate tracker configs.` |
| `/arh-fix` | (none — bypass lane) | NONE — `/arh-fix` is the hotfix lane and carries no phase precondition. Its own Step 1 architectural-bounce guard routes non-hotfix defects to `/arh-intake`. | (n/a) |

## Already-committed warning (`/arh-implement` only — warn, never block)

`impl == "complete"` at `/arh-implement` entry means the feature is already
committed. Two origins write that literal — tell them apart by the verdicts, which
only a gated run records:

**No `validation` and no `review` literal — an ungated commit.**
`/arh-develop-feature` committed and opened a draft PR; the gates never ran.
Running `/arh-implement` then means its Step 5 commits a **second** time onto the
same branch and tries to open a **second** PR for it. Print:

```
<id> is already committed (impl: complete) — /arh-develop-feature opened a draft PR for it.
Recommended: gate the existing branch instead —
  /arh-validate-feature <id>   then   /arh-review <id>
then mark the PR ready and merge.
Continuing with /arh-implement will commit again on the same branch and try to
open a second PR.
```

**`validation` and `review` literals present — a finished full run.**
`/arh-implement` already took this feature through its gates; its PR was opened
ready. Print:

```
<id> is already implemented and gated (impl: complete, validation and review recorded).
Re-running /arh-implement will redo the work and commit again on the same branch.
Unrelated new work normally belongs in /arh-fix or a new story.
```

In both cases, then ask how to proceed. This is a **warning, not a gate**:
`/arh-implement` stays runnable, because a user may legitimately want the
all-in-one run to finish a feature `/arh-develop-feature` started (e.g. they want
the Validate ∥ Review gate's folded fix loop rather than three separate commands).
Never abort on this condition, and never apply it to any other command.

## Clarification gate (open-questions hard gate)

No phase may start while its input artifact still carries unanswered questions. Before applying the matrix, scan the prior-phase artifact:

| Command | Scan this artifact |
|---|---|
| `/arh-research <id>` | `docs/stories/<id>.md` |
| `/arh-plan-requirements <id>` | `docs/research/<id>.md` |
| `/arh-plan-implementation <id>` | `docs/features/<id>/REQUIREMENTS.md` |
| `/arh-implement <id>` | `docs/features/<id>/PLAN.md` |
| `/arh-develop-feature <id>` | `docs/features/<id>/PLAN.md` |

An artifact has an **unresolved clarification** when it contains EITHER:

- one or more `[NEEDS CLARIFICATION: ...]` markers, OR
- a non-empty `## Open questions` / `## Clarifications` section — any content line that is not blank, not an HTML comment, and not a scaffold placeholder comment.

On a hit, abort:

`Unresolved clarifications in <artifact>: <n> open item(s). Answer them (delete the marker / clear the section) or record an explicit skip in the artifact before /<command>. Open questions cannot cross a phase boundary.`

Non-negotiable, same as the matrix preconditions — `--skip-preconditions` does not bypass it. The only legitimate exit is to resolve the question or escalate it to the user.

## Procedure (every command's Step 0 follows this)

1. Read the state file declared in the matrix's "Reads from" column for the command being gated. If missing or malformed, abort:
  - For pre-plan commands: `State file missing; run /arh-init first.` (when `docs/state/features.json` absent) OR `Feature <id> not in state; run /arh-intake or /arh-import first.` (when id missing)
   - For post-plan commands: `Per-feature state missing; run /arh-plan-requirements <id> first.` (when `docs/features/<id>/state.json` absent)
2. Apply the matching matrix row above. If the precondition holds, continue. If not, abort the command with the matrix's failure message, **then offer recovery per § Recovery options below** — never leave the user at a dead end.
3. **Clarification gate** (every gated command): run the "## Clarification gate" scan above against the prior-phase artifact. If any unresolved item is found, abort with its message, then offer recovery per § Recovery options. This blocks a phase from starting on top of unanswered open questions.
4. **Stack check** (for `/arh-plan-implementation` only): read `docs/adr/0001-tech-stack.md` § Decision (Frameworks list). If the ADR is missing or the Frameworks list is empty, abort with the second failure message above, then offer recovery per § Recovery options. The file plan, ADRs, and task table all need at least one framework declared to anchor implementation choices.
5. Never proceed to Step 1 of the command unless this skill returns `OK` from steps 2, 3, and (where applicable) 4.

## Recovery options (a failed gate is not a dead end)

Gates run in the **main session**, so after printing the failure message, ASK the user how to proceed — recommendation first, 2–3 concrete options, never a bypass. The blocked command stays aborted; the chosen option is the recovery path toward re-running it.

| Failure class | Recommended option (offer first) | Other options |
|---|---|---|
| `story == "draft"` | Run `/arh-validate-story <id>` now | Show the story for review first; stop here |
| `story == "escalated"` and/or open clarifications > 0 | **Walk through each open clarification now, one at a time** — record the user's answer in the story (delete the marker / fill the section), then run `/arh-validate-story <id>` | List the open questions and stop (user resolves offline); stop here |
| `research != "complete"` | Run `/arh-research <id>` now | Stop here |
| `research_verdict ∈ {SPIKE, BLOCK}` | Show the blockers from `docs/research/<id>.md`, resolve with the user, then re-run `/arh-research <id>` | Stop here |
| `gate != "APPROVE"` | Re-run `/arh-plan-requirements <id>` to pass the Product Gate | Show the gate verdict + what failed; stop here |
| `plan != "complete"` | Run `/arh-plan-implementation <id>` now | Stop here |
| `review` not set (`/arh-security-review`) | Run `/arh-review <id>` now | Stop here |
| `impl_evidence` missing / any dimension `FAIL` | **Run `/arh-implement <id>` now** — the full lane: code, evidence, then the Validate ∥ Review gate **before** it commits | Run `/arh-develop-feature <id>` (develop-only lane — commits and opens an always-draft PR *before* any gate runs; a deliberate choice, and the gates then run on the branch); stop here |
| `impl == "complete"` with no `validation` / `review` literal — ungated commit (§ Already-committed warning) | **Gate the existing branch** — `/arh-validate-feature <id>` then `/arh-review <id>`, then mark the PR ready and merge | Continue with `/arh-implement <id>` anyway (commits again on the same branch, opens a second PR); stop here |
| `impl == "complete"` with `validation` / `review` recorded — finished full run (§ Already-committed warning) | **Stop — nothing to redo**; unrelated new work goes to `/arh-fix <id>` or a new story | Re-run `/arh-implement <id>` deliberately (redoes the work, commits again on the same branch); stop here |
| State file / feature id missing | Run `/arh-init` (no state at all) or `/arh-intake` / `/arh-import` (feature unknown) | Stop here |
| ADR-0001 missing / empty Frameworks | Run `/arh-init` to record the tech stack | Stop here |

Rules:

- Present the options explicitly (numbered or via the question UI) with the recommended one first and a one-line reason. Wait for the user's pick — do NOT auto-run the recovery command.
- After the recovery action completes successfully, offer to re-run the originally blocked command.
- Never offer "proceed anyway" — that is the forbidden bypass (§ Override).

Stack is irrelevant until `/arh-plan-implementation` § 2 (File and Module Plan) — story / validation / research / PRD describe *what* and *why*, not *how*. The `/arh-plan-implementation` matrix row encodes the ADR-0001 stack requirement; upstream commands carry no stack precondition.

## Override

`--skip-preconditions` is forbidden. Preconditions are not negotiable. The right action when blocked is to fix the prior phase, not bypass the check. If a feature legitimately needs to skip a phase (e.g. trivial bug fix that needs no research), record the skip explicitly in the appropriate state file for that phase (pre-plan: `docs/state/features.json[<id>]`; post-plan: `docs/features/<id>/state.json`) — for example `research: "skipped:trivial"` — and document the reason in the story file's "Phase skips" section.

## Specs-skill freshness check (G15)

Canonical procedure — gate steps reference this section; do not re-paste it.

For every `<framework>-specs` (or `<runner>-specs`) skill bound to the command's agent (via composer-wired `stacks_specs_skills`), check whether that stack's seeded scaffolds under `docs/specs/<framework>/` (`project-structure.md`, `api-surface.md`, `architecture.md`, `conventions.md`, `testing.md` — whichever exist) still contain scaffold-only `TODO` placeholder markers (HTML-comment form per F-013). A scaffold the team deleted is not unfilled; files the team added are never checked.

If any scaffold is unfilled, print **one warning per stack** before proceeding (do NOT abort):

```
⚠ docs/specs/<framework>/ is unfilled; <command-specific consequence>.
  Fill it (or run `harness fill <framework>-specs`) to apply org conventions.
```

The `<command-specific consequence>` is supplied by the calling gate step (e.g. "research pattern-map will be generic", "security review may miss stack-specific idioms"). The command proceeds with the framework's canonical/general knowledge when specs are unfilled — common on first run, before the team fills them. The warning surfaces the gap to the user every run.

Then run `harness specs check` and print its summary (stale citations, specs behind their code). It warns, never blocks: a non-zero exit is reported and the command proceeds.
