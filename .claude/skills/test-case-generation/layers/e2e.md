# Layer: e2e (`e2e.json`)

TCs that exercise the full user-visible flow through the real UI (or CLI/API surface
the user actually touches). This is the layer where AC → TC fan-out happens: one AC
typically produces several TCs here.

## Derivation

- Per AC: one happy-path (`category: positive`), plus the negative paths
  (`category: negative`) and boundary inputs (`category: boundary`) a user can
  actually reach at this layer.
- `steps[]` are user actions (open page, type, click, submit); `expected_results[]`
  are user-observable checks (visible text, navigation, state shown). Selector and
  page-object detail belongs to the generated spec, not the TC.
- `test_data{}` values are substituted verbatim into generated specs — record padded
  or blank boundary inputs byte-exactly.

## Automatable accessibility / viewport concerns (do NOT mark these manual)

| Test concern | Tooling |
|---|---|
| Viewport reflow at 320 px | Playwright `page.setViewportSize({width: 320, height: 568})` + element bounding box assertion |
| Touch target size ≥ 44×44 dp | Playwright + `element.boundingBox()` assertion |
| `aria-*` attribute presence | Playwright + `getAttribute()` or axe-core scan |
| `role="dialog" / "alertdialog"` | Playwright + `getAttribute()` |
| Focus ring visibility | Playwright `page.evaluate` reading `outline` style on `:focus-visible` |
| Focus trap Tab cycle | Playwright `keyboard.press("Tab")` × N + active-element assertion |
| `prefers-reduced-motion` honoured | Playwright emulate media + assert no transition |
| Color contrast ratio | axe-core inside Playwright |

What genuinely needs a human (subjective layout quality, screen-reader
intelligibility) is a manual TC — see `layers/manual.md`.

## Runner facts

Picked by validation-execution from `type: e2e`: playwright (web), maestro (mobile),
or the project's declared e2e runner. `/arh-generate-ui-tests` generates specs from
this file only; each ran TC gets `flow_path` + `last_run` patched back into
`e2e.json`.

## Placement

`automatable: true` + `type: e2e` → `e2e.json`.
`automatable: false` → `manual.json`, `type` stays `e2e`.
