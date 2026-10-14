# Reusability baseline

Do not rebuild what already exists, and do not build more than the current requirement asks for.

## Before writing code

Evaluate in order and take the earliest **suitable** answer. Suitable means it fits the requirement without adding more complexity or risk than writing it would — do not stop at something that only looks like a match.

1. **Is it actually needed?** Nothing required by the requirement, correctness, security, reliability, accessibility, or a recorded architecture decision asks for it → do not build it.
2. **Does this codebase already have it?** Search for an existing helper or pattern, and reuse the one that actually fits the requirement.
3. **Does the language's built-in library have it?** → use that.
4. **Does the platform already do it?** (browser feature, database constraint, operating system feature) → use that.
5. **Does an already installed package do it?** Never install a new package for something the built-in library or an already installed package covers.
6. **Can it be done more simply?** Prefer the simplest version that stays readable, testable, and correct.
7. Only then write the **smallest sufficient code**.

- Every new abstraction, file, dependency, interface, configuration option, or layer must be justified by a **current** requirement — not "later", "might", or "in case".
- Fewer lines is not the goal; smallest sufficient implementation is. A dense one-liner that is harder to read or test loses to the plain version.

## Structure

- Single responsibility per module / function. If a name needs "and", split.
- DRY across modules of the same concern; do not couple unrelated modules to share code.
- Public APIs are intentional. Implementation details stay private (underscore prefix, package-private, etc.).
- Three similar lines is better than a premature abstraction. Extract on the third repetition, not the first.
- Avoid feature flags or config switches that fork the call graph; refactor to a shared seam instead.

## Never cut

- Checks on data coming from outside the system, error handling that prevents data loss, security, accessibility, and anything explicitly requested.
- Reliability and performance baselines — pagination on every list endpoint, no N+1 or unbounded fan-out, bounded retries with exponential backoff and jitter, explicit I/O timeouts.
- **What an always-on rule mandates IS a current requirement.** It never needs a story to name it, and it is never a "configuration option" awaiting justification.

## Before calling a task complete

- Anything in the diff no requirement asked for gets deleted; the diff must be proportional to the requirement. Deleting is scoped to the code this task changed — per `surgical-changes`, pre-existing dead code stays unless the task asks for it.
- Chose a simple version on purpose? Leave a comment saying the limit and what to switch to when the limit is hit, AND record the choice in the feature's decision log `docs/features/<id>/DECISIONS.md` (via the `decide` skill) — never a silent shortcut. A documented simplification with a named upgrade path is a decision, not a carry-forward: `pending_carry_forward[]` is reserved for deferred work, accepted risk, and scope-creep findings, and only the agents permitted to write state may write it. An agent that cannot write state returns the note to its orchestrator.

## BAD

```jsx
{/* Task: date field. Installed flatpickr + wrapper component + stylesheet */}
<DatePickerWrapper theme="custom" tzAware />
```

## GOOD

```html
<!-- limit: native picker, no date ranges; if ranges needed, switch to flatpickr -->
<label for="dob">Date of birth <span aria-hidden="true">*</span></label>
<input type="date" id="dob" name="dob" required aria-required="true">
```

The platform primitive replaces the dependency; the limit and its upgrade path are named in place. Nothing on the never-cut list is traded away — the label, the `aria-required` marker, and the visual indicator stay, because `accessibility-baseline` mandates them and "minimal" never reaches an always-on rule.
