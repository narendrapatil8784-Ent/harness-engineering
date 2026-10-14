#!/usr/bin/env node
// PreToolUse hook (Edit|Write|MultiEdit) — deny any write that would put a
// literal credential into a file. Wired only when `governance.secret_scan` is
// true in harness.yaml.
//
// PreToolUse rather than PostToolUse on purpose: once the secret is on disk it
// is a rotation-and-history problem, not a rejected tool call.
import { readFileSync } from 'node:fs';

import { findSecrets } from './lib/secret-patterns.mjs';

function safe(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}

const input = safe(() => JSON.parse(readFileSync(0, 'utf8')), {});
const toolInput = (input && input.tool_input) || {};

// Write → whole body. Edit → the replacement text. MultiEdit → every
// replacement. Pre-existing content is not scanned: a secret already in the
// file is a separate finding, and re-flagging it would block every later edit
// to that file.
const chunks = [];
if (typeof toolInput.content === 'string') chunks.push(toolInput.content);
if (typeof toolInput.new_string === 'string') chunks.push(toolInput.new_string);
// NotebookEdit carries the cell body under its own key, not `new_string`.
if (typeof toolInput.new_source === 'string') chunks.push(toolInput.new_source);
for (const edit of Array.isArray(toolInput.edits) ? toolInput.edits : []) {
  if (edit && typeof edit.new_string === 'string') chunks.push(edit.new_string);
  if (edit && typeof edit.new_source === 'string') chunks.push(edit.new_source);
}

const hits = findSecrets(chunks.join('\n'));
if (hits.length) {
  const file = toolInput.file_path || 'the target file';
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        `Literal credential in the write to ${file} — ${hits.join(', ')}. ` +
        'Reference the secret by name (env var, or a secret-manager key/ARN resolved at ' +
        'runtime) instead of embedding the value. If this is a false positive, add a ' +
        '"SECURITY-OK: <reason>" comment on that line.',
    },
  }));
}
process.exit(0);
