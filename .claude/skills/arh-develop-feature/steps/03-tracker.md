# Step 3 — Tracker (second call site of /arh-implement Step 6)

Read `.claude/skills/arh-implement/steps/06-tracker-completion.md` in full —
the whole file, never a preview or partial read; a skipped tail means a missed
edge case — and follow it verbatim. That step OWNS the `provider: none` skip, the
`issue-tracking-agent` invocation, the `tracker_review_comment` state write, the
best-effort parent-story transition mechanics (including
its explicit refusal to transition to `done`), and every edge case. This step is a
**second call site, never a second definition** — do not restate or paraphrase any
of it here.

**Audited against this command** — inherited unchanged, deliberately not repeated below:

- The no-`done` rule is already exactly right for a drafted, ungated PR: nothing is merged.
- The transition being best-effort and never fatal, and its `provider: none` / no-tracker-key skips, apply verbatim.
- Its rule that status fields (`impl`, `validation`, `review`, `phase`) are not overwritten here also holds — in this command `validation` and `review` were never written at all, a reason to leave them alone, not an exception.

## Deltas for this command (these override the referenced step)

### 1. The target stage is `in-progress`, not `in-review`

- The referenced step transitions the parent story to the agnostic `in-review` stage, because by then its Validate ∥ Review gate has run and the PR it opened is genuinely up for review.
- Here nothing has been reviewed: the PR this step reports is a draft, and the comment below says in as many words *not ready for review*. A tracker board reading `in-review` against that comment contradicts it.
- Pass the agnostic **`in-progress`** stage instead — the development-stage literal from the same enum the `issue-tracking-agent` accepts (`validated`, `in-progress`, `in-review`, `done`); never a provider status name.
- This matters for the same reason delta 2 gives: non-Claude readers act on tracker state, and a board column is the fastest-read surface of all. `in-review` there pulls a reviewer onto a PR they can neither review nor merge.
- Moving the story to `in-review` is `/arh-review`'s own act, once a review has actually happened. Do not pre-empt it here.

### 2. The comment must not claim completion

- The referenced § Procedure passes a validation summary and a code-review verdict, and its body template is titled **Implementation complete** with `Validation:` / `Code review:` lines — none of that exists in this command.
- A comment that implies they do is worse than no comment — non-Claude readers act on tracker state.
- Pass only the parent Story key, the PR url, the branch, and the file/line counts, and use this body instead:

  ```
  **Implementation committed — gates pending**

  - PR: <url>  (DRAFT — not ready for review, do not merge)
  - Branch: feature/$ARGUMENTS
  - Evidence packet: READY (typecheck / unit / lint / runtime / compile / design)
  - Validation: not run
  - Code review: not run
  - Files: <count> changed (+<add> / -<del>)

  Opened by /arh-develop-feature, which codes and commits but runs no gate.
  Next: /arh-validate-feature, /arh-review, then a human marks the PR ready and merges.
  ```

- `Evidence packet: READY` is the one outcome claim this step may make — `evidence-pass` actually produced it in Step 1, and its logs are linked from the PR.
- Never write `Validation: n/a` and never omit the two `not run` lines — an absent line reads as an oversight, an explicit `not run` reads as a state.
