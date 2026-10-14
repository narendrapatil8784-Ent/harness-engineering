#!/usr/bin/env node
// PreToolUse hook (Bash) — deny a Bash command carrying a literal credential.
//
// Closes the write-side twin of the read-deny gap. `pre-write-secret-scan.mjs`
// guards the write tools, so a secret could still reach disk through the shell:
//
//   echo 'AWS_KEY="AKIA…"' > creds.py
//   cat > cfg.json <<EOF … EOF
//   printf '%s' "$(echo AKIA…)" | tee creds.txt
//
// The whole command string is scanned rather than just redirect targets,
// because a credential on a command line is already exposed even when nothing
// is written: it lands in shell history and is visible in the process list to
// every other user on the machine. `export TOKEN=ghp_…` and
// `curl -H "Authorization: Bearer …"` are the same problem.
//
// Shares its pattern table with the write-time and prompt-time scanners, so all
// three agree on what a secret is. Gated by `governance.secret_scan`.
import { readFileSync } from 'node:fs';

import { findSecrets } from './lib/secret-patterns.mjs';

function safe(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}

const input = safe(() => JSON.parse(readFileSync(0, 'utf8')), {});
const command = (input && input.tool_input && input.tool_input.command) || '';

const hits = safe(() => findSecrets(command), []);
if (hits.length) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        `Literal credential in a shell command — ${hits.join(', ')}. A value on the `
        + 'command line is exposed in shell history and in the process list even if '
        + 'nothing is written. Reference it by name instead: read it from an env var, '
        + 'or fetch it from the secret manager at runtime. If this is a false '
        + 'positive, add a "SECURITY-OK: <reason>" comment on the line.',
    },
  }));
}
process.exit(0);
