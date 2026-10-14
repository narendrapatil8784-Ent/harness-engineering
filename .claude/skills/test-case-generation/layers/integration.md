# Layer: integration (`integration.json`)

TCs that exercise a boundary between two real components — service ↔ database,
service ↔ service, app ↔ third-party API — below the full user-visible flow.

## Derivation

- One TC per boundary the story's ACs cross, plus the negative path for each
  (downstream unavailable, timeout, malformed response).
- **Tests reference real API responses where possible. No mocks at the integration
  boundary** — a mocked boundary test is a unit test wearing the wrong `type` and
  belongs in `tasks.json`, not here.
- `preconditions` must name the real dependency state (seeded rows, running service,
  sandbox tenant), not "mock X".
- Boundary/negative cases: connection refusal, 5xx retry behaviour, partial writes,
  idempotency on replay.

## Runner facts

Picked by validation-execution from `type: integration`: the project's integration
runner from `docs/config/project-commands.yaml` (`test_integration:`, fallback
`test:`) — typically pytest / vitest+supertest / go test with real services from
docker-compose or a sandbox environment.

## Placement

`automatable: true` + `type: integration` → `integration.json`.
`automatable: false` (needs a human, e.g. "verify against the production sandbox by
hand") → `manual.json`, `type` stays `integration`.
