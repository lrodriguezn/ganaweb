```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:4a292caabd2bc8bdd8f67772a20cca3e3e35bd95945bf49b89a3dfb47cbce860
verdict: fail
blockers: 0
critical_findings: 1
requirements: 7/7
scenarios: 17/21
test_command: pnpm turbo test
test_exit_code: 1
test_output_hash: sha256:35f432b703abfb8e1707067862f1cfcb63ac847a0f6a119469c284f9396ed1b8
build_command: pnpm turbo build
build_exit_code: 0
build_output_hash: sha256:704e887a48d26c6ded4d93157f5ba4d86db9267efbd9ad53cfda1fdd0071b050
```

## Verification Report

**Change**: issue-110-animal-list-pagination-preferences
**Version**: N/A
**Mode**: Strict TDD

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 20 |
| Tasks complete | 20 |
| Tasks incomplete | 0 |

### Build & Tests Execution
**Build**: ✅ Passed
```text
pnpm turbo build → 7 successful, 7 total (exit 0)
```

**Typecheck**: ✅ Passed
```text
pnpm turbo typecheck → 13 successful, 13 total (exit 0, FULL TURBO)
```

**Tests**: ⚠️ 71 change-specific passed / 7 environment-gated failed / 0 skipped
```text
pnpm turbo test → exit 1
  @ganaweb/web: 13 files, 241 tests passed (includes 22 normalization + 13 HTTP contract + 27 route adapter)
  @ganaweb/ui: 18/19 files passed, 476 tests (includes 9 preference UI tests); 1 pre-existing date-picker failure (unrelated)
  @ganaweb/db: 79 passed, 7 failed (animal-listado-preferencias-postgres.test.ts — requires live PG with migration 0005)
```

**Coverage**: ➖ Not available (config.yaml: coverage.available = false)

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| REQ-01 Authorized Finca-Scoped Preferences | Authorized preference retrieval | `animal-list-preferences-http.test.ts > GET returns 200` | ⚠️ PARTIAL |
| REQ-01 | Cross-scope request | `animal-list-preferences-http.test.ts > GET/PUT returns 403` | ⚠️ PARTIAL |
| REQ-02 Validated Preference Values and Defaults | Valid preference is retained | `animal-list-preferences.test.ts > validatePreferenciasBody accepts valid body` + `http.test.ts > PUT 200 normalized echo` | ✅ COMPLIANT |
| REQ-02 | Invalid or reset preference | `animal-list-preferences.test.ts > 29/25 defaults` (3) + `registered-only` (2) + `page-size whitelist` (6) + `http.test.ts > PUT 400` (2) | ✅ COMPLIANT |
| REQ-03 Last-Write-Wins Preference Storage | Concurrent saves | `animal-listado-preferencias-postgres.test.ts > LWW upsert` (env-gated) | ❌ UNTESTED |
| REQ-03 | Failed save | `http.test.ts > PUT 500 sanitized` + `route.test.tsx > reports save failure` | ⚠️ PARTIAL |
| REQ-04 Presentational Pagination and Preference Controls | Viewer changes presentation | `animal-listado-preferencias.test.tsx > page callback` + `page-size callback` + `column selector callback` | ✅ COMPLIANT |
| REQ-04 | Mandatory columns cannot be removed | `animal-listado-preferencias.test.tsx > keeps Código and Nombre selected and immutable` | ✅ COMPLIANT |
| REQ-04 | Retryable preference warning | `animal-listado-preferencias.test.tsx > preserves selection and invokes retry` | ✅ COMPLIANT |
| REQ-04 | Reset controls delegate | `animal-listado-preferencias.test.tsx > invokes reset callback once` + `hides reset when default` | ✅ COMPLIANT |
| REQ-05 Canonical Online Table Contract | Canonical response renders | `animal-listado-route-integration.test.tsx > renders desktop table from #107` (pre-existing) | ✅ COMPLIANT |
| REQ-05 | Optional field awareness | `animal-listado-route-integration.test.tsx` (pre-existing) | ✅ COMPLIANT |
| REQ-06 Canonical Route Query State | Shared URL is reproducible | `route.test.tsx > resolverPageSizeListado` + `resolverColsListado` | ✅ COMPLIANT |
| REQ-06 | Filter grammar is not label-derived | Pre-existing #109 coverage (route adapter uses stable IDs) | ✅ COMPLIANT |
| REQ-06 | URL overrides preferences | `route.test.tsx > mezclarPreferenciasListado URL overrides` (3 tests) | ✅ COMPLIANT |
| REQ-06 | Failed preference load uses defaults | `route.test.tsx > failed load uses defaults + warning` (2 tests) | ✅ COMPLIANT |
| REQ-07 Query Mutations and History | Search replaces after debounce | Pre-existing #109 coverage (not modified by #110) | ✅ COMPLIANT |
| REQ-07 | Sort reaches no-sort | Pre-existing #109 coverage (not modified by #110) | ✅ COMPLIANT |
| REQ-07 | Browser navigation replays state | Pre-existing #109 coverage (not modified by #110) | ✅ COMPLIANT |
| REQ-07 | Page mutation preserves other query state | `route.test.tsx > page mutation changes only page` + `selecting page 1 canonicalizes` | ✅ COMPLIANT |
| REQ-07 | Failed preference save preserves session state | `route.test.tsx > reports save failure so route keeps session selection` | ✅ COMPLIANT |

**Compliance summary**: 17/21 scenarios compliant, 3 partial (env-gated DB layer), 1 untested (LWW upsert requires live PG)

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Authorized Finca-Scoped Preferences | ✅ Implemented | authz-CTE in DrizzleAnimalListadoPreferenciasRepository; HTTP 403 on null session or ForbiddenError |
| Validated Preference Values and Defaults | ✅ Implemented | normalizePreferencias: registered-only, dedupe, mandatory codigo/nombre, canonical sort, 29/25 defaults; validatePreferenciasBody: strict PUT rejection |
| Last-Write-Wins Preference Storage | ✅ Implemented | ON CONFLICT DO UPDATE in repository; failed save throws, prior row unchanged |
| Presentational Pagination and Preference Controls | ✅ Implemented | UI renders route-supplied models; codigo/nombre immutable; reset/warning/retry delegate to callbacks |
| Canonical Online Table Contract | ✅ Implemented | Pre-existing #107/#108 contract preserved; effective columns from preferences |
| Canonical Route Query State | ✅ Implemented | mezclarPreferenciasListado: URL > prefs > defaults; resolverPageSize/Cols parse URL |
| Query Mutations and History | ✅ Implemented | cambiarPagina/PageSize/Cols builders; page resets to 1 on size/cols change |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Dedicated animal_listado_preferencias table | ✅ Yes | Schema + migration 0005 with uq(usuario_id, finca_id) |
| Normalization in server contract layer | ✅ Yes | animal-list-preferences.ts reuses ANIMAL_LIST_COLUMNS registry |
| Last-write-wins (ON CONFLICT DO UPDATE) | ✅ Yes | Repository upsert; no optimistic versioning |
| Column storage as text[] | ✅ Yes | columnas text[] in schema and migration |
| Authorization via authz-CTE, fail-closed | ✅ Yes | DrizzleAnimalListadoPreferenciasRepository reuses PE-001–003 CTE pattern |
| HTTP handler factory mirroring createAnimalListadoHttpHandler | ✅ Yes | createAnimalListadoPreferenciasHttpHandler with DI deps |
| Route initializes from prefs only when URL lacks valid values | ✅ Yes | mezclarPreferenciasListado: URL overrides prefs |
| Desktop UI stays presentational | ✅ Yes | No URL/auth/persistence in UI; callbacks only |

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ⚠️ | PR2 has TDD Cycle Evidence table; PR1 lacks formal table (tasks structured as RED/GREEN/REFACTOR) |
| All tasks have tests | ✅ | 20/20 tasks map to test files |
| RED confirmed (tests exist) | ✅ | 5 test files verified in codebase |
| GREEN confirmed (tests pass) | ✅ | 71/71 runnable change-specific tests pass |
| Triangulation adequate | ✅ | Multi-case coverage: 22 normalization + 13 HTTP + 27 route + 9 UI |
| Safety Net for modified files | ✅ | PR2 reports 112 baseline (route) and 20/20 (integration) |

**TDD Compliance**: 5/6 checks passed (PR1 formal evidence table missing)

---

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 62 | 3 | vitest |
| Integration (UI) | 9 | 1 | vitest + jsdom + testing-library |
| Integration (DB) | 7 | 1 | vitest + live PG (env-gated) |
| E2E | 0 | 0 | playwright (not run) |
| **Total** | **78** | **5** | |

---

### Changed File Coverage
Coverage analysis skipped — no coverage tool detected (config.yaml: coverage.available = false)

---

### Assertion Quality
**Assertion quality**: ✅ All assertions verify real behavior

No tautologies, ghost loops, or smoke-test-only patterns found. All test files call production code and assert specific values. Mock/assertion ratio is healthy (HTTP tests use stub ports with value assertions; UI tests use userEvent with behavioral assertions).

---

### Quality Metrics
**Linter**: ➖ Not run (config.yaml: linter.available = false)
**Type Checker**: ✅ No errors (pnpm turbo typecheck → 13/13 pass)

### Issues Found
**CRITICAL**:
1. `pnpm turbo test` exits 1: 7 DB integration tests fail with `relation "animal_listado_preferencias" does not exist` — test PG lacks migration 0005. Environment-gated per config.yaml (all runners marked `available: false`). Design acknowledges: "openspec/config.yaml marks runners unavailable; verification plans for this." Resolution: apply migration 0005 to test PG and re-run.

**WARNING**:
1. PR1 apply-progress lacks a formal TDD Cycle Evidence table (PR2 has one). Tasks are structured as RED/GREEN/REFACTOR, but the formal table was not recorded.
2. Pre-existing UI test failure: `date-picker.test.tsx` (1 test, unrelated to #110).

**SUGGESTION**:
1. Apply migration 0005 to the test PG instance and re-run `pnpm turbo test` to achieve full green before archive.
2. Record PR1 TDD Cycle Evidence retroactively for audit completeness.

### Verdict
FAIL
Test command exits non-zero (7 DB integration tests require live PG with migration 0005). All 20 tasks complete; build and typecheck pass; 71 change-specific runnable tests pass across unit, HTTP contract, route adapter, and UI layers. Design decisions fully followed. No code defects found. Failure is environment-gated, not a code defect. Apply migration 0005 to test PG and re-run to achieve full green.
