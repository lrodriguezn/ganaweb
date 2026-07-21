# Archive Report — Fix Issue #57: CANONICAL whitelist

**Change**: fix-issue-57-canonical-whitelist
**Archived**: 2026-07-21
**Artifact Store**: openspec
**Archived To**: `openspec/changes/archive/2026-07-21-fix-issue-57-canonical-whitelist/`

## Status

- **Verdict**: PASS — verification confirmed 65/65 tests passing, 0 CANONICAL references remaining.
- **Review Gate**: No formal review conducted (not required for this workflow path).
- **Task Completion**: 19/19 tasks checked `[x]` in tasks.md. All implementation tasks complete.
- **CRITICAL Issues**: None.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| catalog-queries | Created | New main spec at `openspec/specs/catalog-queries/spec.md` — 1 ADDED requirement (Catalog Decoder Source Of Truth) + 1 MODIFIED requirement (8 use cases — whitelist removed, structural checks kept), 6 scenarios |

The change's `spec.md` was a complete spec for the new `catalog-queries` domain (no existing main spec). Copied directly as the source of truth.

## Archive Contents

| Artifact | Status |
|----------|--------|
| exploration.md | ✅ |
| proposal.md | ✅ |
| spec.md | ✅ |
| design.md | ✅ |
| tasks.md | ✅ (19/19 tasks complete) |
| verify-report.md | ✅ |
| archive-report.md | ✅ (this file) |

## Implementation Summary

- **8 use case files**: Removed `CANONICAL_*_IDS` `ReadonlySet` + JSDoc + whitelist check line. Kept all structural validations (null/duplicate/empty/fincaId/sort/try-catch).
- **8 test files**: Removed "non-canonical id → no_disponible" negative tests. Added positive "accepts unknown id" tests.
- **16 files changed**, net -104 lines (32 insertions, 136 deletions).
- **Zero remaining `CANONICAL_*` references** in `packages/`.
- **All 8 decoder bodies** converged on the `listarCatalogoSexo` reference pattern.

## Source of Truth Updated

- `openspec/specs/catalog-queries/spec.md` — now reflects the "DB is source of truth" contract for catalog queries.

## Intentional Archiving Notes

- No partial archive or stale-checkbox reconciliation was needed. All artifacts present, all tasks complete, verification clean.
- W-1 from verify-report (missing `apply-progress.md`): accepted as a process documentation gap; TDD discipline verifiable from test diffs.
- Pre-existing unrelated UI test failure (`@ganaweb/ui#date-picker BUG-004`) noted in verify-report but out of scope.

## Next Steps

The SDD cycle for this change is complete. Ready for the next change.
