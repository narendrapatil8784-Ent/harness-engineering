---
name: test-case-generation
description: JSON schema and derivation rules for producing structured test cases from a story's acceptance criteria. Outputs the per-layer directory docs/test-cases/<id>/ (index.json + one file per layer).
when_to_use: Generating or auditing test cases during /arh-plan-requirements.
user-invocable: false
allowed-tools: Read Write Edit
---
# Test Case Generation

## JSON schema (v4 — per-layer file layout; TC body unchanged from v3)

Every test case carries the full executable body — `objective`, `preconditions[]`,
`test_data{}`, `steps[]`, `expected_results[]` — regardless of `automatable`.
`given`/`when`/`then` stay as the one-line behavioural summary and the AC-level trace
anchor; `steps`/`expected_results` are the granular expansion that a generated spec or
a human tester actually executes.

Both halves are load-bearing and neither substitutes for the other: the coverage audit
keys on `requirement_id` + `given`/`when`/`then`, while the test generators read the
body. A TC carrying only the summary cannot be turned into a spec
without the generator inventing the missing detail.

v4 changes the FILE LAYOUT only — the test-case object schema is unchanged from v3
(fields, `requirement_id` rules, executable body, `last_run`). The single flat
`docs/test-cases/<id>.json` becomes a per-story directory so each consumer reads only
the layer file(s) applicable to it.

## File layout (v4)

```
docs/test-cases/<id>/
  index.json          always exists — the existence-gate anchor
  integration.json    automatable:true, type:integration   (absent when empty)
  e2e.json            automatable:true, type:e2e           (absent when empty)
  performance.json    automatable:true, type:performance   (absent when empty)
  security.json       automatable:true, type:security      (absent when empty)
  contract.json       automatable:true, type:contract      (absent when empty)
  manual.json         ALL automatable:false TCs, any type  (absent when empty)
```

- **No `unit.json`** — the manifest is behavioural-only (see § Scope); unit tests live
  in `tasks.json`.
- **Fixed layer order** wherever files are iterated, counted, or reported:
  `integration, e2e, performance, security, contract, manual`.
- A layer file that would be empty is absent, never an empty stub. `index.json` always
  exists — every existence gate checks it, not the layer files.
- `manual.json` holds every `automatable: false` TC regardless of `type`; each TC keeps
  its `type` field, so nothing about the TC object changes when a TC flips between
  automatable and manual — only which file it lives in.

### index.json

```json
{
  "schema_version": 4,
  "story_id": "CHK-014",
  "counts": {
    "total": 18,
    "automatable": 15,
    "manual": 3,
    "by_type": {"integration": 4, "e2e": 9, "performance": 2, "security": 2, "contract": 1}
  },
  "files": {
    "CHK-014-TC-01": "e2e.json",
    "CHK-014-TC-09": "performance.json",
    "CHK-014-TC-10": "manual.json"
  },
  "coverage_audit": {
    "acceptance_criteria": [
      {"id": "CHK-014-AC-1", "covered_by": ["CHK-014-TC-01", "CHK-014-TC-02"]},
      {"id": "CHK-014-AC-2", "covered_by": ["CHK-014-TC-03"]}
    ],
    "functional_requirements": [
      {"id": "CHK-014-FR-1", "covered_by": ["CHK-014-TC-01"]}
    ],
    "non_functional_requirements": [
      {"id": "CHK-014-NFR-performance", "covered_by": ["CHK-014-TC-09"]}
    ],
    "uncovered": []
  }
}
```

- `counts.by_type` counts every TC by its `type` — manual TCs included (they keep
  `type`). `counts.total == counts.automatable + counts.manual`.
- `files` maps **every** TC id → its filename relative to the directory. This map is
  the id registry: the next TC number for a story is
  `max <NN> across the map's keys + 1` — ids stay globally sequential per story even
  though TCs live in different files.
- `coverage_audit` is the SINGLE cross-layer audit (shape unchanged from v3) — it
  spans every AC / FR / NFR regardless of which layer file covers it.

### Layer files (same shape for all six)

```json
{
  "story_id": "CHK-014",
  "layer": "e2e",
  "test_cases": [
    {
      "id": "CHK-014-TC-01",
      "title": "Valid promo code reduces total",
      "type": "e2e",
      "category": "positive",
      "automatable": true,
      "priority": "Must",
      "requirement_id": "CHK-014-FR-1",
      "given": "user has 1 item in cart and a valid promo code",
      "when": "user submits the code at checkout",
      "then": "order total is reduced by promo amount and shown in summary",
      "objective": "Verify a valid promo code reduces the order total and the reduction is shown in the summary.",
      "preconditions": ["Logged-in user with 1 item in the cart", "Promo code SAVE10 active in test data"],
      "test_data": {"promo_code": "SAVE10", "cart_total": "100.00", "expected_total": "90.00"},
      "steps": ["Open the checkout page", "Enter promo code SAVE10 in the promo field", "Submit the code"],
      "expected_results": ["Order total updates to 90.00", "A 10.00 discount line is shown in the summary"],
      "tags": ["happy-path"]
    }
  ]
}
```

`manual.json` uses `"layer": "manual"` and carries mixed `type` values. The TC object
schema (v3 — AC-anchored traceability + executable body) is identical in every file.

### Index-update contract (every writer follows this)

- **Adding, removing, or re-typing a TC** updates `index.json` in the same operation:
  `counts`, the `files` map, and a re-run of `coverage_audit` (`uncovered` must stay
  `[]`). A layer file that becomes non-empty is created; one that becomes empty is
  deleted and its `files` entries removed.
- **Re-anchoring a TC** (changing its `requirement_id`) also updates `index.json` — it
  re-runs `coverage_audit` (`counts` and the `files` map are unchanged). An anchor move
  that skips the audit leaves the gate approving coverage that no longer exists.
- **Patching fields on an existing TC** (`last_run`, `flow_path`, integration-added
  keys) touches ONLY that TC's layer file — `index.json` is not rewritten. This keeps
  validation runs, spec generators, healing, and tracker pushes out of index
  contention.
- **Write order:** layer files first, `index.json` LAST. A crash mid-operation then
  leaves at worst an unindexed TC — invisible and harmless — never a `files`-map entry
  pointing at a TC that does not exist.
- After any write, re-validate that the touched file parses as JSON; on failure,
  restore the file from the in-memory copy you read (per-file restore).

**Known gap:** a writer that adds a TC but skips the index update creates an invisible
TC — absent from the `files` map, it is skipped by every map-driven consumer. No lint
sees downstream project data, so this contract is prose-enforced: treat the
`coverage_audit` re-run requirement as the backstop (an unindexed TC cannot appear in
`covered_by`, so a coverage change surfaces it).

### Canonical existence gate (reused verbatim by every command that consumes TCs)

> `docs/test-cases/<id>/index.json` must exist.
> - Missing → stop: `No test cases for <id>. Run /arh-plan-requirements <id> first.`
> - Missing, but legacy flat `docs/test-cases/<id>.json` exists → stop:
>   `Legacy single-file test-case manifest found — re-run /arh-plan-requirements <id> to regenerate the per-layer layout.`

### Migrating a pre-v3 manifest or a flat (pre-v4) layout

Test-case JSON generated before v3 has `given`/`when`/`then` but none of the body
fields; JSON generated before v4 is a single flat `docs/test-cases/<id>.json` instead
of the per-layer directory. Nothing crashes — the files are generated artefacts, not
code — but every consumer's existence gate reads `index.json` and will stop on a flat
manifest with the legacy message above.

**Layout only (flat → per-layer): use the CLI.**

```bash
harness test-cases migrate <story-id>     # one story
harness test-cases migrate --all          # every flat manifest in the project
harness test-cases migrate <story-id> --dry-run
```

Deterministic Python — no LLM, no PRD redraft, no gate to reopen. It splits the flat
`test_cases[]` into the layer files by `type` + `automatable`, builds `index.json`
(`counts` incl. `by_type`, the `files` map over every id, `coverage_audit` copied
across verbatim), omits empty layers, and writes layer files first / `index.json` last
per the § Index-update contract. Every id, `last_run` block and integration-added field
(tracker keys) survives byte-identical, so nothing is renumbered and no pushed tracker
issue is orphaned. The original is archived to
`docs/features/<id>/test-cases.history/round-<N>-<ISO8601>/` before any write and
deleted only after the new directory has been re-read and verified. Idempotent; it
refuses (writing nothing) when the per-layer directory already exists alongside the
flat file, when there is no flat file, or when the JSON does not parse.

This is the route to prefer for a live story. It is a LAYOUT change and nothing else —
it will not invent a missing field, so a manifest with a malformed TC is refused with
that TC named rather than silently repaired.

**Body backfill (pre-v3 → v3): regenerate rather than hand-edit.** The CLI moves TCs;
it does not write the executable body a pre-v3 TC never had. For that, re-run
`/arh-plan-requirements <id>`, which rewrites the per-layer directory from the PRD with
the body populated. Its Phase 2 § Regeneration guard archives the existing set first
and carries over each unchanged TC's id, `last_run` block, and integration-added fields
(a TC whose given/when/then survives the PRD keeps its identity), so `requirement_id`
traceability, `regression-<id>` tags, tracker keys, and run history carry across. The
guard also still accepts a flat manifest as its baseline — that is the fallback when a
genuine regeneration is what you want anyway, not the migration path to reach for
first, because Phase 1 redrafts the PRD in the same run and a reworded TC becomes a new
TC with a new id.

Do not backfill by hand for a story that is already closed. An old manifest that
nothing reads is not a defect; migrate it the next time that story is touched. (The
docs site is the one reader that still renders a legacy flat manifest.)

## Field reference

| Field | Required | Notes |
|---|---|---|
| `id` | yes | `<STORY-ID>-TC-<NN>` zero-padded — NN globally sequential per story across ALL layer files (next NN from the `index.json` `files` map) |
| `title` | yes | One-line behaviour |
| `type` | yes | **Test layer** (load-bearing — it decides which layer file the TC lives in, validation-execution picks the runner from it, coverage audit keys on it): `integration` \| `e2e` \| `performance` \| `security` \| `contract`. (`unit` is a valid PLAN test-strategy type but never a manifest TC — see § Scope; there is no `unit.json`.) |
| `category` | yes | **Test nature**: `positive` \| `negative` \| `boundary` \| `regression`. Independent of `type` — a TC is one layer AND one nature (e.g. `type: e2e` + `category: negative`). |
| `automatable` | yes | `true` \| `false`. Decides the file: `false` → `manual.json` (any type). Manual TCs go to /arh-validate-feature manual follow-up |
| `priority` | yes | `Must` \| `Should` \| `Could` (mirrors story priority + AC criticality) |
| **`requirement_id`** | yes | **The AC / FR / NFR this TC validates.** Primary anchor is the story acceptance criterion it exercises: `<STORY-ID>-AC-<n>` (n = the AC's number in the story). Use `<STORY-ID>-FR-<n>` when the TC validates a specific delta FR, or `<STORY-ID>-NFR-<topic>` for a budget. Never a `### ` section header or a bare `FR1`. Closes the assertion-to-test loop. |
| `given` / `when` / `then` | yes | One-line behavioural summary (the AC-level trace anchor). The granular executable form lives in `steps` / `expected_results`. |
| `objective` | yes | One-line statement of what this TC verifies (expands `title`/intent). |
| `preconditions` | yes | string[] — state to set up before the steps (expands `given`). |
| `test_data` | yes | object — concrete input values the steps use (`{}` when the TC needs none). |
| `steps` | yes | string[] — ordered, executable actions (expands `when`; for `automatable: true` this is what the generated spec performs, for `automatable: false` what a human tester performs). |
| `expected_results` | yes | string[] — the checks made after the steps (granular expansion of `then`). |
| `tags` | yes | Free-form labels: `happy-path`, `edge-case`, `negative`, `regression-<bug-id>`, feature-area, platform, etc. (`category` is the pinned nature enum; `tags` stay open-ended.) |

## Scope: this manifest is BEHAVIOURAL-only by design

The test-case files enumerate **end-to-end + integration + performance + security + contract** TCs. **Unit tests are NOT enumerated as TCs by design** — they cover internal contracts (helper functions, hook cycles, schema validators, normalisers) not user-visible ACs. Unit-test work appears in `docs/features/<id>/tasks.json` as `tasks[]` entries titled like `vitest <Component>.test.tsx` or `pytest test_<module>.py unit`. PLAN.md §5 is a one-line pointer to that file and holds no task table — do not look for task rows there.

**Why this split:** AC → behavioural TC is 1:N (one AC produces several happy / boundary / negative TCs at the user-visible layer). Internal-contract tests are 1:1 with each new module and are framework-specific. Bundling them into this manifest doubles the maintenance surface for no governance benefit — `tasks.json` `file_plan` is the canonical inventory of new modules, and a declared unit test-strategy type is matched to a backing task by the `plan-validation` rubric's cross-section dimension (its wiring dimension checks entry-registration, not test coverage).

The test-pyramid balance is read from the `tasks.json` tasks + these files combined. Do NOT over-enumerate TCs to inflate counts.

## requirement_id — id set (pinned)

`requirement_id` MUST be one of these three forms, and MUST resolve to a real declared id (see the
validation gate under Coverage minimum). It is NEVER a `### ` subsection header or free text.

- `<STORY-ID>-AC-<n>` — n is the acceptance-criterion number in the story's `## Acceptance criteria`
  list. **This is the primary anchor** — every AC is a valid target, including ACs whose FR was
  omitted under the delta-only FR rule.
- `<STORY-ID>-FR-<n>` — a **bolded** `**<STORY-ID>-FR-N**` delta id present in the PRD
  `## Functional requirements` section. FRs are delta-only, so not every AC has one.
- `<STORY-ID>-NFR-<topic>` — `topic` matches **exactly** one of:
  `performance | security | accessibility | observability`.

Regex constraint: `^[A-Z]+-\d+-(AC-\d+|FR-\d+|NFR-(performance|security|accessibility|observability))$`

Forbidden: bare `FR1` / `FR8` (missing the `-` before the number), ids derived from `### FRn`
grouping headers, and NFR-topic deviations (`-NFR-authn`, `-NFR-perf`, `-NFR-a11y`) — all fail
the id-resolution validation gate under § Coverage minimum. When a story carries sub-topics under one
NFR section (e.g. NFR-security has both PII-logging and ownership-404 rules), TCs point to the
parent `-NFR-security` id; the sub-topic lives in the TC `title` and `tags`.

## Executable body (every test case)

**Every** TC — `automatable: true` and `false` alike — MUST populate `objective`,
`preconditions`, `test_data`, `steps` and `expected_results` in addition to the
one-line `given`/`when`/`then` summary. A TC carrying only `id`/`title`/`given`/`when`/
`then` is a schema violation (see § Anti-pattern).

The `automatable` flag decides *who* executes the body — a generated spec, or a human
at `/arh-validate-feature` § Manual follow-up — not *whether* the body exists. A manual
TC without steps is not a test; it is a note.

These fields are what the test generators consume. `/arh-generate-ui-tests` maps
`preconditions[]` → setup, `steps[]` → page-object actions, `expected_results[]` →
assertions, `test_data{}` → the values it substitutes; `/arh-generate-api-tests` maps
the same fields to requests, status/shape assertions and fixtures. Left unpopulated,
those generators have to invent the detail, which is exactly the guessing the test
case exists to prevent.

Field derivation from `given`/`when`/`then`:

- `objective`: one line stating what this TC verifies (and, for `automatable: false`,
  WHY it needs a human — the judgment call automation cannot make: visual quality,
  narration intelligibility, cognitive load). Not a bare restatement of `title`.
- `preconditions`: the `given` clause expanded into concrete setup steps executable
  without guessing (test account, seeded data, feature-flag state).
- `test_data`: the concrete input values the `steps` use, as a `{key: value}` object
  (`{}` when the case needs none). Two rules:
  - **Inputs only.** Put the values the steps *supply* here; the values
    `expected_results` *check* belong there, not here. A deliberately padded or blank
    input (`"  alice  "`, `""`) is a legitimate boundary value and must be recorded
    verbatim — downstream generators preserve these byte-exactly.
  - **Secrets as placeholders.** A password / token / PIN value must be a
    `<PLACEHOLDER>` resolved from the environment, never a literal credential. These
    files are committed, and the generators inline these values into specs and data
    files, so a literal here spreads to every artefact derived from it.

    **This rule is not enforced anywhere.** No lint or hook inspects `test_data` —
    F-007 covers MCP config files only, and the write hooks that scan for credential
    literals ship with the automation packs and see spec files, not this JSON. An
    issue-tracker integration may also render `test_data` verbatim into a remote
    ticket, putting a literal in front of a much wider audience than the repo. Treat
    the placeholder rule as load-bearing rather than advisory, and check it by eye
    when authoring a TC that carries an auth value.
- `steps`: the `when` clause expanded into an ordered, single-action-per-entry list.
- `expected_results`: the `then` clause expanded into the checks made after the steps —
  each a checkable statement, not a restatement of the acceptance criterion.

`category` (`positive` | `negative` | `boundary` | `regression`) is the test's nature,
independent of `type` (its layer): a happy-path login e2e is `type: e2e` +
`category: positive`; an invalid-input boundary check on the same layer is
`type: e2e` + `category: boundary`.

## Derivation rules (cross-layer core)

- One test case per AC, plus negative paths and boundary cases.
- Every TC MUST carry a `requirement_id` from the id set above — the AC it exercises
  (`<STORY-ID>-AC-<n>`) by default, or the specific delta FR / NFR budget it validates. No orphan
  TCs, and no id that is not declared in the story ACs or the PRD FR/NFR sections.
- **Do NOT enumerate unit-shaped TCs** (helper function, hook cycle, schema validator, normaliser tests). These belong in `tasks.json` `tasks[]`.
- Layer-specific derivation rules live in the per-layer knowledge files — load only
  the one(s) for the layer you are producing or consuming (see § Which layer file to
  load):
  - `${CLAUDE_SKILL_DIR}/layers/integration.md`
  - `${CLAUDE_SKILL_DIR}/layers/e2e.md`
  - `${CLAUDE_SKILL_DIR}/layers/performance.md`
  - `${CLAUDE_SKILL_DIR}/layers/security.md`
  - `${CLAUDE_SKILL_DIR}/layers/contract.md`
  - `${CLAUDE_SKILL_DIR}/layers/manual.md`

## Manual flag (automatable: false)

Mark `automatable: true` UNLESS the test requires human judgment that no automation
can substitute — the full heuristics table (what is automatable with Playwright/axe
and what genuinely needs a human) lives in `${CLAUDE_SKILL_DIR}/layers/manual.md`.
When in doubt, default to `automatable: true` and write the spec. The cost of an
extra automated test is one CI minute; the cost of a manual TC is a deferred
carry-forward entry per validation run.

## Coverage minimum (machine-enforced before /arh-plan-requirements gate)

For the `coverage_audit` in `index.json` to pass:

1. **Every AC in the story → ≥1 TC.** ACs are the total coverage obligation (every AC exists; FRs
   are delta-only). List them under `coverage_audit.acceptance_criteria`.
2. **Every delta FR in the PRD `## Functional requirements` → ≥1 TC** with `requirement_id` matching
   that FR's id. Supplementary — an FR only exists when it adds a constraint beyond the AC.
3. **Every NFR with a numeric budget → ≥1 typed TC** matching the NFR domain:
   - Performance NFR (latency / throughput / memory) → ≥1 TC `type: performance`
   - Security NFR (authn/authz/PII) → ≥1 TC `type: security`
   - Contract NFR (API shape / breaking change policy) → ≥1 TC `type: contract`
4. `coverage_audit.uncovered` MUST be empty. Any entry → the agent self-corrects (max 1 round) by generating the missing TC, then escalates if still uncovered.

**Validation gate (run before emitting `coverage_audit`):** every `requirement_id` used by a TC MUST
match the regex above AND resolve to a real declared id — a story AC number, a bolded PRD delta FR
id, or a PRD NFR topic. An id that does not resolve (invented from a `### FRn` header, or a bare
`FR1`) is a defect: fix the TC; never list a phantom id in the audit.

The `coverage_audit` section is generated AFTER every layer file is written — the agent enumerates
the story ACs + the PRD delta-FR + NFR ids, queries the `requirement_id` of every TC across all
layer files, and emits the audit (`acceptance_criteria`, `functional_requirements`,
`non_functional_requirements`, `uncovered`) into `index.json`.
Phase 4 Product Gate fails if `coverage_audit.uncovered` is non-empty.

## Cross-reference with Scope "Out:"

Before adding a TC, check the FR/NFR id against REQUIREMENTS.md `## Scope` → `Out:` section. If the requirement is in Out scope, the TC MUST NOT be generated. If a TC accidentally references an Out-scope id, surface as a warning at coverage-audit time.

## Regression-tag protocol (used by /arh-implement fix-loop, G4; surfaced by /arh-validate-feature, V4)

When `/arh-implement` Step 3 fixes a validation failure, the implementation-agent MUST add or extend at least one TC that would have caught the failure:

- **New TC for a fixed bug:** assign id `<STORY>-TC-<NN>` — NN = max `<NN>` in the
  `index.json` `files` map + 1 — and tag `regression-<original-TC-id>`. Example:
  `tags: ["regression-CHK-014-TC-03"]`. The TC lands in the layer file matching its
  `type` (or `manual.json` when `automatable: false`); create the file if absent.
- **Extending an existing TC:** add the new boundary to `then:` in its layer file and append `regression-<original-TC-id>` to `tags`.
- Either way, apply the § Index-update contract: update `counts`, the `files` map, and
  re-run the `coverage_audit` step. The audit MUST still report `uncovered: []`.
- A fix-pass without a regression-tagged TC is rejected by Step 3; the fix is re-run with the regression-tag requirement re-stated.

This tag pattern records the bug→fix→test chain for any regression that re-surfaces. `/arh-validate-feature` Phase 5 surfaces every regression-tagged TC in a dedicated `## Regression coverage` section. **A regression-tagged TC that fails AGAIN drops the validation verdict to PARTIAL** — the bug has re-surfaced and must feed the next fix loop.

## last_run schema (written by /arh-validate-feature, V1 + V3)

After each /arh-validate-feature run, every automatable TC carries a `last_run` block —
written into the TC's own layer file (a field patch: `index.json` is not touched):

```json
{
  "last_run": {
    "started_at":     "<iso8601>",
    "duration_ms":    1234,
    "status":         "PASS | FAIL | ERROR",
    "verdict":        "PASS | FAIL | FLAKY",
    "attempts": [
      {"n": 1, "status": "FAIL", "duration_ms": 1100, "reason": "..."},
      {"n": 2, "status": "PASS", "duration_ms": 1234, "reason": null}
    ],
    "budget": {
      "target":      "p95 < 250ms @ 100 RPS",
      "measured":    "p95 = 312ms @ 100 RPS",
      "budget_pass": false
    },
    "failure_reason": "<one line; null on PASS>",
    "artefact":       "tests/e2e/output/<TC-id>/arh-trace.zip",
    "runner":         "playwright | maestro | pytest | k6",
    "rerun_count":    1
  }
}
```

Field rules:
- `status` carries the **final attempt's** raw outcome (backwards-compatible with existing readers).
- `verdict` is the flake-aware judgement: PASS = all attempts pass, FLAKY = mixed, FAIL = all attempts fail.
- `attempts[]` records every retry triggered by `harness.yaml outputs.validation.retry_count` (default 2; 0 disables; capped at 5).
- `budget` is present only on `type: performance` TCs (i.e. in `performance.json`). `budget_pass: null` when the NFR string is unparseable.
- Manual TCs (`automatable: false`, in `manual.json`) keep `last_run: null`.

## Which layer file to load

Load only what applies — that is the point of the split:

| Consumer | Knowledge | Data |
|---|---|---|
| Test-case authoring (test-case-agent, /arh-implement fix-loop regression TCs) | all `${CLAUDE_SKILL_DIR}/layers/*.md` | `index.json` + all layer files |
| TC iteration (/arh-iterate-test-cases — delta edits, PRD sync) | all `${CLAUDE_SKILL_DIR}/layers/*.md` | `index.json` + all layer files (baseline archived per round) |
| UI automation (/arh-generate-ui-tests, /arh-heal-ui) | `${CLAUDE_SKILL_DIR}/layers/e2e.md` | `e2e.json` |
| API automation (/arh-generate-api-tests) | `${CLAUDE_SKILL_DIR}/layers/contract.md`, `${CLAUDE_SKILL_DIR}/layers/security.md` | `contract.json`, `security.json` |
| Validation run (/arh-validate-feature) | the layer file per TC `type` encountered | `index.json` + every layer file |
| Manual follow-up (/arh-validate-feature § Manual follow-up) | `${CLAUDE_SKILL_DIR}/layers/manual.md` | `manual.json` |
| Plan validation (runner-setup dimension) | — | `e2e.json`, `performance.json`, `contract.json` |
| Test-data CSV (/arh-generate-test-data) | — | all automatable layer files (skip `manual.json`) |
| Tracker push (Phase 4b) | — | `index.json` `files` map → every listed file, fixed layer order |

## Anti-pattern

- TC without `requirement_id` — orphan test, can't trace assertion → spec.
- TC `requirement_id` pointing to a non-existent FR/NFR — broken trace.
- TC carrying only `given`/`when`/`then` with no `steps` / `expected_results` /
  `test_data` — schema violation. The test generators have nothing executable to work
  from and fall back to inventing it.
- Skipping the body on `automatable: false` — a manual TC needs steps *more* than an
  automated one, because no spec exists to read the intent from.
- Bulk-generating happy-path-only TCs — coverage audit catches missing edge/negative cases per AC.
- Fix that ships without a `regression-<id>`-tagged TC — silently re-breakable; rejected at Step 3.
- Adding a TC to a layer file without updating `index.json` (`counts`, `files`,
  `coverage_audit`) — the TC is invisible to every map-driven consumer.
- A TC whose `type`/`automatable` disagrees with the file it lives in (e.g. a
  `type: performance` TC inside `e2e.json`, or an `automatable: false` TC outside
  `manual.json`) — the layout IS the filter; a misfiled TC is silently skipped or
  double-handled.
