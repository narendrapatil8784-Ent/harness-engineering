---
name: deep-scan-verification
description: Scan a codebase's source into verified, human-approved facts — read-write-purge per folder, proof-command-per-fact, capped 3-round approval. Used by bootstrap-agent.
when_to_use: /arh-init Phase 6 (brownfield, mandatory) — building durable, cited knowledge about how an existing codebase actually works, beyond what config files reveal.
user-invocable: false
allowed-tools: Read Grep Glob Bash
model: sonnet
---
# Deep-scan verification

Turns "the agent skimmed some code and thinks X" into "X is a fact someone can re-check with one command, and a human already agreed it's worth remembering."

## Mandatory, whole repo, no cap

For a brownfield project, the first scan (and every `--full` rescan) runs over the entire repo, every file — it is not offered as a choice and there is no file-count or time budget to weigh. The harness needs real, cited knowledge of the existing codebase before any implementation work starts, so correctness of coverage is the gate here, not cost.

Exclude standard non-source directories from the walk — `.git`, `.claude` (harness's own generated tree, not the application), dependency directories (`node_modules`, `.venv`, vendored packages), build/dist output, `__pycache__`. These are noise, not signal, and scanning them would not add to "knowledge of how the codebase actually works."

If a repo is genuinely too large to finish in one pass, stop and report what's left as deferred — never silently truncate without saying so. Re-running later is always safe: a rescan replays the stored proof of each fact whose files changed and keeps the rest untouched (see § Refresh). A `--full` rescan walks the whole repo again.

## The loop, per folder

1. **Read** one folder — every file in it, not a sample.
2. **Extract** candidate facts — a short claim plus a one-line, read-only proof command (e.g. `grep -rn "class RetryClient" src/lib/`), within § Proof commands.
3. **Write** each candidate to the running list immediately.
4. **Purge** — drop the folder's file contents from context; keep only the written candidates and a running count. Never accumulate raw file contents across folders — a repo does not fit in context, and it does not need to: the candidates already written down are the memory.
5. Move to the next folder.

## Verify

For every candidate, run its own proof command for real before it counts as anything.

- Output confirms the claim → **accepted**. Its proof command is written with the fact (§ Where verified facts go), so a later rescan can replay it.
- Output contradicts it → **rejected**, logged with the actual output. Rejections are cheap and are the entire quality mechanism here — do not skip this step to save time.
- A vague or unrunnable command, or one outside § Proof commands → rewrite it until it is a real, one-line, read-only check, or drop the candidate. A fact with no way to re-check it later is not worth keeping.

## Proof commands

A proof is one command from this read-only allowlist: `grep`, `rg`, `git grep`, `ls`, `test`, `sed -n`, `head`. No pipes (`|`), redirects (`>`, `<`), `;`, `&&` or `$(`. A candidate whose proof needs more is re-phrased into a claim one allowed command can check, or dropped.

## Refresh

A rescan (`/arh-init --rescan`) re-checks what changed instead of walking the whole repo.

1. **Baseline** — the last commit of each `verified-facts.md`: `git log -1 --format=%H -- docs/specs/<framework>/verified-facts.md`.
2. **Changed set** — `git diff --name-only <sha>..HEAD` plus the paths in `git status --porcelain`.
3. **Unchanged** — a fact whose cited path and proof paths are all outside the changed set is kept, without replay.
4. **Changed** — replay the fact's stored proof. A legacy fact with no `<!-- proof: … -->` line gets its proof re-derived from its `(see file:line)` citation first.
   - Output confirms → kept.
   - Output contradicts, or the cited file is gone → **stale**. It enters Round 1 as `stale: re-prove or purge`, showing the real output; re-prove means you propose a new citation and proof.
5. **New candidates** — run § The loop only over folders that hold a changed file.

`--full` skips steps 3 to 5 and runs today's whole-repo scan. No git, or a `verified-facts.md` that is untracked (no baseline commit) → a full scan; say so plainly in the summary. Nothing in the file is rewritten without a round: kept facts stay byte-identical, and stale facts change only after the human picks re-prove or purge.

## Where verified facts go

- **A repeatable code convention** (e.g. "this team always wraps HTTP calls in one retry helper") → the matching stack's `docs/specs/<framework>/verified-facts.md` — write only between its `<!-- BEGIN VERIFIED FACTS -->` / `<!-- END VERIFIED FACTS -->` markers, one bullet per fact, each ending in `(see file:line)`, followed on the next line by its proof as `<!-- proof: <command> -->`. File absent (the team deleted it) → create it with the markers. Never touch any other file under `docs/specs/` — those are the team's specs (and `harness fill`'s slots); a fill-written scaffold is never rewritten by a scan or a rescan.
- **A bigger structural or historical decision** (e.g. "why the deploy pipeline works this way") → an ADR, via skill `architecture-decision`'s reverse-engineer branch, in its `## Flagged gaps` section if it is a gap rather than a settled fact.
- **Never** `CLAUDE.md` — that file's brownfield behavior (preserve-and-add, per skill `project-memory`) is untouched by this skill.

**Routing when more than one stack is declared.** `harness.yaml stacks[]` (already loaded in `03-folders.md`) gives each stack a `paths` prefix list. Match a fact's cited file against every declared stack's `paths`:

- Exactly one stack's `paths` prefix-matches the file → route to that stack's `docs/specs/<framework>/verified-facts.md`.
- No declared stack's `paths` matches (shared root config, repo-wide tooling) → treat it as a repo-wide/architectural fact and route to the ADR path instead. Never guess a stack destination for a file that doesn't belong to any declared stack.

## Human approval — capped at 3 rounds

Batch accepted candidates into at most 3 rounds of questions, grouped by destination (stack verified facts, ADR facts, anything that reads as a compliance/legal claim). A compliance-sounding claim (mentions PII, a retention period, a named regulation) needs a real person's name attached, not just "verified by a grep" — put it in its own round rather than bundling it with routine facts.

If there are more candidates than 3 rounds can reasonably batch, the overflow is **deferred to the next scan**, never force-approved and never silently dropped — say so plainly in the hand-off report.

## Anti-patterns

- Reading every file in the repo linearly before writing anything down — defeats the purge discipline and the whole point of this skill.
- Accepting a candidate without actually running its proof command.
- Writing a fact without its `<!-- proof: … -->` line, or with a proof outside the allowlist.
- Dropping or rewriting a stale fact without a round.
- Bundling a compliance-sounding claim into a routine-facts approval round.
- Writing accepted facts into `CLAUDE.md`, into any `docs/specs/` file other than a `verified-facts.md`, or outside its markers.
