```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:9be0c684211cf472477c9623671cdf4de8e8c552d866439a73d51427daa523b2
verdict: fail
blockers: 0
critical_findings: 0
requirements: 15/15
scenarios: 28/29
test_command: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ganaweb pnpm turbo test --force
test_exit_code: 0
test_output_hash: sha256:1831c6699877d3fe340314b0e690d82607f64ad447c2b45545a5548de777411c
build_command: pnpm turbo build --force
build_exit_code: 0
build_output_hash: sha256:da8603f1c72a5d9a326e5f8d4036cd8f396f6a7c7c0e829b76ad643f0c2e1702
```

## Verification Report

**Change**: redesign-ficha-animal
**Version**: N/A (delta specs: animal-ficha-desktop-ui, animal-ficha-read-model, animal-timeline)
**Mode**: Strict TDD
**Verified state**: worktree at detached HEAD `a5e0454` (origin/master) containing all three merged slices — PR #168 (ed19abf), PR #170 (a4f4f0c), PR #174 (a5e0454).

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 19 |
| Tasks complete | 19 |
| Tasks incomplete | 0 |

### Build & Tests Execution
**Build**: ✅ Passed
```text
pnpm turbo build --force → exit 0 — Tasks: 7 successful, 7 total (0 cached, 48.2s)
pnpm turbo typecheck --force → exit 0 — Tasks: 13 successful, 13 total
pnpm exec biome ci . → exit 0 — 359 files checked, no issues
```

**Tests**: ✅ 1250 passed / ❌ 0 failed / ⚠️ 26 skipped
```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ganaweb pnpm turbo test --force → exit 0
Tasks: 13 successful, 13 total (0 cached — real execution, no turbo cache)
  dominio:    109 passed (5 files)
  aplicacion: 106 passed (16 files)
  db:         157 passed | 26 skipped (24 files; skips are DB_SMOKE/BENCHMARK-gated)
  ui:         560 passed (21 files)
  web:        318 passed (17 files)

Targeted Postgres integration (ficha read model + timeline):
pnpm -F @ganaweb/db exec vitest run tests/animal-ficha-postgres.test.ts tests/animal-timeline-postgres.test.ts → exit 0
  10 passed (3 ficha read-model + 7 timeline) against real Postgres

Playwright E2E (tests/e2e/animales.spec.ts, desktop + mobile projects):
pnpm exec playwright test tests/e2e/animales.spec.ts → exit 1 — 10 passed / 8 failed
  Change-critical test PASSED on both projects: "referenced delete communicates
  inactivation; timeline tabs and pagination are server-driven" (desktop 6.6s, mobile 4.0s)
  The 8 failures are PRE-EXISTING and unrelated to this change (see Issues → WARNING-3
  for the ancestry proof).
```

**Coverage**: changed-file coverage where tooling exists → ✅ Above threshold
```text
packages/dominio/src/animal-ficha.ts — 100% stmts / 100% branch / 100% funcs / 100% lines
packages/db/src/animal-infrastructure.ts (new region L1230–1562) — 97.4% stmts
  (uncovered L1230–1236 belongs to the adjacent pre-existing DrizzleBinaryQueueRepository
  tail; the ficha/timeline code added by this change is effectively fully covered)
aplicacion / web / ui packages — no coverage provider configured (informational)
```

### Spec Compliance Matrix

**Capability: animal-ficha-desktop-ui** (7 requirements, 12 scenarios)

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Ficha Header Composition | Header renders identity context | `packages/ui/tests/animal-ui.test.tsx > ficha header composition > renders title, state badges and the full meta line with real values` + `apps/web/tests/animal-ficha-route-integration.test.tsx > renders resolved location names and grupo in the header meta line` | ✅ COMPLIANT |
| Ficha Header Composition | Breadcrumb returns to the list | `animal-ui.test.tsx > renders the breadcrumb and returns to the list via onVolverAListado` + route integration `wires the breadcrumb to the list navigation callback` | ✅ COMPLIANT |
| Summary Cards With Real Data | Cards render real values | `animal-ui.test.tsx > summary cards > renders DATOS, REPRODUCCIÓN and PESO Y CONDICIÓN with real values` + route integration `renders the loader resumen values in the desktop cards` | ✅ COMPLIANT |
| Summary Cards With Real Data | Missing data renders structured empty states | `animal-ui.test.tsx > keeps labels and units with placeholder values when data is missing` + route integration `keeps structured placeholders when the resumen is absent` | ✅ COMPLIANT |
| Tabbed Timeline Card | Default tab shows all events | `animal-ui.test.tsx > shows Resumen active by default listing all events newest-first` + e2e test 3 (Resumen lists 20 of 28 newest-first) | ✅ COMPLIANT |
| Tabbed Timeline Card | Domain tab filters events | `animal-ui.test.tsx > filters events by domain when a domain tab is selected` + `delegates tab switches to onTabChange with the tab dominio` + e2e (Reproducción 7, Sanidad 3 — server-side) | ✅ COMPLIANT |
| Tabbed Timeline Card | Tab without events shows empty state | `animal-ui.test.tsx > shows a structured empty state when the selected tab has no events` | ✅ COMPLIANT |
| Timeline Pagination Control | More events available | `animal-ui.test.tsx > is hidden without nextCursor and appends via onLoadMore when present` + route integration `'Ver más eventos' appends the next page using the current cursor` + e2e (20 → 28 appended) | ✅ COMPLIANT |
| Timeline Pagination Control | No further events | `animal-ui.test.tsx` (control hidden without nextCursor) + e2e (control removed after last page) | ✅ COMPLIANT |
| Event Registration Drawer Wiring | Open and close drawer | route integration `opens the EventDrawer from '+ Registrar evento' with the ficha animal preselected` + `closing the drawer returns to the ficha without navigation` + e2e drawer open/Escape close | ✅ COMPLIANT |
| Edit Save Returns to Ficha | Save returns to ficha | `apps/web/tests/animal-web-flow.test.ts > testEditSaveReturnsToFicha` (source-pin: navigate target is `/fincas/${fincaId}/animales/${animalId}`, never the list) + e2e Editar → `/editar` | ✅ COMPLIANT |
| Theme Fidelity | Renders across themes | UI tests render ficha with token classes (default appearance); static: 0 `dark:` variants and no raw colors in ficha code, no new CSS/token files in any slice | ⚠️ PARTIAL |

**Capability: animal-ficha-read-model** (4 requirements, 8 scenarios)

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Enriched Ficha Projection | Animal with full history | `packages/aplicacion/tests/animal-use-cases.test.ts > aggregates the enriched ficha resumen from the read model and dominio derivations` + `packages/db/tests/animal-ficha-postgres.test.ts > resolves names, latest weighings, reproductive sequence and condition for a full history` + web-flow DTO assertion | ✅ COMPLIANT |
| Enriched Ficha Projection | Animal without history | aplicacion `returns absent summary fields for an animal without history (never fabricated)` + db `returns empty collections and null names for an animal without history` | ✅ COMPLIANT |
| Reproductive Summary Derived From Events | Summary matches event sequence | `packages/dominio/tests/animal-ficha.test.ts > derives the full summary from the event sequence (TR-014)` + días abiertos / IEP / gestation triangulation tests | ✅ COMPLIANT |
| Reproductive Summary Derived From Events | Male animal has no reproductive summary | dominio `returns empty summary for male animals (TR-013)` + `returns empty summary for pajuela animals (TR-013)` | ✅ COMPLIANT |
| Weight and Body Condition Summary | GDP from two weighings | dominio `derives kg/day between the two latest weighings` (+ rounding and negative-gain variants) | ✅ COMPLIANT |
| Weight and Body Condition Summary | Single weighing has no GDP | dominio `returns absent GDP with a single weighing` (+ no-weighing and non-positive-interval variants) | ✅ COMPLIANT |
| Computed Age | Age computed from birth date | dominio `calcularEdadMeses` — 3 boundary cases (month reached / not reached / epoch-seconds) | ✅ COMPLIANT |
| Computed Age | Missing birth date | dominio `returns absent age when fechaNacimiento is missing` | ✅ COMPLIANT |

**Capability: animal-timeline** (4 requirements, 9 scenarios)

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Event-Table Union Coverage | Events from multiple tables | `packages/db/tests/animal-timeline-postgres.test.ts > unions the 11 event tables with per-table dominio/tipo mapping` (real Postgres) | ✅ COMPLIANT |
| Event-Table Union Coverage | Animal without events | timeline PG `returns an empty page without synthetic events for an animal without history` | ✅ COMPLIANT |
| Domain and Tipo Mapping | Weighing maps to producción | timeline PG union test asserts peso → dominio `produccion`, tipo `pesaje` | ✅ COMPLIANT |
| Domain and Tipo Mapping | Distinct domains preserved | timeline PG union test (all 4 domains) + `apps/web/tests/animal-web-flow.test.ts` passthrough (real dominio/tipo on items[0]/items[3], nothing hardcoded) | ✅ COMPLIANT |
| Chronological Ordering | Descending order | timeline PG `orders events newest-first across tables (RN-002)` | ✅ COMPLIANT |
| Cursor-Based Pagination | First page with more events | timeline PG `paginates with keyset cursor: resume without duplicates or gaps, last page omits cursor` (28 events → 20 + nextCursor) + e2e | ✅ COMPLIANT |
| Cursor-Based Pagination | Cursor resumes without duplicates | same PG test (resume 20+8, no repeats/gaps) + e2e append to 28 + timeline PG `ignores tampered or garbage cursors and returns the first page (no throw, no injection)` | ✅ COMPLIANT |
| Cursor-Based Pagination | Last page omits cursor | same PG test (last page has no nextCursor) + e2e (control gone at 28) | ✅ COMPLIANT |
| Cursor-Based Pagination | Pagination within a domain filter | timeline PG `composes the domain filter with pagination (ficha tabs)` (reproducción 25 → 20+5) + route integration `pagination within a domain tab carries tabTimeline and cursor together` | ✅ COMPLIANT |

**Compliance summary**: 28/29 scenarios compliant, 1 partial (Theme Fidelity runtime loop — see WARNING-2)

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Ficha Header Composition | ✅ Implemented | `AnimalFichaHeader` in `packages/ui/src/ganado/animal-crud.tsx` (breadcrumb, title `{codigo} · {nombre}`, state badges, meta line, Editar / + Registrar evento); wired in `$animalId.tsx` via `AnimalFichaRouteView` |
| Summary Cards With Real Data | ✅ Implemented | `CardsResumenFicha` — DATOS / REPRODUCCIÓN / PESO Y CONDICIÓN with `FilaDato` + `PLACEHOLDER = "—"` structured empty states |
| Tabbed Timeline Card | ✅ Implemented | `TimelineFicha` with `role="tab"` + `aria-selected`; controlled mode (`onTabChange`/`dominioActivo`) server-driven; domain-colored icons via pre-existing `DOMINIO_STYLE` tokens |
| Timeline Pagination Control | ✅ Implemented | Footer control appends via `onLoadMore`; hidden without `nextCursor`; count-less fallback label when pending count unknown |
| Event Registration Drawer Wiring | ✅ Implemented | `EventDrawer` mounted in `AnimalFichaRouteView` with ficha animal preselected; close returns without navigation |
| Edit Save Returns to Ficha | ✅ Implemented | `editar.tsx` navigates to `/fincas/${fincaId}/animales/${animalId}` after successful save |
| Theme Fidelity | ✅ Implemented | Tokens only; zero `dark:` variants; no new colors/CSS/token files introduced by any slice |
| Enriched Ficha Projection | ✅ Implemented | `obtenerFichaAnimal` (`packages/aplicacion/src/casos-uso/animales/index.ts`) + `construirResumenFichaAnimal`; absent values stay null, never fabricated |
| Reproductive Summary Derived From Events | ✅ Implemented | `derivarResumenReproductivo` (`packages/dominio/src/animal-ficha.ts`) — events are truth (TR-010/TR-014); `categoriaReproductiva` cache never read; TR-013 male/pajuela → null |
| Weight and Body Condition Summary | ✅ Implemented | `calcularGdp` (previous-weighing delta, null on single weighing) + read-model latest condition with scale label |
| Computed Age | ✅ Implemented | `calcularEdadMeses` — epoch-seconds birth → whole months at injected `hoy`; null when absent |
| Event-Table Union Coverage | ✅ Implemented | `RAMAS_TIMELINE` — UNION ALL over the 11 event tables (`partos_crias` link table excluded); synthetic creation-event stub deleted |
| Domain and Tipo Mapping | ✅ Implemented | Data-driven per-branch dominio/tipo in `RAMAS_TIMELINE`; matches the spec canonical table exactly; web mapper passes real values through (`toTimelineItem` + `tituloEventoTimeline`) |
| Chronological Ordering | ✅ Implemented | Outer `ORDER BY fecha DESC, id DESC`; no date filtering beyond ordering (RN-002 respected) |
| Cursor-Based Pagination | ✅ Implemented | Keyset `(fecha DESC, id DESC)` LIMIT limit+1; cursor = base64url JSON `{f, id}` decoded, validated (shape + date regex + valid date) and bound — never interpolated; dominio filter drops branches and composes with the cursor |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| D1 — UNION ALL + keyset (one round trip) | ✅ Yes | Single UNION ALL statement; per-table mapping; atomic order/pagination |
| D2 — Server-side tab filtering | ✅ Yes | `dominio` filter drops UNION branches; `normalizarTabTimeline` guard (only 4 canonical domains; unknown → Resumen); e2e asserts server-side counts |
| D3 — Keyset cursor base64url `{f, id}` | ✅ Yes | `codificar/decodificarCursorTimeline`; tampered/garbage/injection cursors degrade to first page (PG test) |
| D4 — Dominio pure functions | ✅ Yes | `animal-ficha.ts` pure functions with injected `hoy`; 100% coverage; dominio has zero deps |
| D5 — New projection `FichaAnimalResumen` | ✅ Yes | List contract `AnimalResumen` untouched |
| D6 — Rewrite in place, keep export | ✅ Yes | `AnimalFichaDesktopScreen` export preserved; barrel/route/test contract intact |
| D7 — No new indexes / no migrations | ✅ Yes | No schema or migration files in any slice diff |
| File Changes table | ✅ Yes | All 10 planned files changed; changed-file set matches (plus test files and SDD artifacts) |

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | apply-progress (Engram obs #813) carries TDD Cycle Evidence for all three slices (RED → GREEN → TRIANGULATE → REFACTOR per task) |
| All tasks have tests | ✅ | 19/19 tasks map to test files that exist in the merged tree |
| RED confirmed (tests exist) | ✅ | All cited test files verified present: `animal-ficha.test.ts` (dominio), `animal-use-cases.test.ts`, `animal-ficha-postgres.test.ts`, `animal-timeline-postgres.test.ts`, `animal-web-flow.test.ts`, `animal-ui.test.tsx`, `animal-ficha-route-integration.test.tsx`, `animales.spec.ts` |
| GREEN confirmed (tests pass) | ✅ | Every cited file passed in this verification run (1250 workspace tests + 10 targeted PG + e2e test 3 on both projects) |
| Triangulation adequate | ✅ | dominio 18 tests across 3 functions (boundary + TR-013/TR-014 variants); timeline 7 PG tests (union/order/resume/filter/empty/tampered/finca); UI 17 ficha assertions; no single-case behaviors with multi-scenario specs |
| Safety Net for modified files | ✅ | Full suite executed per slice (reported) and re-executed here with zero regressions (ui 560, web 318, aplicacion 106, dominio 109, db 157) |

**TDD Compliance**: 6/6 checks passed

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | ~35 (dominio 18 + ui ficha 17) | 2 | vitest (node + jsdom) |
| Integration | ~24 (db PG 10, aplicacion 4, route jsdom 10) | 4 | vitest + real Postgres / jsdom |
| Harness | web-flow tsx suite (ficha DTO + edit-return source pins) | 1 | tsx + node:assert |
| E2E | 2 (test 3 × desktop + mobile projects) | 1 | Playwright (Chromium) |
| **Total** | **~61 change-specific tests** | **8** | |

All layers match the cached testing capabilities (vitest + playwright + real Postgres). No undeclared tooling.

### Changed File Coverage
| File | Line % | Branch % | Uncovered Lines | Rating |
|------|--------|----------|-----------------|--------|
| `packages/dominio/src/animal-ficha.ts` | 100% | 100% | — | ✅ Excellent |
| `packages/db/src/animal-infrastructure.ts` (new region L1230–1562) | 97.4% stmts | 91.5% (whole file) | L1230–1236 (pre-existing adjacent class tail) | ✅ Excellent |
| aplicacion / web / ui changed files | ➖ | ➖ | — | No coverage provider configured for these packages (informational, not a failure) |

**Average changed file coverage (where measurable)**: 98.7%

### Assertion Quality
✅ All assertions verify real behavior. Scan of the 8 change test files found:
- No tautologies (`expect(true).toBe(true)` etc.)
- 4 `toEqual([])` assertions in `animal-timeline-postgres.test.ts` — each is a deliberate empty-page scenario with companion non-empty tests in the same file (union/pagination), so they are valid
- No ghost loops, no smoke-only tests, no production-code-free assertions
- Mock/assertion ratio healthy (route integration: 5 mocks / 27 expects; PG tests: 0 mocks)

### Quality Metrics
**Linter**: ✅ No errors (`pnpm exec biome ci .` — 359 files, exit 0)
**Type Checker**: ✅ No errors (`pnpm turbo typecheck --force` — 13/13 tasks, exit 0)

### Issues Found
**CRITICAL**: None

**WARNING**:
1. **Timeline includes annulled group-registry events** — the slice-2 ficha summary read model excludes events nested in annulled `registros_grupales` (TR-014), but the slice-3 timeline UNION does not (no join in the branch shape, per design D1). The spec is silent on this, and the deviation was documented during apply as a follow-up. Risk: an annulled group weighing/service can still appear in the timeline while absent from the summary cards.
2. **Theme Fidelity scenario only partially covered at runtime** — no test loops the ficha across the five themes × light/dark. Static evidence is strong (zero `dark:` variants, no raw colors, no new tokens/CSS in any slice; the ficha reuses the same token cascade the list table proves with its ten-appearance test), but the runtime multi-theme loop itself is unexercised for the ficha.
3. **8 pre-existing Playwright failures in `tests/e2e/animales.spec.ts`** (exit code 1 on the e2e command). Verified NOT caused by this change:
   - The failing specs (create-animal ×2, BUG-003 popover ×2, PR-5 potrero ×2, PR-5 tipoExplotacion ×2) navigate only to the list and `/animales/nuevo` create form — none touch the ficha route.
   - No slice modified those spec bodies (slice 3 rewrote only the timeline test; slices 1–2 made zero `tests/e2e` changes) nor the create-form code under test (slice hunks in `animal-crud.tsx` are confined to the ficha screen regions; slice 2 touched none).
   - The collapsed UBICACIÓN section the PR-5 specs trip on was introduced by `edc62ff` on 2026-07-24 — 11 days before slice 1 merged (2026-08-04). BUG-003 is a known-bug repro (popover overlaps label); create-animal hits a 5s cold-compile timeout on the list screen.
4. **Pagination control label fallback** — the spec text names the control "Ver N eventos más"; the server returns no total count (design does not add one), so the rendered label is the count-less fallback "Ver más eventos". Behavior (append next page, hide when exhausted) is fully compliant and both label modes are unit-tested; documented slice-1 deviation.

**SUGGESTION**:
1. Follow-up change: exclude annulled `registros_grupales` events from the timeline UNION (parity with the summary read model).
2. Follow-up change: refresh the stale Playwright specs (PR-5 collapsed UBICACIÓN expectations, BUG-003 fix, create-animal cold-compile timeout).
3. Add a multi-theme rendering loop test for the ficha (mirror the list table's ten-appearance test).
4. Pre-existing quirk: `packages/db` `typecheck` script masks tsc failures via `|| echo 'no source files yet'` — worth fixing independently.
5. Design D7 follow-up: consider `(animal_id, fecha)` indexes on `muertes` / `animales_condicion_corporal` if timeline volume grows.

### Verdict
FAIL (canonical — incomplete scenario evidence; valid and persistable, not archive-ready)
28/29 scenarios have passing runtime coverage. The single gap: the Theme Fidelity multi-theme scenario is PARTIAL — the ficha has no runtime theme-loop test (static evidence is strong: zero `dark:` variants, no raw colors, no new tokens/CSS in any slice). Zero critical findings: the full suite (1250 tests), build, typecheck, lint, targeted Postgres integration, and the change's own E2E all pass on real execution; the only red command (Playwright) fails exclusively on verified pre-existing specs unrelated to this change. The implementation matches specs and design on every runtime-verified dimension; adding a ficha theme-loop test (mirroring the list table's ten-appearance test) would complete the evidence and make this change archive-ready.
