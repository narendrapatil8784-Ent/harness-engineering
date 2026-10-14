# Governance deny set

Nothing is listed as blocked unless something in `.claude/` actually blocks it.

| Blocked | Enforced by |
|---|---|
| Any recursive `rm` resolving outside the worktree | `hooks/block-rm-rf.mjs` |
| `git push --force` (any branch, any spelling incl. `+refspec`); `--force-with-lease` to a protected branch; `git reset --hard`; `git branch -D` | `hooks/block-force-push.mjs` |
| Writes that put a literal credential in a file | `hooks/pre-write-secret-scan.mjs` |
| Shell commands carrying a literal credential | `hooks/pre-bash-secret-scan.mjs` |
| Reads of credential and key material | `permissions.deny` |

Read denies, all recursive so a nested `.env.production` is covered:

| Class | Patterns |
|---|---|
| env files | `.env*`, `**/.env*`, `**/env.php*` |
| key material | `**/*.pem`, `**/*.key`, `**/id_rsa*` |
| secret stores | `secrets/**`, `**/secrets/**`, `credentials/**`, `**/credentials/**` |
| cloud + ssh | `~/.aws/**`, `**/.aws/**`, `~/.ssh/**`, `**/.ssh/**` |

## Limits — do not mistake these for coverage

- **Read denies cover the `Read` tool, not `Bash`.** `cat .env` is not filtered.
  Writes are covered on both paths; reads are not. Accidents, not intent.
- **A recursive `rm` with no literal target** (`find … | xargs rm -rf`) cannot be
  checked — the paths exist only at runtime.
- **Detection is shape-based.** A short or low-entropy value, or one reachable
  only through a variable, is not flagged. No finding is not proof.
- **`governance.secret_scan: false`** removes both secret scanners and nothing
  replaces them.

## Working with a real secret

Reference it by name — an env var, or a secret-manager key/ARN resolved at
runtime. The name is safe to write down; the value never is. A detection reports
the pattern and line only, never the matched value.

False positive → add `SECURITY-OK: <reason>` as a comment on that line. Need a
blocked action → ask the user explicitly and record the reason in an ADR first.

## Protected branches — set these to match your model

`hooks/block-force-push.mjs` ships with `main` and `master`. If your release
model uses other long-lived branches, add them:

```js
// .claude/hooks/block-force-push.mjs
const PROTECTED = new Set(['main', 'master']);   // <- add yours, e.g. 'stable'
```

A branch that is not in that set takes a `--force-with-lease` without objection,
so anything you deploy from belongs in it. The hook is emitted into your project
and is yours to edit; `harness generate` will not overwrite your change unless
the template itself changes.

Mechanism detail (what each parser handles, and why) lives in the hooks
themselves and in the playbook's Hooks page.
