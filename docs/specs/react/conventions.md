# react conventions

<!-- Harness scaffold: STRUCTURE only. Team-owned; `harness generate` never rewrites it. -->
<!-- Fill every CORE section below. Under OPTIONAL, keep only the sections that apply to -->
<!-- this stack and DELETE the heading+slot of the rest BEFORE filling. -->
<!-- Deletion is safe: OPTIONAL slots use the word OPTIONAL (not TODO) so the lint does not -->
<!-- nag for them; CORE TODO slots are nagged until filled — that is intentional. -->
<!-- A section that outgrows this file can move to its own file under docs/specs/ — add -->
<!-- a docs/specs/specs.json entry for it. -->

## Idioms

<!-- TODO: naming, file layout, composition rules, component/type vocabulary -->

## Error handling

<!-- TODO: error types, propagation/wrapping, user-facing vs internal, no-swallow rule -->

## Anti-patterns

<!-- TODO: things this codebase deliberately avoids; cite the rule each violates -->

## Examples

<!-- TODO: BAD vs GOOD pairs ≤ 8 lines each -->

## References

<!-- TODO: links to internal docs, ADRs, or canonical files -->

<!-- ============================================================================ -->
<!-- OPTIONAL sections — keep only what applies to react; DELETE the rest         -->
<!-- (heading + slot). OPTIONAL markers are NOT lint-nagged; once you keep one,    -->
<!-- change its OPTIONAL marker to a real convention. Do not leave empty OPTIONALs.-->
<!-- ============================================================================ -->

## Design system + visual conventions

<!-- OPTIONAL — UI stacks only (react, nextjs, react-native, vue, angular, expo). -->
<!-- DELETE this heading+slot for backend / IaC / data stacks. -->
<!-- Declare the CSS framework, design tokens, spacing scale, form conventions: -->
<!--                                                                                  -->
<!--   - Tailwind v3, design tokens at src/styles/tokens.css                          -->
<!--   - Material UI v5, theme at src/theme.ts, spacing scale 4/8/16/24               -->
<!--   - Custom CSS modules, BEM naming, breakpoints 640/768/1024                     -->
<!--   - Forms: 16px gap, label-above-input, 44px button height, 8px border-radius    -->
<!--   - Imports: components MUST come from @/components, not @mui/material direct    -->
<!-- OPTIONAL: design system, tokens, spacing, form layout conventions -->

## State management

<!-- OPTIONAL — UI stacks. Store choice, server/client state split, data-flow direction. -->

## API / interface contracts

<!-- OPTIONAL — backend/API stacks. Endpoint shape, versioning, DTO/serialization, error envelope. -->

## Security (stack-specific)

<!-- OPTIONAL — framework auth/validation idioms refining .claude/rules/security-baseline.md. -->

## Data access & migrations

<!-- OPTIONAL — data/persistence stacks. ORM/query idioms, txn boundaries, migration tool + naming. -->

## Logging, config & observability

<!-- OPTIONAL — log levels/shape, config source-of-truth, env-var naming, secret access pattern. -->

## Dependency, build & CI

<!-- OPTIONAL — package manager + lockfile policy, formatter/lint config pointers, CI job shape. -->
