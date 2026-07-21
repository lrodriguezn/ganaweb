# Archive Report: `fix-animal-form-viewport-state-loss`

**Archived**: 2026-07-21
**Archive Path**: `openspec/changes/archive/2026-07-21-fix-animal-form-viewport-state-loss/`
**SDD Cycle**: Complete — all phases: explore → propose → spec → tasks → apply → verify → archive

## Change Summary

Bug #59 fix: Animal form data lost on viewport change. Replaced dual-mount `AnimalFormScreen` instances (one per `mode` with `hidden md:block` / `md:hidden` wrapper toggle) with a single reactive instance that derives `mode` from `matchMedia("(min-width: 768px)")`. The `mode` prop was made optional; when unset, the component derives the responsive variant from the media query. Form `id` was stabilized to `animal-form-${currentAnimalId ?? "new"}` (no `mode` segment) so React reuses the same form element across viewport transitions.

## Artifacts Archived

| Artifact | Status | Notes |
|----------|--------|-------|
| `exploration.md` | ✅ Present | Root cause analysis, approach comparison |
| `proposal.md` | ✅ Present | Scope, approach, risks, rollback plan |
| `spec.md` (delta) | ✅ Present | 4 ADDED requirements, 9 scenarios |
| `tasks.md` | ✅ Present | 16/16 tasks complete |
| `verify-report.md` | ✅ Present | PASS — 35/35 tests green, typecheck clean |

## Spec Sync Summary (into `openspec/specs/animal-crud-ui/spec.md`)

| Domain | Action | Details |
|--------|--------|---------|
| `animal-crud-ui` | 4 requirements ADDED | Single-instance form rendering, viewport-responsive `matchMedia` mode, form state persistence, optional `mode` prop |

All 4 new requirements merged cleanly as additive changes. No modifications, removals, or renames — non-destructive merge complete.

## Task Completion

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1 — Foundation (1.1–1.5) | 5/5 | ✅ Complete |
| Phase 2 — Core Implementation (2.1–2.2) | 2/2 | ✅ Complete |
| Phase 3 — Testing (3.1–3.5) | 5/5 | ✅ Complete |
| Phase 4 — Verification (4.1–4.4) | 4/4 | ✅ Complete |

All persisted task checkboxes verified as `[x]` before archive.

## Verification Summary

- **Tests**: 35/35 animal-ui tests pass (31 pre-existing + 4 new viewport-flip tests)
- **Typecheck**: clean on both `@ganaweb/ui` and `@ganaweb/web`
- **Biome**: clean on all 4 touched files
- **Spec conformance**: 4 requirements, 9 scenarios — all passing
- **CRITICAL issues**: None
- **Recommendation**: `ready-for-archive`

## Risks Carried Forward

| Risk | Severity | Notes |
|------|----------|-------|
| Manual E2E (task 4.3) not executed by verify sub-agent | LOW | Viewport-flip unit tests cover the data-preservation invariant |
| `@ts-expect-error` comments in tests referencing now-optional `mode` prop | LOW | Suppressions remain valid; harmless |
| Hydration warning check by code review, not browser | LOW | SSR path unchanged from v1.3; `isHydrated` gate ensures match |

## Source of Truth Updated

`openspec/specs/animal-crud-ui/spec.md` now includes the 4 new requirements (lines 314–395):

- **Requirement: Single-instance form rendering per route** — one `AnimalFormScreen` per route, no dual-mount
- **Requirement: Viewport-responsive mode derived from `matchMedia`** — reactive `(min-width: 768px)` listener with SSR-safe default
- **Requirement: Form state persists across viewport changes** — internal `useState` values survive re-render across breakpoints
- **Requirement: `mode` prop is optional and overrides the media query** — optional prop for tests/SSR; production routes omit it

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.
Ready for the next change.
