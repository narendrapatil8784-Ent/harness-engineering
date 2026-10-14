# Layer: manual (`manual.json`)

Every TC with `automatable: false`, regardless of `type` — each TC keeps its `type`
field. Executed by a human at `/arh-validate-feature` § Manual follow-up; every
un-executed manual TC becomes a `pending_carry_forward` entry (`kind: test_case`) per
validation run.

## Manual flag heuristics

Mark `automatable: true` UNLESS the test requires human judgment that no automation can substitute:

| Test concern | automatable | Tooling |
|---|---|---|
| Viewport reflow at 320 px | **true** | Playwright `page.setViewportSize({width: 320, height: 568})` + element bounding box assertion |
| Touch target size ≥ 44×44 dp | **true** | Playwright + `element.boundingBox()` assertion |
| `aria-*` attribute presence | **true** | Playwright + `getAttribute()` or axe-core scan |
| `role="dialog" / "alertdialog"` | **true** | Playwright + `getAttribute()` |
| Focus ring visibility | **true** | Playwright `page.evaluate` reading `outline` style on `:focus-visible` |
| Focus trap Tab cycle | **true** | Playwright `keyboard.press("Tab")` × N + active-element assertion |
| `prefers-reduced-motion` honoured | **true** | Playwright emulate media + assert no transition |
| Color contrast ratio | **true** | axe-core inside Playwright |
| Visual regression review (subjective layout/typography quality) | **false** | Human |
| Screen-reader narration walkthrough (intelligibility) | **false** | Human + NVDA/VoiceOver |
| Manual accessibility audit (cognitive load, error recovery flow) | **false** | Human (a11y specialist) |
| "Test this with a real Jira ticket" / "manual integration with prod tracker" | **false** | Human |

When in doubt, default to `automatable: true` and write the Playwright spec. The cost
of an extra automated test is one CI minute; the cost of a manual TC is a deferred
carry-forward entry per validation run.

## Body discipline

A manual TC needs the executable body (`objective`, `preconditions`, `test_data`,
`steps`, `expected_results`) *more* than an automated one — no spec exists to read the
intent from. `objective` must state WHY it needs a human (the judgment call automation
cannot make: visual quality, narration intelligibility, cognitive load).

## Run-state rules

- Manual TCs keep `last_run: null` — validation never patches them.
- A manual TC that becomes automatable later moves to its `type`'s layer file (an
  add+remove: apply the index-update contract, `files` map included).
