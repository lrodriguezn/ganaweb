# Pull Request

## Linked Issue (REQUIRED)

> Every PR MUST link an approved issue. PRs without a linked issue that has the `status:approved` label will be blocked by the CI validation workflow.

- Closes #

> The linked issue MUST have the `status:approved` label assigned by a maintainer. If your issue is still `status:needs-review`, wait for approval before opening this PR.

## PR Type (REQUIRED)

> Check exactly ONE box. The PR must also carry exactly one matching `type:*` label — the validation workflow checks for this.

- [ ] Bug fix (`type:bug`)
- [ ] New feature (`type:feature`)
- [ ] Documentation only (`type:docs`)
- [ ] Code refactoring (`type:refactor`)
- [ ] Maintenance / tooling (`type:chore`)
- [ ] Breaking change (`type:breaking-change`)

## Summary

<!-- 1-3 bullet points describing what this PR does and why. -->

-
-
-

## Changes

<!-- Group changes by package. Add or remove rows as needed. -->

| File | Change |
|------|--------|
| `path/to/file` | What changed and why |

## Test Plan

<!-- Tick all that apply. For ganaweb, the expected quality gate is: typecheck, unit tests, build, lint, dep-cruise, and a manual smoke test. -->

- [ ] `pnpm turbo test` passes locally
- [ ] `pnpm turbo build` passes locally
- [ ] `pnpm exec biome ci .` passes locally
- [ ] `pnpm exec depcruise apps/web/src --config .dependency-cruiser.cjs` passes locally (when applicable)
- [ ] Manually tested the affected flow in the dev server
- [ ] Manually tested the affected flow on a mobile viewport (PWA)
- [ ] Coverage gate is met (when adding or changing production code)
- [ ] Updated relevant docs / openspec deltas (if behavior changed)

## Contributor Checklist

<!-- All boxes must be checked before requesting review. -->

- [ ] I linked an **approved** issue (it has the `status:approved` label)
- [ ] I added **exactly one** `type:*` label to this PR
- [ ] My commit messages follow the Conventional Commits format (`type(scope): description`)
- [ ] I did **not** add any `Co-Authored-By:` or AI attribution trailers to commits
- [ ] I followed TDD where applicable (failing test → production code → refactor)
- [ ] I updated documentation / openspec deltas when behavior changed
- [ ] I ran the full local quality gate (`pnpm turbo test build && pnpm exec biome ci .`) before pushing
