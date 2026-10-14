---
name: arh-validate-story
description: Validate a story against the Harness floor plus its project story-template, self-correcting in place up to 3 rounds.
argument-hint: "[story-id ...]"
disable-model-invocation: true
allowed-tools: Read Write Edit Grep Task
---
**Batch:** Split `$ARGUMENTS` on whitespace, commas, or semicolons. `--` tokens are flags; all others are story IDs.
- **0 story IDs** → abort: print `Usage: /arh-validate-story <story-id> [story-id ...]`.
- **1 story ID** → skip this, continue to the phase below (single-story mode, unchanged).



**2+ story IDs — batch:**

**Batch mode: you only coordinate.** Do not read, validate, or edit any story yourself, and do not run the single-story steps below. Start one helper per story.

1. **Do NOT loop in this session.** For each story ID in order, fire one isolated general-purpose `Task` helper with the prompt: `Read and follow .claude/skills/arh-validate-story/SKILL.md for story <story-id>`. A helper cannot run a slash command, so it is given the command's file instead. Each `Task` gets a fully isolated context window — no state, findings, or decisions from one story can affect another.
2. **Wait** for each `Task` to finish completely before starting the next.
3. **Display each story's complete output to the user immediately** after it finishes — do not collect silently and show only at the end.
4. After all complete, print: `BATCH COMPLETE — /arh-validate-story (<N> stories)` with columns `Story | Score | PASS/FAIL`.
5. If `Task` is unavailable: do not loop — ask the user to run each story individually.



# /arh-validate-story

**Input:** `$ARGUMENTS` — one story id, or multiple space-separated ids for batch (see Batch mode above)

Validate `docs/stories/$ARGUMENTS.md` and self-correct on failure.

_Single-story mode — batch detection (above) has already run; if there were multiple story IDs, this point is never reached._

Delegate to `story-validation-agent`. The agent:

1. Loads `requirement-validation` (floor + template-derived checks).
2. Checks the floor, then every section the project's `story-template` declares.
3. If pass: marks the story status `Validated`, prints the result, hands off.
4. If a cosmetic fail: self-corrects the story in place and re-checks (max 3 rounds).
5. If a decompositional fail, or still failing after 3 rounds: escalates for human review.

After the agent hands off, record the outcome in the index —
`docs/state/features.json[$ARGUMENTS]` (pre-plan phase: index only, per
`docs/state/SCHEMA.md`): `story: "validated"` on PASS, `story: "escalated"` on
ESCALATED (lowercase literals), plus `last_updated`. Without this write, downstream
phase preconditions read a stale `draft` while the story file says otherwise.
