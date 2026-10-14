# Layer: contract (`contract.json`)

TCs that pin an API's shape — request/response schema, status codes, breaking-change
policy — anchored to `<STORY-ID>-NFR-contract`-shaped requirements or API-shape FRs.

## Derivation

- Every contract NFR (API shape / breaking-change policy) → ≥1 TC here.
- Standard shapes:
  - **Response schema**: required fields present with declared types; additive-only
    fields tolerated by consumers.
  - **Status codes**: each documented code reachable and correct (200/201/4xx per
    spec) — including error-body shape.
  - **Breaking-change policy**: removed/renamed field or tightened validation →
    caught (against the published OpenAPI/pact baseline).
  - **Versioning**: old version keeps its contract while the new one ships.
- `expected_results[]` assert shape ("response validates against schema X",
  "field `total` is a number"), not business values — business values belong to
  integration/e2e TCs.

## Runner facts

Picked by validation-execution from `type: contract`: schema/contract runners —
openapi validation, pact, dredd, or API-spec assertions via the API automation pack
(which reads this file directly and routes each TC to a generated spec). Runner
install + config must be a task in `tasks.json` (plan-validation runner-setup
dimension checks this file's TCs specifically).

## Placement

`automatable: true` + `type: contract` → `contract.json`.
`automatable: false` → `manual.json`, `type` stays `contract`.
