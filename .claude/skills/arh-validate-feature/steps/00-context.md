# Phase 0 — Context

Goal: load every input the validation depends on.

## Read in order

1. `CLAUDE.md` — for stack-specific runtime conventions.
2. `docs/test-cases/$ARGUMENTS/index.json` — must exist; otherwise abort:
   `No test cases for $ARGUMENTS. Run /arh-plan-requirements $ARGUMENTS first.`
   (legacy flat `docs/test-cases/$ARGUMENTS.json` present → abort:
   `Legacy single-file test-case manifest found — re-run /arh-plan-requirements $ARGUMENTS to regenerate the per-layer layout.`)
3. `docs/features/$ARGUMENTS/REQUIREMENTS.md` — to resolve AC ambiguity if a flow is unclear.
4. `docs/features/$ARGUMENTS/PLAN.md` — for the test-strategy mapping.
5. `docs/config/project-commands.yaml` — for test-runner invocation.

## Skills to load

- `test-case-generation` — for the JSON schema and naming convention.
- Stack-specific test runner skill (e.g. `playwright-specs`, `pytest-specs`, `maestro-specs`). The active stacks come from `docs/adr/0001-tech-stack.md` § Decision (Frameworks list). If the ADR is missing, run `/arh-init` first.

## E2E runner detection

Inspect `docs/adr/0001-tech-stack.md` § Decision for a framework with `role: test-automation` (or matching one of `playwright | maestro | cypress | selenium`). If absent:

- Fall back to the unit/integration `test_runner` of every other stack.
- WARN the user that without an explicit test-automation stack, `/arh-validate-feature` runs unit + integration only — not E2E.
- Suggest: add a Playwright / Maestro / Cypress test-automation stack to the project (e.g. `harness add stack playwright:1.48` or update ADR-0001 § Decision Frameworks).

## Pre-flight

- `--rerun` mode requires existing flow files; if missing, fall back to generation mode and warn.
- Working tree is clean enough to run flows (no half-merged conflicts).

## Implementation-evidence precondition (handover gate)

Before any phase runs, read `docs/features/$ARGUMENTS/state.json` at `.impl_evidence`. This is the six-dimension packet produced by Step 1 of either implement command — `/arh-implement` or its develop-only split `/arh-develop-feature`. Validation depends on it: without evidence the implementation didn't break static / runtime / design surfaces, the validation pipeline is running on top of a possibly-broken artefact and its verdict cannot be trusted.

| State | Action |
|---|---|
| `impl_evidence` missing or `checks` empty | **BLOCKED**. Abort with the `phase-preconditions` matrix's message, verbatim: `impl_evidence missing — run /arh-implement $ARGUMENTS or /arh-develop-feature $ARGUMENTS first.` (Step 1 of either command produces the packet.) |
| Any `checks.<dim>.status: FAIL` | **BLOCKED**. Abort with the list of failing dimensions, command, and last 500 chars of the evidence log. Tell the user: `Fix the failing dimension(s) and re-run /arh-implement or /arh-develop-feature.` |
| Any `checks.<dim>.status: N/A` whose `flag_id` is still `open` in `agent_flags[]` | **BLOCKED**. Abort: `evidence-na flags awaiting triage — run /arh-human-review $ARGUMENTS before /arh-validate-feature.` |
| All dimensions `PASS` or `N/A` with their flags triaged (`accept` / `reject` / `defer`) | Proceed to Phase 1. |

This is the symmetric counterpart of Step 5 (commit-PR) RC5. Both gates read the same `impl_evidence` block; RC5 is the irreversible-boundary check and this precondition is the validation-entry check. They exist so that the human reading either a validation report or a PR can trust that the evidence packet was honoured at every downstream stage.

## Specs-skill freshness check (G15)

Run the specs-freshness check per skill `phase-preconditions` § G15 — warn per unfilled skill (do NOT abort), consequence: "validation flows will be generic".

## Output

`Context loaded. <N> TCs (<A> automatable, <M> manual) from index.json. Mode: generate | rerun. <W> unfilled specs warnings.`
