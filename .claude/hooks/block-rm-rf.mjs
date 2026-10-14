#!/usr/bin/env node
// PreToolUse hook (Bash) — stop a recursive `rm` from reaching anything outside
// the project worktree.
//
// This parses the command rather than pattern-matching it. A single regex over
// the raw string missed `rm -r -f /` (split flags), `rm -Rf /` (uppercase -R is
// valid recursive), `rm -rf "/"` (quotes), `rm -rf -- /` and
// `rm -rf --no-preserve-root /` (the flag was read as the target), and
// `rm -rf ./build /` (only the first operand was ever checked).
//
// Decisions:
//   deny — a target outside the worktree, --no-preserve-root, or a target that
//          cannot be resolved because it carries a runtime expansion. The last
//          case fails CLOSED: `rm -rf "$HOME"` must not get through, and the
//          reason tells the caller to re-run with a literal path.
//   pass — every target resolves inside the worktree
//
// `deny` is the only decision used. `ask` would fit the unresolvable case better,
// but no hook in this harness has ever emitted it, so it is unproven here — and
// an unhonoured decision fails OPEN, which is the wrong way for a guard to fail.
//
// Known limit: a recursive rm with no literal target — `find … | xargs rm -rf`,
// `find … -exec rm -rf {} +` — cannot be checked, because the paths only exist
// at runtime. Those pass. The previous regex never covered them either, so this
// is a documented gap rather than a regression.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

import {
  argvList,
  commandName,
  isBareRedirect,
  REDIRECT_RE,
} from './lib/shell-parse.mjs';

function safe(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}

const input = safe(() => JSON.parse(readFileSync(0, 'utf8')), {});
const command = (input && input.tool_input && input.tool_input.command) || '';
const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());

// Variables whose value is known well enough to resolve.
const HOME_VARS = new Set(['$HOME', '${HOME}', '$USERPROFILE', '${USERPROFILE}', '$HOMEPATH', '${HOMEPATH}']);

/**
 * Classify an `rm` invocation. Returns null when it is not a recursive rm.
 * `-f` is not required: `rm -r /etc` is just as destructive in a non-interactive
 * shell, and a non-recursive `rm` cannot take out a tree.
 */
function parseRm(argv) {
  // Match `rm`, `/bin/rm`, `grm` (coreutils on macOS) — but not `rmdir`.
  const name = commandName(argv[0]);
  if (name !== 'rm' && name !== 'grm') return null;

  let recursive = false;
  let noPreserveRoot = false;
  const operands = [];
  let endOfFlags = false;
  const rest = argv.slice(1);

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    // Redirects and their filenames are not rm targets.
    if (REDIRECT_RE.test(arg)) {
      if (isBareRedirect(arg)) i++; // `> file` — skip the filename too
      continue;
    }
    if (endOfFlags) { operands.push(arg); continue; }
    if (arg === '--') { endOfFlags = true; continue; }
    if (arg.startsWith('--')) {
      if (arg === '--recursive' || arg === '--dir') recursive = true;
      else if (arg === '--no-preserve-root') noPreserveRoot = true;
      continue;
    }
    if (arg.length > 1 && arg.startsWith('-')) {
      // Combined short flags, any order or case: -rf, -fr, -Rf, -fR, -rvf, -R.
      if (/[rRd]/.test(arg.slice(1))) recursive = true;
      continue;
    }
    operands.push(arg);
  }

  return recursive ? { operands, noPreserveRoot } : null;
}

/**
 * Resolve an operand to an absolute path, or report that it cannot be resolved.
 * Globs are left in place: resolving `/` + `*` still lands outside the worktree,
 * which is the only question being asked.
 */
function resolveTarget(operand) {
  if (HOME_VARS.has(operand)) return { path: homedir() };
  if (operand === '~' || operand.startsWith('~/')) {
    return { path: resolve(homedir(), operand.slice(2)) };
  }
  // Anything still carrying an expansion could point anywhere.
  if (/[$`]/.test(operand)) return { unresolvable: true };
  return { path: resolve(projectDir, operand) };
}

function isOutside(path) {
  return path !== projectDir && !path.startsWith(projectDir + '/');
}

function decide() {
  for (const argv of argvList(command)) {
    const rm = parseRm(argv);
    if (!rm) continue;

    if (rm.noPreserveRoot) {
      return {
        decision: 'deny',
        reason: 'Refusing `rm --no-preserve-root` — the flag exists only to defeat '
          + "the filesystem-root guard.",
      };
    }

    // No literal target — the paths arrive on stdin or from a substitution.
    // Documented limit; see the header.
    if (!rm.operands.length) continue;

    for (const operand of rm.operands) {
      const target = resolveTarget(operand);
      if (target.unresolvable) {
        return {
          decision: 'deny',
          reason: `Refusing recursive rm on \`${operand}\` — it expands at runtime, so `
            + 'the guard cannot tell whether it stays inside the project. Re-run with a '
            + 'literal path, or echo the expansion first and delete the resolved path.',
        };
      }
      if (isOutside(target.path)) {
        return {
          decision: 'deny',
          reason: `Refusing recursive rm on \`${operand}\` — resolves to ${target.path}, `
            + 'outside the project worktree.',
        };
      }
    }
  }
  return null;
}

const verdict = safe(decide, null);
if (verdict) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: verdict.decision,
      permissionDecisionReason: verdict.reason,
    },
  }));
}
process.exit(0);
