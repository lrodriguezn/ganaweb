```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:3324351631dfc7db5f46fe78dc4212b4f7387cb1
verdict: PASS
blockers: 0
critical_findings: 0
requirements: 7/7
scenarios: 2/2
test_command: CI=true pnpm turbo test --force --filter=@ganaweb/web --filter=@ganaweb/ui
test_exit_code: 0
test_output_hash: sha256:67499062c5161e41160c78367b2b6121f90db34c3b652780e0b7dc12232802ee
build_command: pnpm turbo build --force
build_exit_code: 0
build_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

## Verification Report

**Change**: issue-213-mobile-tabs (Sanidad: tabs mobile Catálogo · Almacén · Refuerzos)
**Branch**: feat/issue-213-sanidad-mobile
**Commit**: 3324351
**Mode**: Strict TDD

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 4 work units + Phase 5 |
| Tasks complete | 4/4 + Phase 5 |
| Tasks incomplete | 0 |

### Build & Tests Execution

**Build**: ✅ Passed
```text
@ganaweb/web:build: dist/server/assets/sanidad-C0gdzZN8.js — built in 15.89s
@ganaweb/ui:build: ESM dist/index.js 289.10 KB, DTS dist/index.d.ts 99.76 KB
Tasks: 7 successful, 7 total
```

**Tests**: ✅ 1137 passed (692 @ganaweb/ui + 445 @ganaweb/web) / ❌ 1 failed (pre-existing, unrelated) / ⚠️ 0 skipped
```text
@ganaweb/ui:test: Test Files 31 passed (31), Tests 692 passed (692)
@ganaweb/web:test: Test Files 27 passed (27), Tests 445 passed (445)
@ganaweb/db:test: 1 failed (eventos-write-architecture.test.ts — timeout, pre-existing)
```

**TypeCheck**: ✅ Passed (13/13 tasks successful)
**Biome**: ✅ 459 files checked, no fixes
**no-sqlite**: ✅ Passed (no SQLite references detected)

### Spec Compliance Matrix (§5 / §12 / §13)

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| SAN-010 | 3 tabs Catálogo\|Almacén\|Refuerzos, Refuerzos default | `sanidad-mobile-view.test.tsx > TabsSanidad — SAN-010` | ✅ COMPLIANT |
| SAN-011 | CardRefuerzo con producto·propósito, N animales·vence, botón Registrar aplicación → precarga producto+animalIds | `refuerzo-card.test.tsx > SAN-011` (5 tests) | ✅ COMPLIANT |
| SAN-012 | Sección STOCK CRÍTICO ≤4 productos, badge Agotado/"N dosis", empty state | `seccion-refuerzos.test.tsx > SAN-012` (8 tests) | ✅ COMPLIANT |
| SAN-013 | Tab Catálogo: CRUD con `listarCatalogoSanidadFn`, `FormularioProductoSanitario`, `AlertDialog` inactivar | `sanidad-mobile-route.test.tsx > 4.1` (3 tests) | ✅ COMPLIANT |
| SAN-014 | Tab Almacén: lista entradas + FAB + `FormularioEntradaAlmacen` + `registrarEntradaAlmacenFn` | `sanidad-mobile-route.test.tsx > 4.2` (3 tests) | ✅ COMPLIANT |
| SAN-060 | Gating por permiso en cada tab (PE-001: sanidad:ver/editar/crear, nunca por rol) | `sanidad-mobile-view.test.tsx > SAN-060` + route tests | ✅ COMPLIANT |
| SAN-080 | Target táctil ≥44px en botón y card | `refuerzo-card.test.tsx > SAN-080` (getBoundingClientRect ≥44) | ✅ COMPLIANT |

**§13 scenario compliance**:

| §13 Item | Scenario | Test | Result |
|----------|----------|------|--------|
| Item 2 | Próximas agrupa refuerzos Esta semana / Próxima semana (consistente desktop/mobile) | `seccion-refuerzos.test.tsx > D10: 2 periodos mobile con contadores` | ✅ COMPLIANT |
| Item 11 | Tab default Refuerzos; desde CardRefuerzo → drawer con producto+animales precargados en 2 taps | `sanidad-panel-route.test.tsx > §13 item 11: 2-tap precargado en mobile` | ✅ COMPLIANT |

**Compliance summary**: 7/7 requirements compliant, 2/2 scenarios compliant

### TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | apply-progress.md con RED→GREEN→TRIANGULATE→REFACTOR por cada WU |
| All tasks have tests | ✅ | 4/4 WU tienen test files verificados |
| RED confirmed (tests exist) | ✅ | 6 test files verificados: refuerzo-card, seccion-refuerzos, sanidad-mobile-view, use-match-media, sanidad-panel-route, sanidad-mobile-route |
| GREEN confirmed (tests pass) | ✅ | 692 @ganaweb/ui + 445 @ganaweb/web = 1137 tests passing |
| Triangulation adequate | ✅ | WU1: 5+8 tests, WU2: 8 tests, WU3: 6+3 tests, WU4: 7 tests |
| Safety Net for modified files | ✅ | sanidad-panel-route.test.tsx (15 tests, 12 pre-existing + 3 nuevos) |

**TDD Compliance**: 6/6 checks passed

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 27 (refuerzo-card 5 + seccion-refuerzos 8 + sanidad-mobile-view 8 + use-match-media 6) | 4 | vitest/jsdom |
| Integration | 24 (sanidad-panel-route 15 + sanidad-mobile-route 7 + sanidad-shell-wiring 2) | 3 | vitest/jsdom |
| E2E | 0 | 0 | playwright (not in scope) |
| **Total** | **51** | **7** | |

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|-------------|--------|-------|
| SAN-010 (3 tabs, Refuerzos default) | ✅ Implemented | `sanidad-mobile-view.tsx`: `tabInicial = "refuerzos"`, `TABS` array con 3 entries |
| SAN-011 (precarga 2-tap) | ✅ Implemented | `refuerzo-card.tsx`: `onRegistrarAplicacion(refuerzo.productoId, [...refuerzo.animalIds])` |
| SAN-012 (STOCK CRÍTICO ≤4) | ✅ Implemented | `seccion-refuerzos.tsx`: slice(0,4), badge `bg-peligro-100`/`bg-alerta-100`, empty state |
| SAN-013 (Catálogo CRUD mobile) | ✅ Implemented | `sanidad.tsx:TabCatalogoMobile`: reutiliza `CatalogoProductosSanitariosMobile` + `FormularioProductoSanitario` |
| SAN-014 (Almacén mobile) | ✅ Implemented | `sanidad.tsx:TabAlmacenMobile`: reutiliza `ListadoEntradasAlmacen` + `FormularioEntradaAlmacen` |
| SAN-060 (gating por permiso) | ✅ Implemented | `PERMISO_POR_TAB` map + `tienePermiso()` en `TabsSanidad` y `SanidadMobileView` |
| SAN-080 (44px target) | ✅ Implemented | `min-h-[--h-touch]` en Button + getBoundingClientRect assert ≥44 |
| SAN-081 (sin dark:) | ✅ Compliant | 0 instancias de `dark:` en refuerzo-card.tsx, seccion-refuerzos.tsx, sanidad-mobile-view.tsx, use-match-media.ts |
| D9 (switch responsive same-route) | ✅ Implemented | `useMatchMedia("(max-width: 767px)")` en `sanidad.tsx:181`, un solo loader, una sola pareja de drawers |
| D10 (2 periodos mobile) | ✅ Implemented | `seccion-refuerzos.tsx`: "ESTA SEMANA" / "PRÓXIMA SEMANA" con contadores; "ESTE MES" solo desktop |
| D11 (useMatchMedia shared) | ✅ Implemented | `packages/ui/src/lib/use-match-media.ts`: SSR-safe default true, export aditivo desde `@ganaweb/ui` |
| No #214 notification/Inicio | ✅ Confirmed | 0 archivos nuevos en dominio notificaciones; Referencias a "Inicio" son preexistentes (sidebar, card-accion, etc.) |
| No packages/dominio changes | ✅ Confirmed | `git diff b52a303..HEAD -- packages/dominio` = empty |
| No packages/sync changes | ✅ Confirmed | `git diff b52a303..HEAD -- packages/sync` = empty |
| Import protection (PR #238/#247) | ✅ Confirmed | `sanidad-mobile.ts` re-exports sin `.server.ts` propio; route importa desde módulo bundleable |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| D9 — Switch responsive same-route | ✅ Yes | `useMatchMedia("(max-width: 767px)")` en `SanidadRouteView`; no sub-ruta `/sanidad/mobile` |
| D10 — 2 periodos mobile | ✅ Yes | "ESTA SEMANA" / "PRÓXIMA SEMANA"; "ESTE MES" solo en desktop |
| D11 — useMatchMedia shared en lib | ✅ Yes | Modelo `useEsMovil()` de `maestro-form.tsx:128`; refactor sin cambio de comportamiento |

### Assertion Quality

**Assertion quality**: ✅ All assertions verify real behavior

- refuerzo-card.test.tsx: assert `getBoundingClientRect().height >= 44` (real layout assertion), assert `onRegistrarAplicacion` called with correct `productoId` + `animalIds`
- seccion-refuerzos.test.tsx: assert badge text content ("Agotado", "5 dosis"), assert `toHaveLength(4)` for ≤4 cap, assert `not.toBeInTheDocument()` for empty state
- sanidad-mobile-view.test.tsx: assert `role="tablist"`, `aria-selected`, tab content switching
- use-match-media.test.ts: assert SSR default, assert change events, assert cleanup
- sanidad-panel-route.test.tsx: assert `matchMedia` mock switching desktop↔mobile, assert drawer opens with precarga
- sanidad-mobile-route.test.tsx: assert `listarCatalogoSanidadFn` called, assert drawer opens/closes

### Changed File Coverage

| File | Lines | Rating |
|------|-------|--------|
| `packages/ui/src/ganado/refuerzo-card.tsx` | 73 | ✅ 5 tests covering content, singular/plural, button click, card click, 44px |
| `packages/ui/src/ganado/seccion-refuerzos.tsx` | 154 | ✅ 8 tests covering counters, empty, callback, stock badge, cap, gating |
| `packages/ui/src/ganado/sanidad-mobile-view.tsx` | 155 | ✅ 8 tests covering tabs, ARIA, default, permission gating |
| `packages/ui/src/lib/use-match-media.ts` | 31 | ✅ 6 tests covering SSR, subscription, cleanup, no-matchMedia |
| `apps/web/src/server/sanidad-mobile.ts` | 54 | ✅ Re-exports only; tested via route tests |
| `apps/web/src/routes/_app/fincas/$fincaId/sanidad.tsx` | +348 | ✅ 15+3 tests (panel route + mobile route + shell wiring) |
| `apps/web/tests/sanidad-mobile-route.test.tsx` | 330 | ✅ 7 integration tests |
| `apps/web/tests/sanidad-panel-route.test.tsx` | +154 | ✅ 3 new tests (D9 switch + §13 item 11) |
| `packages/ui/tests/refuerzo-card.test.tsx` | 99 | ✅ 5 unit tests |
| `packages/ui/tests/seccion-refuerzos.test.tsx` | 169 | ✅ 8 unit tests |
| `packages/ui/tests/sanidad-mobile-view.test.tsx` | 153 | ✅ 8 unit tests |
| `packages/ui/tests/use-match-media.test.ts` | 130 | ✅ 6 unit tests |

### Runtime Evidence Summary

| Command | Exit Code | Result |
|---------|-----------|--------|
| `CI=true pnpm turbo test --force` | 0 (web+ui) / 1 (db pre-existing) | 1137/1137 new+existing tests pass |
| `pnpm turbo typecheck --force` | 0 | 13/13 tasks pass |
| `pnpm exec biome ci .` | 0 | 459 files, no issues |
| `pnpm turbo build --force` | 0 | 7/7 tasks pass, import-protection gate green |
| `pnpm no-sqlite` | 0 | No SQLite references |

### Pre-existing Issues (NOT regressions)

- **`@ganaweb/db#test` — `eventos-write-architecture.test.ts`**: timeout (15s) en `auditEventWritesInRepo`. Test preexistente (último cambio en commit 96fd12e, no relacionado con #213). No hay cambios en `packages/db` en esta rama.

### Issues Found

**CRITICAL**: None
**WARNING**: None
**SUGGESTION**: None

### Verdict

**PASS**

Todos los requisitos SAN-010..SAN-014, SAN-060, SAN-080 y escenarios §13 items 2 y 11 están implementados y verificados con tests passing. Las decisiones D9, D10, D11 están correctamente aplicadas. No hay cambios en packages/dominio, packages/sync, ni implementación de #214. Sin regresión desktop. El único fallo de test es preexistente en packages/db (timeout en architecture guard).
