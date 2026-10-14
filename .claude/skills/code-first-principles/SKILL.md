---
name: code-first-principles
description: Discipline for sizing any implementation — check for existing solutions before writing new code, and write the least code that satisfies the requirement.
when_to_use: When breaking a plan into tasks, sizing an implementation, choosing a library or dependency, adding a new layer of code, or judging whether a diff is bigger than the task needed.
user-invocable: false
---
# Code-First Principles

**Iron rule: the best code is the code never written.** Every line added must be
reviewed, tested, secured, and maintained forever. Writing less is about avoiding
unnecessary work, never about cutting corners — understand the problem fully first.

The invariants live in `reusability-baseline`, which is always loaded on every file:
the seven-step evaluation order before writing code, the no-new-package invariant,
the complexity budget, the never-cut list, and the documented-limit escape hatch.
This skill does not restate them. It is how they are applied at two moments — when
the plan is written, and when the diff is judged.

## At planning time

The evaluation order applies to the plan before it applies to the code:

- If step 1 answers "no," drop the task from the plan.
- A task covered by steps 2–5 is written as "reuse X", not "build X".
- A plan that adds a new package must say why no installed package covers it.
- Every planned file, layer, dependency, abstraction, and configuration option
  must identify the current requirement that justifies it.

## At review time

After implementation, before the task is called complete, check the diff:

- Was anything added that no requirement asked for?
- Was anything duplicated that already existed?
- Was any abstraction, dependency, or configuration option introduced without a
  current requirement?
- Could any of the changed code be deleted without losing required behavior?
- Is the size of the diff proportional to the size of the requirement?

Any yes → simplify before the task is complete.

## Recording a deliberate simplification

A simplification chosen on purpose, with a named upgrade path, is a **decision**:
a competent reviewer could have picked the bigger version from the same prompt.
It belongs in the feature's decision log, not in the carry-forward array.

`pending_carry_forward[]` is reserved for deferred work, accepted risk, and
scope-creep findings — an entry there makes commit-PR refuse to merge without
`--accept-pending <ids>`. Filing a routine simplification note there blocks a
merge over something that was never deferred. And it is not writable from every
role: the agents permitted to write it are listed in `docs/state/SCHEMA.md`.

Route by role:

| Role | Where the note goes |
|---|---|
| Planning the work (`impl-planning-agent`) | A `decide` entry in `docs/features/<id>/DECISIONS.md`, alongside the plan's other decisions |
| Writing the diff (`implementation-agent`) | A `decide` entry appended to the same `docs/features/<id>/DECISIONS.md` — the log is the one artifact this role writes for choices. Never `state.json`, `features.json`, or `tasks.json`: the orchestrator is their single writer |
| Judging the diff (`code-review-agent`) | A finding in `REVIEW.md`. In gate mode, RETURN it to the orchestrator with the verdict and let the orchestrator do any state write |

Trivial choices — a variable name, an internal helper boundary — get no entry at
all, per `decide`.

## BAD (a plan that builds past the requirement)

Task: date-of-birth field on the signup form.

```
- Install flatpickr
- Create DatePickerWrapper component + stylesheet
- Add timezone-handling utility module
```

## GOOD

```
- Reuse the platform date input — no new dependency, no wrapper, no stylesheet
  (limit: no date-range selection; switch to flatpickr if ranges are ever required
   — recorded in docs/features/<id>/DECISIONS.md)
```

Three planned files and a dependency collapse to one reused primitive, and the
limit is carried into the plan instead of discovered later.

## BAD (short but worse)

```javascript
const result = condition ? foo(bar(x)) : baz(qux(y));
```

## GOOD

```javascript
let result;
if (condition) {
  result = foo(bar(x));
} else {
  result = baz(qux(y));
}
```
