# Phase 2 — Tracker sync (best-effort)

Goal: keep the tracker honest after the Phase 1 delta — updated issues for modified TCs,
a close-me comment for removed ones, and a NEW issue for every added TC. Best-effort in
the same sense as `/arh-plan-requirements` Phase 4b: a tracker failure here is reported,
never fatal, and never rolls back the iteration.

## Skip conditions (must be logged)

- `provider: none` in `docs/config/issue-tracking.yaml` → skip silently.
- No `tracker_story` on the feature → log and skip everything (nothing was ever pushed,
  and an added TC cannot be linked to a parent that has no key). Added TCs then wait for
  `/arh-plan-requirements` Phase 4b like any never-pushed set.
- No TC in the set carries the provider's returned-key field (see the provider skill's
  § Returned key — the field is integration-added; base never names it), i.e. the set has
  never been pushed → skip: `Tracker sync skipped — nothing pushed yet; the first push
  belongs to /arh-plan-requirements Phase 4b after gate approval.` This keeps the
  pre-approval orphan-issue protection the Product Gate exists for: this step never
  creates the FIRST tracker footprint, it only keeps an existing one honest.
- MCP unavailable → log: `Tracker sync FAILED — MCP unavailable. Re-run later.` and
  continue to Phase 3.

## Pre-sync secret scan (same rule as Phase 4b — run BEFORE any create or update)

Updates and creates alike render `test_data{}` verbatim into the remote issue body, so a
`--feedback` edit that introduced a credential literal is exfiltrated the moment this
step runs. Scan every ADDED and MODIFIED TC's `test_data` values for live-credential
shapes — `ghp_`, `xoxb-`, `sk_live_`, `AKIA`, `sk-` — plus any value under a key named
like `password` / `token` / `secret` / `apikey` / `pin` that is not wrapped in `<…>`.

On a hit: **drop that TC from this step's batch**, log its id and the offending key, and
sync the rest. Never push and then redact — every tracker keeps the original in its
history. (Untouched TCs were scanned by the original push; only the delta needs it here.)

## Procedure

For each TC the Phase 1 hand-off lists, in id order:

1. **Modified** TC that carries the provider's returned key → invoke
   `issue-tracking-agent` with operation `update` on that key: title from the TC `title`,
   body re-rendered per the provider skill's § Description template (same rendering the
   original push used, so the issue reflects the TC's current executable body).
   A modified TC that carries NO returned key (it sat in the keyless remainder of a
   capped Phase 4b push) gets no tracker action — count it under skipped (`no vehicle`);
   the next `/arh-plan-requirements` Phase 4b run creates its issue from the current,
   already-edited body, so nothing is lost.
2. **Removed** TC that carried a returned key → invoke `issue-tracking-agent` with
   operation `comment` on that key:
   `Test case removed in /arh-iterate-test-cases round <N> of <story-id> — close this issue manually.`
   There is no delete path in the harness and this step must not invent one — a comment
   plus a human close keeps the tracker history honest.
3. **Added** TCs (only when the set has been pushed before — i.e. at least one TC carries
   the provider's returned key; otherwise the skip condition above already routed them to
   Phase 4b) → invoke `issue-tracking-agent` with operation `push-test-cases`, exactly as
   `/arh-plan-requirements` Phase 4b does:
   - Parent story key: `tracker_story` from `docs/features/$ARGUMENTS[0]/state.json`.
   - Test cases: ONLY the added TC ids, read from their layer files. Scope note: the
     § Sequence's "does not already carry the returned key" filter is evaluated over the
     candidate set the caller passes — pass just the added TCs (plus `index.json` for the
     id registry), never the whole directory. Keyless leftovers from an earlier capped
     Phase 4b run stay Phase 4b's job (re-run `/arh-plan-requirements` to finish a capped
     push); pushing them here would break this report's pushed-count arithmetic and
     double-spend the cap.
   - Cap: **15** items created per run (a delta rarely approaches it; hitting it is a
     checkpoint — report `pushed X/Y (cap reached)` and re-run to finish).
   - Sequence: read `§ Sequence` from
     `.claude/skills/arh-plan-requirements/steps/04b-push-test-cases.md` and pass it
     verbatim. That step OWNS the create → record → link order, the per-item write-back,
     and the provider-section lookups; this step is a second call site, never a second
     definition — do not restate or paraphrase the sequence here.
4. **Moved** TCs (layer file changed, id unchanged) need no tracker action — the key
   moved with the TC object.

Per-item, not batch: report each create/update/comment as it lands, so an interruption
loses at most one item's sync, and the report can name exactly which issues are current.

## Report

```
Tracker sync: <P> pushed, <U> updated, <C> commented (manual close), <S> skipped (secret scan | no vehicle)
Tracker: {provider}
```

Any item that failed is listed with its TC id and the error — a partial sync is a
reportable outcome, never a silent success. Before reporting a pushed count, confirm that
many added TCs actually carry a returned key in their layer file (same discipline as
Phase 4b).
