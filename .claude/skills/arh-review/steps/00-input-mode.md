# Phase 0 — Detect input mode

Goal: figure out what the user gave us, then resolve to a concrete diff range and (when possible) a story id.

## Detection

```
input = $ARGUMENTS

if input matches https?://(github\.com|gitlab\.com|bitbucket\.org)/.+/(pull|merge_requests|pull-requests)/[0-9]+
                                                      → mode = pr-url
elif input matches ^[0-9]+$                           → mode = pr-number  (resolve via vcs-<provider> skill: `gh pr view <num>` / `glab mr view <num>` / `curl ...pullrequests/<num>`)
elif input matches ^(feature|bugfix|hotfix|chore)/.+ → mode = branch
elif input matches ^[A-Z0-9]+-[0-9]+(\..+)?$         → mode = story
elif input is empty                                   → mode = current
else                                                  → mode = story (assume id)
```

PR-URL host patterns:
- GitHub: `https://github.com/<owner>/<repo>/pull/<n>`
- GitLab: `https://gitlab.com/<group>/<repo>/-/merge_requests/<n>`
- Bitbucket: `https://bitbucket.org/<workspace>/<repo>/pull-requests/<n>`

## Resolve

For each mode, populate:

- `target_ref`: the PR id, branch, or HEAD
- `base_ref`: usually `main`, but read from `harness.yaml outputs.claude_code.review_base` if set
- `story_id`: when derivable (from branch name like `feature/CHK-014`, PR body label, or direct id)
- `report_path`: `docs/features/$story_id/REVIEW.md` if story id known, else `docs/REVIEW/REVIEW-<YYYYMMDD-HHMM>.md`

## Per-mode commands

For `pr-url` / `pr-number` modes, load the `vcs-<provider>` skill (per `integrations.vcs`) and use its documented diff / metadata commands. The table below shows the per-provider equivalents — do not hardcode `gh` when `vcs: bitbucket` or `vcs: gitlab`.

| Mode       | github                                                  | gitlab                                                  | bitbucket                                                                               |
|------------|---------------------------------------------------------|---------------------------------------------------------|-----------------------------------------------------------------------------------------|
| pr-url     | `gh pr diff <url>` / `gh pr view <url> --json ...`      | `glab mr diff <url>` / `glab mr view <url>`             | `curl -u $BB_AUTH_STRING ".../pullrequests/<num>/diff"` / `... /pullrequests/<num>`     |
| pr-number  | `gh pr diff <num>`                                      | `glab mr diff <num>`                                    | `curl -u $BB_AUTH_STRING ".../pullrequests/<num>/diff"`                                 |

Git-only modes (no VCS API needed):

| Mode       | Diff command                                            | Metadata                                                |
|------------|---------------------------------------------------------|---------------------------------------------------------|
| branch     | `git diff $base_ref...$target_ref`                      | `git log $base_ref..$target_ref`                        |
| story      | `git diff $base_ref...HEAD` (assume on feature branch)  | read story header                                       |
| current    | `git diff $base_ref...HEAD`                             | none                                                    |

## Precondition (only when a story id resolved)

When `story_id` is known AND `docs/features/<story_id>/state.json` exists, load
skill `phase-preconditions` and apply its `/arh-review <id>` matrix row:
`validation in {"passed", "partial"}`. If the row fails, abort with its failure
message and offer that skill's § Recovery options — do **not** invoke the agent.
A review verdict is what unlocks `/arh-security-review`; recording one on a
feature nothing has validated would open the next gate on missing evidence.

When no story id is resolvable, or the feature has no state record (a bare PR,
branch, or current-diff review), there is no state precondition — the review runs
report-only and writes no state, as before.

## Output

```
Mode: <mode>
Target: <ref>
Base: <ref>
Story id: <id> | unknown
Precondition: validation = <passed|partial> | n/a (no story id / no state record)
Files changed: <N>
Report path: <path>
```
