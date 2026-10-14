#!/usr/bin/env node
// UserPromptSubmit hook — scan the prompt for likely secrets/tokens.
//
// Warn-only by default. `--block` is appended to the command when
// `governance.pii_scan_warn_only` is false in harness.yaml, which rejects the
// prompt instead of warning so the value is never processed.
import { readFileSync } from 'node:fs';

import { findSecrets } from './lib/secret-patterns.mjs';

function safe(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}

const input = safe(() => JSON.parse(readFileSync(0, 'utf8')), {});
const prompt = (input && input.prompt) || '';
const block = process.argv.slice(2).includes('--block');

const hits = findSecrets(prompt);
if (hits.length) {
  const detail = `Possible secret(s) in prompt: ${hits.join(', ')}.`;
  process.stdout.write(JSON.stringify(
    block
      ? {
          decision: 'block',
          reason:
            `${detail} Prompt rejected — pass the secret by name (env var or ` +
            'secret-manager key), never its value. Rotate it if it was real.',
        }
      : { systemMessage: `⚠ ${detail} Consider rotating.` },
  ));
}
process.exit(0);
