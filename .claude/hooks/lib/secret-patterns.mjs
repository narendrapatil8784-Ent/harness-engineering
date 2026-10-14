// Shared secret-detection table for the write-time and prompt-time scanners.
// One table so the two hooks can never drift on what counts as a secret.
//
// Entries cover the credential classes named in the secret-management standard:
// cloud provider keys, API keys, personal access tokens, OAuth client secrets,
// private keys, database credentials, and webhook URLs.
//
// Contract: a finding NEVER carries the matched value. Reporting a secret in
// order to diagnose a secret puts it in the transcript, which is the thing we
// are trying to prevent. Findings name the pattern and the line, nothing else.

// Fixed-shape credentials — the prefix alone identifies them, so a match needs
// no further judgement.
export const TOKEN_PATTERNS = [
  { name: 'AWS access key id', re: /\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { name: 'GitHub fine-grained PAT', re: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/ },
  { name: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  {
    name: 'Slack webhook URL',
    re: /https:\/\/hooks\.slack\.com\/services\/T[A-Za-z0-9_]+\/B[A-Za-z0-9_]+\/[A-Za-z0-9_]+/,
  },
  {
    name: 'private key block',
    re: /-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/,
  },
  { name: 'JWT', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/ },
  { name: 'Atlassian API token', re: /\bATATT[A-Za-z0-9._-]{20,}\b/ },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'model provider API key', re: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}\b/ },
  {
    name: 'database URL with inline password',
    re: /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|rediss?|amqps?|mssql|sqlserver):\/\/[^\s:@/]+:[^\s:@/]{4,}@/,
  },
];

// Credential-shaped assignments (`password = "..."`). The key is generic, so the
// value has to earn the finding — see `looksLikeSecret`.
//
// Two value shapes: quoted (any language) and bare (unquoted YAML/env/ini). The
// bare charset deliberately excludes `.`, `(` and `[` so that assigning an
// *expression* to a credential-named variable — `this.password =
// page.getByLabel('Password')` — is not read as a literal.
//
// The credential word is matched inside a whole IDENTIFIER, not `\b`-anchored on
// its own. `_` is a word character, so `\b(password)` cannot match between `DB_`
// and `PASSWORD` — an earlier version of this pattern missed `DB_PASSWORD`,
// `SECRET_KEY`, `AWS_SECRET_ACCESS_KEY` and every other prefixed name, which is
// the dominant convention in .env files, Dockerfiles and compose files.
const ASSIGNMENT_RE =
  /(?<![A-Za-z0-9])([A-Za-z0-9_.-]*(?:password|passwd|pwd|secret|api[_-]?key|apikey|access[_-]?token|auth[_-]?token|bearer[_-]?token|client[_-]?secret|private[_-]?key|signing[_-]?key|encryption[_-]?key|connection[_-]?string|conn[_-]?str|nuget[_-]?pat|ado[_-]?pat|pat[_-]?token)[A-Za-z0-9_]*)["']?\s*[:=]\s*(?:(["'`])([^"'`\n]{6,})\2|([A-Za-z0-9_\-+=/!@#$%^&*~]{8,}))/gi;

// A value that points at a secret rather than being one. This is the pattern the
// standard asks for, so it must never be flagged.
const REFERENCE_RE =
  /\$\{|\$[A-Za-z_]|%[A-Za-z_]+%|process\.env|import\.meta\.env|os\.environ|os\.getenv|getenv|System\.getenv|Environment\.GetEnvironmentVariable|ConfigurationManager|secretsmanager|SecretString|GetSecretValue|arn:aws:secretsmanager|ssm:|parameterstore|vault:|keyvault|<[A-Za-z0-9_. -]+>/i;

// Self-describing dummies. Test fixtures and docs are full of these; blocking
// them would make the hook noise and get it switched off.
const PLACEHOLDER_RE =
  /example|sample|dummy|placeholder|change[-_]?me|redacted|test|fake|foo|bar|baz|xxx+|\*{3,}|your[-_]|my[-_]|todo|tbd|not[-_]?real|localhost|s3cret|hunter2|123456|abcdef/i;

// Inline waiver, same marker the security-review-checklist skill already uses.
const SECURITY_OK_RE = /SECURITY-OK:/;

/** True when `value` looks like real key material rather than a reference or a dummy. */
export function looksLikeSecret(value) {
  const v = String(value == null ? '' : value).trim();
  if (v.length < 12) return false; // too short to be key material
  if (REFERENCE_RE.test(v)) return false; // a reference, not a value
  if (PLACEHOLDER_RE.test(v)) return false; // documented dummy
  const classes =
    (/[a-z]/.test(v) ? 1 : 0) +
    (/[A-Z]/.test(v) ? 1 : 0) +
    (/[0-9]/.test(v) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(v) ? 1 : 0);
  return classes >= 3 || v.length >= 24;
}

/**
 * Scan `text` line by line. Returns a deduped list of `"<pattern> (line N)"`
 * strings — never the matched values. Empty list means nothing found.
 */
export function findSecrets(text) {
  if (!text) return [];
  const hits = new Set();
  const lines = String(text).split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Waiver on the line itself, or on the line above — the latter is the only
    // option inside a JSON or YAML block, where a trailing comment is invalid.
    if (SECURITY_OK_RE.test(line)) continue;
    if (i > 0 && SECURITY_OK_RE.test(lines[i - 1])) continue;
    for (const p of TOKEN_PATTERNS) {
      if (p.re.test(line)) hits.add(`${p.name} (line ${i + 1})`);
    }
    ASSIGNMENT_RE.lastIndex = 0;
    let m;
    while ((m = ASSIGNMENT_RE.exec(line)) !== null) {
      const value = m[3] !== undefined ? m[3] : m[4];
      if (looksLikeSecret(value)) {
        hits.add(`hardcoded ${m[1].toLowerCase()} (line ${i + 1})`);
      }
    }
  }
  return [...hits];
}
