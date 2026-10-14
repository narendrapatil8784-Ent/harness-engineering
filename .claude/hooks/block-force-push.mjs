#!/usr/bin/env node
// PreToolUse hook (Bash) — block destructive git operations.
//
// Covers force-push in every spelling, plus `git reset --hard` and
// `git branch -D`, which discard work the branch cannot give back.
//
// This parses the command rather than pattern-matching it. A regex anchored on
// `git\s+push` missed:
//   git -c core.hooksPath=/dev/null push -f    global options before the subcommand
//   git push origin main -f                    flag after the operands
//   git push -qf origin main                   `f` inside a combined short flag
//   git push origin +main                      a `+` refspec IS a force push
//
// Policy:
//   --force / -f            denied on every branch
//   +<refspec>              denied — same effect, different spelling
//   --force-with-lease      denied when the destination is a protected branch;
//                           allowed elsewhere, since it is the safe form
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { argvList, commandName, isBareRedirect, REDIRECT_RE } from './lib/shell-parse.mjs';

function safe(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}

const input = safe(() => JSON.parse(readFileSync(0, 'utf8')), {});
const command = (input && input.tool_input && input.tool_input.command) || '';
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

const PROTECTED = new Set(['main', 'master']);

// git's own options, which sit before the subcommand. These take a separate value.
const GIT_OPTS_WITH_VALUE = new Set([
  '-c', '-C', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--super-prefix',
]);

/** Find the git subcommand and its arguments, skipping git's global options. */
function gitSubcommand(argv) {
  if (commandName(argv[0]) !== 'git') return null;
  let i = 1;
  while (i < argv.length) {
    const arg = argv[i];
    if (!arg.startsWith('-')) break;
    if (GIT_OPTS_WITH_VALUE.has(arg)) i += 2; // `-c foo=bar`
    else i += 1; // `--git-dir=x`, `-p`, …
  }
  if (i >= argv.length) return null;
  return { name: argv[i], args: argv.slice(i + 1) };
}

/**
 * Destination branch of a refspec. `+HEAD:refs/heads/main` -> `main`,
 * `main` -> `main`. Returns '' for a delete refspec (`:branch` has no source).
 */
function refspecDest(token) {
  let spec = token.startsWith('+') ? token.slice(1) : token;
  if (spec.includes(':')) spec = spec.slice(spec.lastIndexOf(':') + 1);
  return spec.replace(/^refs\/heads\//, '');
}

/**
 * The branch that would be pushed when no refspec is given.
 *
 * `symbolic-ref` rather than `rev-parse --abbrev-ref HEAD`: it reports the
 * branch even before the first commit, where rev-parse fails on the unborn ref.
 * Returns '' on a detached HEAD, which cannot be pushed by name anyway.
 */
function currentBranch() {
  return safe(
    () => execFileSync('git', ['symbolic-ref', '--short', 'HEAD'], {
      cwd: projectDir, encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'],
    }).trim(),
    '',
  );
}

function parsePush(args) {
  let force = false;
  let withLease = false;
  const operands = [];
  let endOfFlags = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (REDIRECT_RE.test(arg)) {
      if (isBareRedirect(arg)) i++;
      continue;
    }
    if (endOfFlags) { operands.push(arg); continue; }
    if (arg === '--') { endOfFlags = true; continue; }
    if (arg.startsWith('--')) {
      const name = arg.split('=')[0];
      if (name === '--force') force = true;
      else if (name === '--force-with-lease') withLease = true;
      continue;
    }
    if (arg.length > 1 && arg.startsWith('-')) {
      // Combined short flags in any order: -f, -fq, -qf, -uf.
      if (arg.slice(1).includes('f')) force = true;
      continue;
    }
    operands.push(arg);
  }
  return { force, withLease, operands };
}

/**
 * Destructive git subcommands other than push. Each discards work that is not
 * recoverable from the branch itself.
 */
function destructiveOther(sub) {
  const args = sub.args;
  const has = (...flags) => args.some((a) => flags.includes(a));

  if (sub.name === 'reset' && has('--hard')) {
    return 'Blocked: `git reset --hard` discards every uncommitted change in the '
      + 'worktree with no way back. Use `git stash` to set the changes aside, or '
      + '`git restore <path>` to revert only what you meant to.';
  }
  // `-D` is the force form of `--delete`; `--delete --force` is the long spelling.
  if (sub.name === 'branch' && (has('-D') || (has('--delete', '-d') && has('--force', '-f')))) {
    return 'Blocked: `git branch -D` force-deletes a branch even when its commits '
      + 'are unmerged. Use `git branch -d`, which refuses unless the work is merged.';
  }
  return null;
}

function decide() {
  for (const argv of argvList(command)) {
    const sub = gitSubcommand(argv);
    if (!sub) continue;

    if (sub.name !== 'push') {
      const other = destructiveOther(sub);
      if (other) return other;
      continue;
    }

    const { force, withLease, operands } = parsePush(sub.args);

    if (force) {
      return 'Force push blocked: `--force`/`-f` rewrites published history on any '
        + 'branch. Use `--force-with-lease` on a feature branch, or land the change '
        + 'as a new commit.';
    }

    // A `+` refspec is a force push spelled differently.
    const forced = operands.filter((o) => o.startsWith('+'));
    if (forced.length) {
      return `Force push blocked: refspec \`${forced[0]}\` — a leading \`+\` forces the `
        + 'update, exactly as `--force` would.';
    }

    if (withLease) {
      // The first operand is the remote; the rest are refspecs. With no refspec,
      // git pushes the current branch.
      const refspecs = operands.slice(1);
      const targets = refspecs.length
        ? refspecs.map(refspecDest)
        : [currentBranch()];
      const hit = targets.find((t) => PROTECTED.has(t));
      if (hit) {
        return `Force push blocked: \`--force-with-lease\` targets \`${hit}\`. The lease `
          + 'makes it safer, not safe — protected branches never take a forced update.';
      }
    }
  }
  return null;
}

const reason = safe(decide, null);
if (reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
}
process.exit(0);
