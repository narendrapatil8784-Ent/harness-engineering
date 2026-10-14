# Layer: security (`security.json`)

TCs that verify authn / authz / PII-handling requirements, anchored to
`<STORY-ID>-NFR-security` (or a security-shaped AC/FR).

## Derivation

- Every security NFR (authn, authz, PII) → ≥1 TC here.
- Standard shapes per concern:
  - **Authn**: unauthenticated request → 401/redirect; expired/invalid token →
    rejected, never a silent downgrade.
  - **Authz**: cross-tenant / cross-user access → 404 or 403 per the project's
    ownership convention (never leak existence); privilege escalation via direct
    object reference.
  - **PII**: sensitive values never in logs, URLs, or error bodies; masked at rest
    where the NFR demands it.
- `category: negative` dominates this layer — the interesting cases are the denied
  ones. Include the positive case (authorized user succeeds) so the deny-tests can't
  pass by the feature being broken.
- `test_data{}` credentials are ALWAYS `<PLACEHOLDER>` values resolved from the
  environment — this file is committed and its values propagate into specs, data
  files, and tracker tickets.

## Runner facts

Picked by validation-execution from `type: security`: API-level specs via the API
automation pack when installed (it reads this file directly); without the pack,
API-level authn/authz assertions authored with the project's integration runner.
Every TC in this file is automatable by layout — a security concern that genuinely
needs a human belongs in `manual.json`. Do not auto-generate exploit-style tests.

## Placement

`automatable: true` + `type: security` → `security.json` (API automation routes these).
`automatable: false` (pentest-style human judgment) → `manual.json`, `type` stays
`security`.
