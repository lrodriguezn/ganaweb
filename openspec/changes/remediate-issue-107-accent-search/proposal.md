# Proposal: Remediate issue #107 accent search

## Intent

Correct the #107 PostgreSQL listing implementation so RF-ANIM-LIST LA-010 is true: `q` and validated `contains` match text regardless of case or Spanish accents. Preserve the existing online API contract, RBAC, finca isolation, DTOs, errors, counts, and deterministic pagination.

## Scope

### In Scope
- Strict-TDD PostgreSQL RED/GREEN tests proving accented/unaccented equivalence for `q` and `contains`, including finca isolation, counters, and stable paged results.
- Safely provision and use PostgreSQL `unaccent` in the shared parameterized predicate builder and matching count/page predicates.
- Add migration/repository deployment validation, extension-use capability evidence, rollback instructions, and a documented normalized-column fallback decision when provisioning/use permissions are unavailable.
- Normalize corrected bytes; independently verify and perform a fresh content-bound review on the same dedicated #107 branch/PR under its approved 800-line exception.

### Out of Scope
- Issue #112 warnings, UI, preferences, export, SQLite/WASM parity, and RF-ANIM-LIST §11 p95 fixture creation.
- Collation or ad-hoc transliteration strategies, write-path normalization/backfill unless `unaccent` is unavailable, and any API/RBAC/error/DTO change.

## Capabilities

### New Capabilities
- `animal-list-accent-search`: PostgreSQL-only accent-insensitive `q` and `contains` behavior plus extension capability and fallback boundaries.

### Modified Capabilities
- `db`: PostgreSQL migration convention must safely provision and validate the required `unaccent` extension without editing applied migrations.

## Approach

First prove the failure in the PostgreSQL integration suite. Add an additive migration that provisions `unaccent` through repository conventions, then apply `unaccent(lower(column)) LIKE unaccent(lower($value))` with bound parameters in the shared `q`/`contains` builder. Validate extension availability/use during deployment; if unavailable, stop for a separately designed persisted normalized-column fallback—never silently retain `lower(...) LIKE`.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `packages/db/src/animal-infrastructure.ts` | Modified | Shared accent-normalized predicates |
| `packages/db/tests/animal-listado-postgres.test.ts` | Modified | RED PostgreSQL equivalence/isolation/pagination coverage |
| `packages/db/migrations/`, schema/journal | Modified | Additive extension provisioning and validation |
| `openspec/changes/implement-issue-107-server-contract/` | Referenced | Prior evidence boundary; not corrected-byte proof |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Deployment role cannot provision/use extension | Med | Capability gate; return to normalized-column design |
| Predicate/count divergence or slow wildcard search | Med | Reuse predicates; test counters/pages; no §11 claim |
| Prior review validates old bytes | High | Normalize, independently verify, fresh content-bound review |

## Rollback Plan

Revert repository predicate changes. For an applied migration, add a forward corrective/reversal migration; never edit it. Disable the listing only if extension failure makes correct search impossible, then pursue the approved fallback design.

## Dependencies

- PostgreSQL target where `unaccent` can be provisioned and executed; existing #107 branch/PR and approved size exception.

## Success Criteria

- [ ] PostgreSQL tests prove bidirectional accent equivalence for `q` and `contains` without cross-finca leakage, count drift, duplicates, or unstable pages.
- [ ] Deployment validation proves `unaccent` provision/use or records a blocker and triggers the normalized-column fallback design.
- [ ] Corrected bytes are normalized, independently verified, and freshly reviewed before the existing #107 PR proceeds.
