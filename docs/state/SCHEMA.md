# Project state — schema v3 (two-tier)

State splits across two locations:

- **`docs/state/features.json`** — INDEX. One entry per feature with status-mirror fields only. Cross-feature readers (SessionStart hook, dashboards, `/arh-trace`) read this single small file.
- **`docs/features/<id>/state.json`** — per-feature FULL RECORD. Created at `/arh-plan-requirements` Phase 1 (the migration point). Holds heavy arrays + nested data.

## Path per phase (no runtime fallback)

Each phase hardcodes which file it reads / writes.

| Phase | File |
|---|---|
| `/arh-intake`, `/arh-validate-story`, `/arh-research`, `/arh-import` (pre-plan) | `docs/state/features.json[<id>]` |
| `/arh-plan-requirements` (migration point) | reads index entry; creates `docs/features/<id>/state.json`; slims index to status-mirror |
| `/arh-plan-implementation`, `/arh-implement`, `/arh-develop-feature`, `/arh-validate-feature`, `/arh-review`, `/arh-security-review`, `/arh-iterate-design`, `/arh-iterate-test-cases`, `/arh-clarify`, `/arh-human-review`, `/arh-sync`, `decide` (post-plan) | `docs/features/<id>/state.json` (primary) + mirror B-tier status fields to index |

## Tier legend

- **I** = index only (pre-plan)
- **P** = per-feature only (heavy fields)
- **B** = BOTH (primary in per-feature, mirrored to index on same write)

## Index entry shape

Status-mirror fields, plus two derived story fields written pre-plan by `/arh-intake` Step 3 (they migrate to the per-feature record at `/arh-plan-requirements`). Pre-plan: upstream fields populate only. Post-plan: every status literal mirrors per-feature record's value.

```jsonc
{
  "<EPIC>-<SEQ>": {
    "story": "draft | validated | escalated | imported:<source>",
    "story_priority": "P1 | P2 | P3",
    "story_independent_test": true,          // pre-plan only; migrates to per-feature record at /arh-plan-requirements
    "needs_clarification_count": 0,          // pre-plan only; migrates to per-feature record at /arh-plan-requirements
    "research": "pending | complete | skipped:<reason>",
    "research_verdict": "GO | GO-WITH-CONDITIONS | SPIKE | BLOCK | null",
    "prd": "pending | complete | null",
    "design": "pending | complete | n/a | null",
    "gate": "PENDING | APPROVE | CHANGES | null",
    "plan": "pending | complete | null",
    "impl": "pending | complete | null",
    "validation": "pending | passed | partial | failed | null",
    "review": "PASS | PASS WITH WARNINGS | BLOCKED | null",
    "security": "pending | PASS | BLOCKED | null",
    "tracker_story": "<KEY-XX | null>",
    "tracker_research": "<KEY-XX | null>",
    "tracker_prd": "<KEY-XX | null>",
    "tracker_plan": "<KEY-XX | null>",
    "rtm_source_sha": "<sha256 of requirement source, first 12 hex — VCS-independent, not a git SHA>",
    "phase": "imported | story | story-validated | research | plan-requirements | plan-requirements-approved | plan-implementation | implementation | review | security-reviewed",
    "last_updated": "<iso8601>"
  }
}
```

## Per-feature record shape

One object per feature; id is the directory name.

```jsonc
{
  // status mirrors (also in index)
  "story", "story_priority", "research", "research_verdict",
  "prd", "design", "gate", "plan", "impl",
  "validation", "review", "security",
  "tracker_story", "tracker_research", "tracker_prd", "tracker_plan",
  "rtm_source_sha", "phase", "last_updated",

  // P-tier only (heavy)
  "story_independent_test": true,
  "needs_clarification_count": 0,
  "design_artifact": "docs/features/<id>/DESIGN.md | null",
  "design_provider": "figma | claude-design | stitch | html-mockup | none",
  "design_iteration": 0,
  "plan_validation": "PASS | FAIL | ESCALATED",
  "plan_validation_rounds": 1,
  "impl_branch": "feature/<id>",
  "validation_summary": "<DATE> P=<P>/<TOTAL> in <N> round(s)",
  "review_report": "docs/features/<id>/REVIEW.md",
  "decisions_referenced": ["D-01", "D-02"],
  "security_findings": {"critical": 0, "high": 0, "medium": 0, "low": 0, "tool_missing": []},
  "security_report": "docs/features/<id>/SECURITY-<DATE>.md",
  "governance_profile": ["standard", "strict | hipaa | pci | sox | gdpr"],
  "tracker_review_comment": "<COMMENT-ID>",
  "last_synced_at": "<iso8601 — set by /arh-sync>",

  "decisions": {
    // Pointer only. The story-level decision log lives in the companion file
    // docs/features/<id>/DECISIONS.md — one `### D-NN` entry per non-trivial choice,
    // human Context/Decision prose plus greppable `blast:`/`rev:`/`adr:` header slugs
    // (written by /arh-plan-implementation via the `decide` skill; appended
    // mid-implementation by /arh-implement). Replaces the former inline decisions[] array.
    "file": "docs/features/<id>/DECISIONS.md"
  },

  "data_design": {
    // Pointer only. The feature's state/data design lives in the companion file
    // docs/features/<id>/DATA-DESIGN.md — a fixed ten-concern checklist (data model,
    // migrations, ownership, classification/retention, consistency, caching, ephemeral
    // state, query-path performance, contract (API/interface), async & messaging), each
    // specified or marked `N/A — <reason>` (written by /arh-plan-implementation via the
    // `plan-authoring` skill). Absent when the feature is fully stateless (PLAN §4 then
    // reads "No state or data concerns.").
    "file": "docs/features/<id>/DATA-DESIGN.md"
  },

  "clarifications": [
    {"round": 1, "asked_at": "<iso8601>", "asked_by": "<phase/step>",
     "tracker_comment": "<KEY-XX | null>",
     "status": "asked | partially-answered | resolved",
     "questions": [
       {"qid": "Q-NN", "marker": "<question>", "source_doc": "<path>",
        "source_line": 42, "category": "scope | security | integration | ux",
        "blocking": "T-NN | null", "answer": "<text | null>",
        "answered_at": "<iso8601 | null>", "applied_at": "<iso8601 | null>"}
     ]}
  ],

  "agent_flags": [
    {"flag_id": "AF-NN",
     "kind": "sensitive-default | inconsistency | risky-pattern | dead-code | unusual-shape | other",
     "summary": "<one-line>", "source": "<path:line>", "task_id": "T-NN | null",
     "raised_at": "<iso8601>", "raised_by": "<agent-name>",
     "status": "open | accept | reject | defer",
     "decision": "<one-line>", "decided_by": "<user>", "decided_at": "<iso8601>",
     "rationale": "<one-line>", "carry_forward_ref": "<item_id | null>"}
  ],

  "pending_carry_forward": [
    // An item is DISCHARGED when `resolved_at` is set (closed with evidence) or
    // `accepted_at` is set (explicitly accepted at merge time). `deferred_until`
    // alone is not a discharge — it records a target date, not a decision.
    // Compliance-tagged items (a `compliance` field, or `compliance`/`hipaa`/
    // `pci`/`sox`/`gdpr` in `tags` / `labels` / `category`) can only be
    // discharged by resolution; acceptance never clears them.
    // `harness gates <id>` reads this array as the carry-forward merge gate.
    {"item_id": "<slug>", "kind": "test_case | task | risk | finding",
     "reason": "<one-line>", "owner": "<user-or-team>",
     "added_at": "<iso8601>", "added_by": "<phase/step>",
     "tags": ["<free-form; compliance markers are read by the gate>"],
     "resolved_at": null, "evidence": null,
     "accepted_at": null, "acceptance_reason": null,
     "deferred_until": null}
  ],

  "fixes": [
    // appended by `/arh-fix --for <id>` when a hotfix patches this feature.
    // The full record lives in docs/fixes/fix-<NN>.md; this is the backlink.
    {"fix_id": "FIX-NN", "summary": "<one-line>",
     "regression_test": "<id>", "added_at": "<iso8601>"}
  ],

  "tasks": {
    // Pointer only. The task DAG + file plan + live status live in the companion file
    // docs/features/<id>/tasks.json (created by /arh-plan-implementation, status-updated
    // by /arh-implement). Replaces the former inline impl_tasks[] array — see the
    // tasks.json shape documented below this block.
    "file": "docs/features/<id>/tasks.json"
  },

  "impl_evidence": {
    // six-dimension packet — N/A dimensions raise an `evidence-na` agent flag.
    // Sources from project-commands.yaml + stack-smoke.md.
    "session_ended_at": "<iso8601>",
    "checks": {
      "typecheck":    {"status": "PASS | FAIL | N/A", "command": "...", "exit_code": 0,
                       "evidence_path": "docs/features/<id>/evidence/typecheck.log | null",
                       "flag_id": "AF-NN | null", "ran_at": "<iso8601 | null>"},
      "unit_tests":   {/* same shape, source: project-commands.yaml test_unit: (fallback test:) */},
      "lint":         {/* same shape, source: project-commands.yaml lint: */},
      "runtime":      {/* dimension status PASS | FAIL | N/A; per-stack detail in
                          "stacks": [{"stack": "<id>", "status": ..., "command": "...",
                          "exit_code": 0, "evidence_path": "...", "boot_log_scan":
                          "clean | matched:<pattern>"}], one entry per runnable stack;
                          source: stack-smoke.md */},
      "compile":      {/* same shape, source: project-commands.yaml build: */},
      "design_check": {/* same shape, source: project-commands.yaml design_check: */}
    },

  "activity_log": [
    // audit trail of actions taken on this feature (append-only, sorted by timestamp descending when read)
    {"command": "validate-story",
     "description": "Story validated",
     "timestamp": "<iso8601>",
     "result": "PASS | FAIL | PENDING",
     "agent": "<agent-name | null>",
     "phase_transition": "<phase>"}
  ]
  },

  "sync_baseline": {
    // per-field remote snapshot at last successful /arh-sync (story, research, prd, tracker_*, etc.)
    "_etc": "used by /arh-sync three-way merge"
  }
}
```

## Field ownership

**Architectural rule:** state is local truth. Status fields carry STATUS LITERALS — never tracker keys. Tracker keys live in dedicated `tracker_*` fields. Status writes happen at **artefact-creation** time.

| Field | Tier | Written by | Step file |
|---|---|---|---|
| `story` (`draft`) | **B** | story file header at author time | `intake/steps/02-author-validate.md` (I; per-feature dir not yet created) |
| `story` (`validated` / `escalated`) | **B** | `/arh-intake` Step 3 (serial record) / `/arh-validate-story` (after the agent hands off) | `intake/steps/03-record.md`, `intake/skills/arh-validate-story/SKILL.md.j2` |
| `story` (`imported:<source>`) | **B** | `/arh-import` | `import/SKILL.md.j2` |
| `story_priority` | **B** | `/arh-intake` Step 3 (from RTM, recorded serially) | `intake/steps/03-record.md` |
| `story_independent_test`, `needs_clarification_count` | **P** | `/arh-intake` Step 3 (derived by `story-author-agent`, recorded serially; I pre-plan, migrates to P at plan-requirements) | `intake/steps/03-record.md` |
| `research`, `research_verdict` | **B** | `research-agent` (via `/arh-research` Phase 1) | `skills/research-assessment/SKILL.md.j2` |
| `prd`, `needs_clarification_count` | **B**/**P** | `/arh-plan-requirements` Phase 1 — **migration point** | `plan-requirements/steps/01-draft-prd.md` |
| `design` | **B** | `product-spec-agent` (stub) + `ux-agent` (complete) | `plan-requirements/steps/01-draft-prd.md`, `ux-agent` end-of-run |
| `design_artifact` | **P** | `product-spec-agent` OR `ux-agent` | `product-spec-agent.md.j2`, `ux-agent.md.j2` |
| `design_provider` | **P** | composer at generate time | `emitters/claude_code.py` |
| `design_iteration` | **P** | `/arh-iterate-design` Step 0/1 | `iterate-design/steps/00-context.md`, `iterate-design/steps/01-iterate.md` |
| `gate` | **B** | `/arh-plan-requirements` Phase 4; `/arh-iterate-test-cases` Phase 3 (drops APPROVE to PENDING on a TC change, re-collects the verdict) | `plan-requirements/steps/04-product-gate.md`, `iterate-test-cases/steps/03-gate.md` |
| `plan` | **B** | `/arh-plan-implementation` Phase 2 | `plan-implementation/steps/02-tracker.md` |
| `plan_validation`, `plan_validation_rounds` | **P** | `impl-planning-agent` (via `/arh-plan-implementation` Phase 1) | `skills/plan-authoring/SKILL.md.j2` |
| `decisions` (pointer to `docs/features/<id>/DECISIONS.md`) | **P** | `impl-planning-agent` writes the pointer; `decide` writes the DECISIONS.md log it points to (appended mid-impl by `/arh-implement`) | `plan/agents/impl-planning-agent.md.j2` (pointer), `decide/SKILL.md` (log) |
| `data_design` (pointer to `docs/features/<id>/DATA-DESIGN.md`) | **P** | `impl-planning-agent` (via `plan-authoring` § State and data design); absent for fully-stateless features | `plan/agents/impl-planning-agent.md.j2` (pointer), `skills/plan-authoring/SKILL.md.j2` (format) |
| `clarifications[]` | **P** | `/arh-clarify` Phase 2/4 | `clarify/steps/02-bundle.md`, `clarify/steps/04-apply.md` |
| `agent_flags[]` | **P** | raise: implementation/code-review agent; triage: `/arh-human-review` Phase 2 | `human-review/steps/00-context.md`, `human-review/steps/02-apply.md` |
| `pending_carry_forward[]` | **P** | `impl-planning-agent`, `/arh-human-review` Phase 2, and the `/arh-implement` Step 2 gate orchestrator (post-join, from entries `validation-agent` / `code-review-agent` RETURN). Standalone `/arh-validate-feature` / `/arh-review` → those two agents self-write | `skills/plan-authoring/SKILL.md.j2`, `human-review/steps/02-apply.md`, `implement/steps/02-validate.md`, `skills/validation-execution/SKILL.md.j2`, `skills/review-assessment/SKILL.md.j2` |
| `pending_carry_forward[].resolved_at`, `.evidence` | **P** | `harness carry-forward resolve <id> --evidence <path>` | `commands/carry_forward.py` |
| `pending_carry_forward[].accepted_at`, `.acceptance_reason` | **P** | `harness carry-forward accept <id> --reason <text>` — the state-side record of merge-time acceptance (the `--accept-pending` flag only annotated the PR body, so nothing could verify it) | `commands/carry_forward.py` |
| `pending_carry_forward[].deferred_until` | **P** | `harness carry-forward defer <id> --until <YYYY-MM-DD>` — a target date, NOT a discharge | `commands/carry_forward.py` |
| `fixes[]` (hotfix backlinks; full record in `docs/fixes/fix-<NN>.md`) | **P** | `/arh-fix --for <id>` Step 4 | `fix/steps/04-commit-pr.md` |
| `impl` | **B** | `/arh-implement` Step 5; OR `/arh-develop-feature` Step 2 (same referenced step — the commit happened, so the receipt is written; that command writes no verdict field alongside it) | `implement/steps/05-commit-pr.md`, `implement/skills/arh-develop-feature/steps/02-commit-draft-pr.md` |
| `impl_branch` | **P** | `/arh-implement` Step 5; OR `/arh-develop-feature` Step 2 | `implement/steps/05-commit-pr.md`, `implement/skills/arh-develop-feature/steps/02-commit-draft-pr.md` |
| `tasks` (pointer to `docs/features/<id>/tasks.json`) | **P** | `/arh-plan-implementation` (creates tasks.json) → `/arh-implement` Step 1 or `/arh-develop-feature` Step 1 (same referenced step; updates status, enables `--resume`) | `skills/plan-authoring/SKILL.md.j2`, `implement/steps/01-implement.md`, `implement/skills/arh-develop-feature/steps/01-develop.md` |
| `impl_evidence` | **P** | `implementation-agent` end-of-session, in either command (`/arh-implement` Step 1 or `/arh-develop-feature` Step 1) — N/A dimensions raise `evidence-na` flag | `implement/steps/01-implement.md`, `implement/skills/arh-develop-feature/steps/01-develop.md` + `evidence-pass/SKILL.md.j2` |
| `validation` | **B** | `/arh-implement` Step 2 gate orchestrator (post-join, per round) → carried forward verbatim by Step 5; OR `validation-agent` standalone (via `/arh-validate-feature`) — same literal set, same contract. `partial` is a legal literal (trinary GREEN admits `V == PARTIAL`); never rewrite it to `passed`. A standalone run records `failed` too, so `/arh-review` can tell a red validation from an absent one | `implement/steps/02-validate.md`, `implement/steps/05-commit-pr.md`, `skills/validation-execution/SKILL.md.j2` |
| `validation_summary` | **P** | `/arh-implement` Step 2 gate orchestrator (post-join) → carried forward by Step 5; OR `validation-agent` standalone (via `/arh-validate-feature`) | `implement/steps/02-validate.md`, `implement/steps/05-commit-pr.md`, `skills/validation-execution/SKILL.md.j2` |
| `review` | **B** | `/arh-implement` Step 2 gate orchestrator (post-join, per round) → carried forward verbatim by Step 5; OR `code-review-agent` standalone (via `/arh-review` Phase 1) | `implement/steps/02-validate.md`, `implement/steps/05-commit-pr.md`, `skills/review-assessment/SKILL.md.j2` |
| `review_report` | **P** | `/arh-implement` Step 2 gate orchestrator (post-join); OR `code-review-agent` standalone (via `/arh-review` Phase 1) | `implement/steps/02-validate.md`, `skills/review-assessment/SKILL.md.j2` |
| `decisions_referenced` | **P** | `/arh-implement` Step 5; OR `/arh-develop-feature` Step 2 (same referenced step's G14 PR-body section) | `implement/steps/05-commit-pr.md`, `implement/skills/arh-develop-feature/steps/02-commit-draft-pr.md` |
| `security` | **B** | `security-review-agent` (via `/arh-security-review` Step 1) | `skills/security-assessment/SKILL.md.j2` |
| `security_findings`, `security_report` | **P** | `security-review-agent` (via `/arh-security-review` Step 1) | `skills/security-assessment/SKILL.md.j2` |
| `governance_profile` | **P** | `harness generate` | composer — list of every loaded profile, always including `standard` |
| `tracker_story` | **B** | `/arh-intake` Step 5 (conditional) | `intake/steps/05-issue-tracker-sync.md` |
| `tracker_research` | **B** | `/arh-research` Phase 2 (conditional) | `research/steps/02-tracker.md` |
| `tracker_prd` | **B** | `/arh-plan-requirements` Phase 3 (conditional) | `plan-requirements/steps/03-consolidate.md` |
| `tracker_plan` | **B** | `/arh-plan-implementation` Phase 2 (conditional) | `plan-implementation/steps/02-tracker.md` |
| `tracker_review_comment` | **P** | `/arh-implement` Step 6 (conditional); OR `/arh-develop-feature` Step 3 (same referenced step; its comment states gates pending instead of completion) | `implement/steps/06-tracker-completion.md`, `implement/skills/arh-develop-feature/steps/03-tracker.md` |
| `rtm_source_sha` | **B** | `/arh-intake` Step 3 (copied from the RTM `Source hash`, computed by `decomposition-agent`) | `intake/steps/03-record.md` |
| `last_synced_at`, `sync_baseline.*` | **P** | `sync-agent` (via `/arh-sync` apply) | `skills/tracker-sync/SKILL.md.j2` |
| `phase`, `last_updated` | **B** | every command on transition (mirror in same write). `phase == "implementation"` is written only by `/arh-develop-feature`, only on a run whose Step 2 landed a commit and a draft PR (it means "committed, not yet gated" — a run that committed nothing leaves `phase` untouched), and only forwards — a feature already at `review` / `security-reviewed` keeps its value, per § Transitions; `/arh-implement` Step 5 writes `"review"` directly, because its gate ran before the commit | each step file, `implement/skills/arh-develop-feature/steps/04-handoff.md` |
| `activity_log` | **P** | every command that advances phase (append entry on state write), plus `/arh-develop-feature` (`phase_transition: "implementation"` when it wrote `phase`, `"none"` when it left it untouched) | each step file |


## Companion file — `docs/features/<id>/tasks.json`

The task DAG + file plan + live task status are NOT stored inline in the per-feature record
(`state.json` holds only the `tasks.file` pointer). They live in `tasks.json`, created by
`/arh-plan-implementation` and status-updated by `/arh-implement`:

```json
{
  "schema_version": 1,
  "story_id": "<STORY-ID>",
  "generated_by": "arh-plan-implementation",
  "generated_at": "<iso8601>",
  "file_plan": {
    "F-01": {"action": "create | modify | generate | external", "path": "<repo path OR stable external id>", "reason": "<one-line>"}
  },
  "tasks": [
    {"task_id": "T-NN", "title": "<one-line>", "complexity": "S | M | L",
     "predecessors": ["T-NN"], "files": ["F-NN"],
     "ac_refs": ["<STORY-ID>-AC-<n>"], "risk_refs": ["R-NN"], "notes": "<one-line>",
     "status": "pending | done | blocked | skipped",
     "completed_at": "<iso8601 | null>", "files_touched": ["<repo path>"],
     "reason": "<when status != done | null>"}
  ]
}
```

- `predecessors` forms a DAG. Cycles, self-references and dangling edges are rejected at write time
  by `plan-validation` § Cross-section consistency → *Acyclic*; the `/arh-implement` Step 1 scheduler
  escalates any that survive (a cycle leaves its ready set permanently empty). Execution order and parallelism
  are **derived** from it — there is no stored `[P]`/parallel field (would drift, like a wave number).
- Parallelism rule: two tasks may run concurrently iff DAG-independent AND their `files[]`
  (resolved via `file_plan`) are disjoint. A non-file conflict (shared DB/port) is serialized by
  adding a `predecessors` edge — the DAG is the single place ordering + mutual-exclusion live.
- Replaces the former `state.json impl_tasks[]` array.

## Read-only consumers

- `phase-preconditions` skill — gates each command using its declared path. No runtime fallback.
- `/arh-explain <id>` — picks file by phase, not existence check.
- `/arh-trace --verify` — iterates index for cross-feature scan; reads per-feature for deep state.
- `session-context-loader` hook — reads index only.
- `harness gates <id>` — the merge-gate check. Reads `validation`, `review`, `security` and
  `pending_carry_forward[]` from the per-feature record (falling back to the index entry for
  pre-plan and legacy single-file layouts) and exits non-zero unless every required gate has
  recorded a passing literal. Never writes. Run it in CI — `.github/workflows/harness-gates.yml`
  is emitted for `integrations.ci: github-actions`.

## Transitions

`(absent) → imported|story → story-validated → research → plan-requirements → plan-requirements-approved → plan-implementation → implementation → review → security-reviewed`. Other transitions are bugs; `phase-preconditions` rejects out-of-order invocations.
