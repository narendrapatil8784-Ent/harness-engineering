# Layer: performance (`performance.json`)

TCs that verify a numeric budget from an NFR — latency, throughput, memory,
concurrency.

## Derivation

- Every performance NFR with a numeric budget in the PRD → ≥1 TC here, anchored to
  `<STORY-ID>-NFR-performance`.
- **Every performance TC includes the budget in its body** (e.g.
  `p95 < 250ms at 100 RPS`) — in `expected_results[]` and mirrored in the `then`
  summary. A performance TC without a number is unverifiable.
- `test_data{}` carries the load shape (RPS, duration, payload size), not just inputs.
- Boundary cases: the budget AT the limit, sustained load (soak) when the NFR names a
  duration, spike when it names burst behaviour.

## last_run.budget sub-block (only this layer carries it)

Validation writes a `budget` object into `last_run` for every TC in this file:

```json
"budget": {
  "target":      "p95 < 250ms @ 100 RPS",
  "measured":    "p95 = 312ms @ 100 RPS",
  "budget_pass": false
}
```

`target` is parsed from the TC's `requirement_id`'s NFR string; `budget_pass: null`
when the NFR string is unparseable. A `budget_pass: false` fails the TC even when the
script itself exits 0.

## Runner facts

Picked by validation-execution from `type: performance`: k6 / locust / the project's
declared load runner. Runner install + config must be a task in `tasks.json`
(plan-validation runner-setup dimension checks this file's TCs specifically).

## Placement

`automatable: true` + `type: performance` → `performance.json`.
`automatable: false` → `manual.json`, `type` stays `performance`.
