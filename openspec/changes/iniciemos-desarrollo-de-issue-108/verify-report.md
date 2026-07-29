```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:7c02bdf82de91e770d02d0b680491fb6f357be29cdf579cb1e9504554c70d038
verdict: pass
blockers: 0
critical_findings: 0
requirements: 4/4
scenarios: 9/9
test_command: pnpm turbo test
test_exit_code: 0
test_output_hash: sha256:4aee0c0df326fb9fc72d1812ed852c963e3c0dc3b78caa5ea0472dbb9b12d813
build_command: pnpm turbo typecheck
build_exit_code: 0
build_output_hash: sha256:3fd9cc5e9728123e50866ebc683e4994157abce72e025491d3fa47e821220f9d
```

## Verification Report

**Change**: iniciemos-desarrollo-de-issue-108
**Version**: RF-ANIM-LIST v2.1 (capability `animal-listado-desktop-ui`)
**Mode**: Strict TDD

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 19 |
| Tasks complete | 19 |
| Tasks incomplete | 0 |

All 19 tasks (1.1–1.7, 2.1–2.7, 3.1–3.3, 4.1–4.2) are checked `[x]` in `tasks.md` on disk.

### Build & Tests Execution
**Build (typecheck)**: ✅ Passed
```text
$ pnpm turbo typecheck   (exit 0)
Tasks: 13 successful, 13 total — all packages tsc --noEmit clean (web runs tsr generate && tsc --noEmit).
```

**Tests**: ✅ 654 passed / 0 failed / 3 skipped
```text
$ pnpm turbo test   (exit 0)
@ganaweb/db          73 passed | 3 skipped (76)
@ganaweb/aplicacion  72 passed
@ganaweb/dominio     26 passed
@ganaweb/sync         0 (no test files)
@ganaweb/ui         441 passed (15 files) — incl. animal-ui.test.tsx 89 tests
@ganaweb/web         42 passed (3 files)  — animal-listado-route.test.tsx 32,
                                            animal-listado-route-integration.test.tsx 9,
                                            animal-create-e2e.test.tsx 1
#108-specific tests: 70 (32 unit + 9 integration + 29 UI) — all passing.
```

**Lint (biome check .)**: ✅ exit 0 — 0 errors, 7 warnings, ALL 7 in `packages/ui/src/ganado/animal-crud.tsx` (legacy CRUD form, NOT a #108-changed file). Zero warnings on any #108 file.

**Dependency-cruiser**: ✅ exit 0 — 0 errors, 106 warnings (all pre-existing `not-in-allowed` warning class). #108's new edges (route→features, route→server, tests→src, server→server) follow established warning classes; no new error-class violations.

**Coverage**: ➖ Not available — no coverage tool configured/run in the vitest configs (informational, non-blocking).

### Spec Compliance Matrix
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Canonical Online Table Contract | Canonical response renders | `animal-listado-route.test.tsx > exposes the canonical 29 default columns…` / `presents null fields safely…`; `animal-ui.test.tsx > 2.1 renders the 29 canonical Spanish headers…` / `presents null cells as '-'…`; `animal-listado-route-integration.test.tsx > renders the desktop table from the #107 response end to end` | ✅ COMPLIANT |
| Canonical Online Table Contract | Optional field awareness | `animal-listado-route.test.tsx > recognizes the seven optional columns as hidden by default`; `animal-ui.test.tsx > 2.2 renders recognized optional columns when the model supplies them` | ✅ COMPLIANT |
| Data and Failure States | Invalid query preserves data | `animal-listado-route.test.tsx > 400 sanitization` (4 tests: retain model/strip filter/reset page/toast, page-as-campo, non-paginating campo, null campo); `animal-listado-route-integration.test.tsx > 400 retains the last table, sanitizes the URL, and announces the correction` | ✅ COMPLIANT |
| Data and Failure States | Empty and retriable states | `animal-ui.test.tsx > 2.4` (finca-empty `totalSinFiltro=0`, no-results `total=0`, 500/timeout `Reintentar`); `animal-listado-route-integration.test.tsx > 500 offers Reintentar and the retry reaches the table` / `a network timeout surfaces the retriable error…` | ✅ COMPLIANT |
| Data and Failure States | No-results filter integration boundary | `animal-ui.test.tsx > 2.4 no-results renders the supplied 'Limpiar filtros' slot without owning it` (slot rendered when supplied, absent otherwise; no owned behavior) | ✅ COMPLIANT |
| Visual RBAC and Ficha Navigation | Permission-gated actions | `animal-listado-route.test.tsx > Visual permission projection — fail closed` (8 tests); `animal-ui.test.tsx > 2.5` (4 tests); `animal-listado-route-integration.test.tsx > projection flags gate Nuevo animal / Exportar and the table stays usable` | ✅ COMPLIANT |
| Visual RBAC and Ficha Navigation | Keyboard row navigation | `animal-ui.test.tsx > 2.3 navigates on Enter when a visible row has focus` / `does not navigate when the click originates inside an embedded control`; `animal-listado-route-integration.test.tsx > row click and Enter open that row's ficha through the navigation spies` | ✅ COMPLIANT |
| Dense Accessible Token-Themed Layout | Scroll retains context | `animal-ui.test.tsx > 2.6 keeps the header sticky on vertical scroll` / `freezes Código and Nombre during horizontal scroll, and only those` / `keeps the focused row visibly focusable via keyboard traversal` | ✅ COMPLIANT |
| Dense Accessible Token-Themed Layout | Theme and assistive technology support | `animal-ui.test.tsx > 2.6 renders identical semantics with live announcements across the ten appearances, with zero dark: variants` (5 estilos × claro/oscuro sweep); `2.1 marks only the sorted column with aria-sort…` / `announces the visible result count through an aria-live status region` | ✅ COMPLIANT |

**Compliance summary**: 9/9 scenarios compliant; 4/4 requirements implemented.

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Canonical 29/36 contract | ✅ Implemented | `animal-listado-route-adapter.ts`: registry built from #107 `ANIMAL_LIST_COLUMNS` (36), `visibleByDefault` for first 29; `formatearCeldaListado` null-safe (`-` scalars / `Sin registrar` catalogs, never `null`/0); mapping derives from `columnId`/`responseKey`, never labels. `Lugar compra` not recognized (test-verified). |
| Data/failure states | ✅ Implemented | `AnimalListadoDesktop` `estado` machine (cargando/listo/sin-acceso/error); loading retains 29 headers + `h-10` skeletons + `aria-busy`; finca-empty `totalSinFiltro===0`; no-results `total===0`; 403 clears data + safe return; 500/timeout `Reintentar`. `cargarListadoDesktop` maps 200/400/403/500/network/timeout/non-JSON onto the machine; never a false 403, never a silent empty table. |
| 400 sanitization (LA-040–043) | ✅ Implemented | `sanitizarListadoBadRequest`: retains last model (same ref), strips reported `campo`, resets page for page/pageSize/sort/`f.*`, emits toast payload; original query not mutated. Route view re-runs effect on sanitized URL. |
| Visual RBAC | ✅ Implemented | `animal-listado-permissions.server.ts`: `canCreate = animales:crear`, `canExport = animales:ver && reportes:exportar`, global `*:*` grants both; fail-closed on denial/other-finca/throw. `Nuevo animal`/`Exportar` presence-gated; `Exportar` inert (no onClick). Server enforcement untouched. |
| Ficha navigation (LA-080–091) | ✅ Implemented | Row `tabIndex=0`; click/Enter outside a control → `onAbrirFicha(fila.id)`; `esEventoDesdeControl` guard via `closest(SELECTOR_CONTROLES)`. Route maps to TanStack `navigate`. |
| Dense accessible layout | ✅ Implemented | Sticky header (`position:sticky;top:0`), frozen `Código`(left:0)/`Nombre`(left:120px) only, `h-10` (40px) rows/skeletons, `scope="col"`, `aria-sort`, `<output role=status>` live region, `focus-visible:ring-ring`. |
| Token-only theming (T-004) | ✅ Implemented | 0 `dark:` utilities in `animal-listado-desktop.tsx` (grep-verified); ten-appearance render sweep asserts identical semantics + zero `dark:`. |
| Non-goals (#109–#111) | ✅ Respected | No filter controls / general filter URL mutation (only LA-040 branch); no pagination/selector/preferences; `Exportar` inert (no dialog/download); #107 http/contract/api-route untouched (absent from diff); mobile branch unchanged (`AnimalListMobile`); `Lugar compra` never renders. |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| DTO boundary — typed adapter from `AnimalListadoResponseDto` + `ANIMAL_LIST_COLUMNS`, no label mapping, no ui→web dep | ✅ Yes | Component consumes structural prop types; depcruise shows no `packages/ui → apps/web` edge. |
| Permission source — read-only projection + server fn | ✅ Yes | `animal-listado-permissions.server.ts` + `getAnimalListadoVisualPermissionsAction` (`createServerFn` GET, dynamic import). |
| RBAC semantics — visual-only, fail-closed, never authorizes | ✅ Yes | Projection hides actions only; server enforcement unchanged; fail-closed verified by tests. |
| UI shape — add `AnimalListadoDesktop`, retain `AnimalDesktopScreen` rollback, mobile unchanged | ✅ Yes | Mobile uses `AnimalListMobile`; rollback = revert route to legacy surface (documented). |
| Data flow — #107 GET in loader | ⚠️ Deviation (documented) | #107 fetch runs in the exported `AnimalsListRouteView` client effect, not the loader, because LA-040–043 (retain last model / strip params / announce) is client-stateful by contract. Loader keeps projection + legacy mobile exactly as designed. Documented in tasks.md 3.2, design.md note, apply-progress, and the route header. Does not break any spec scenario. |

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | "TDD Cycle Evidence" table present in apply-progress (PR 1/2/3). |
| All tasks have tests | ✅ | 19/19 tasks; code tasks map to 3 test files (route unit, route integration, UI). |
| RED confirmed (tests exist) | ✅ | All 3 test files exist on disk and were created/extended by this change (diff-verified). |
| GREEN confirmed (tests pass) | ✅ | 70 #108 tests pass on fresh execution (32 unit + 9 integration + 29 UI); full suite 654 passed. |
| Triangulation adequate | ✅ | Multiple cases per behavior with varying expected values (e.g. 400 sanitization 4 cases; projection 8 combos; #107 outcomes 200/400/403/500/network/timeout/non-JSON/unparseable). |
| Safety Net for modified files | ✅ | `animal-ui.test.tsx` modified with pre-existing suite green (441/441); route unit safety net 21/21 stayed green during PR3 RED. |

**TDD Compliance**: 6/6 checks passed.

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 32 | 1 (`animal-listado-route.test.tsx`, node env) | vitest |
| Integration | 38 | 2 (`animal-listado-route-integration.test.tsx` 9 jsdom; `animal-ui.test.tsx` #108 block 29 jsdom) | vitest + jsdom + @testing-library/react + userEvent |
| E2E | 0 | 0 | playwright present in repo; #108 visual runtime deferred to human via manual-qa-contrast-matrix.md |
| **Total** | **70** | **3** | |

### Changed File Coverage
Coverage analysis skipped — no coverage tool detected/configured (informational, non-blocking).

### Assertion Quality
| File | Line | Assertion | Issue | Severity |
|------|------|-----------|-------|----------|
| `packages/ui/tests/animal-ui.test.tsx` | 1972, 2233 | `expect(skeleton/fila).toHaveClass("h-10")` | CSS-class proxy for the 36–40 px band — jsdom cannot compute layout height; documented carve-out (cf. CA-UI-006), combined with behavioral assertions | WARNING |
| `packages/ui/tests/animal-ui.test.tsx` | 2249 | `expect(filaLuna.className).toContain("focus-visible:ring-ring")` | CSS-class proxy for visible focus ring — jsdom cannot compute computed style; documented carve-out | WARNING |

**Assertion quality**: 0 CRITICAL, 2 WARNING. No tautologies, no ghost loops (all loops iterate guaranteed-non-empty registries: 36-column registry, 29 canonical headers, fixed 5×2 appearance matrix), no smoke-only tests, no assertion-free production calls. Mock/assertion ratio healthy (unit: 0 mocks; integration: 1 inert facade mock + fetch seam, assertions far outnumber mocks). Sticky positions are verified via inline `style.position`/`style.left` (legitimate, not class-based).

### Quality Metrics
**Linter**: ✅ No errors on #108 files (7 repo warnings all in untouched legacy `animal-crud.tsx`)
**Type Checker**: ✅ No errors (turbo typecheck exit 0, all 13 tasks)

### Issues Found
**CRITICAL**: None

**WARNING**:
1. Design data-flow deviation (documented): #107 fetch runs in the route view client effect rather than the loader. Justified (LA-040–043 is client-stateful) and documented in tasks.md/design.md/route header; no spec scenario broken. Non-blocking.
2. CSS-class proxy assertions for the 36–40 px row/skeleton height (`h-10`) and visible focus ring (`focus-visible:ring-ring`) — jsdom layout carve-out, documented; sticky offsets are verified via inline style. Informational, non-blocking.
3. Manual QA contrast matrix (`manual-qa-contrast-matrix.md`) is human-executed and UNSIGNED — must be executed before PR approval (automated visual runners unavailable per `openspec/config.yaml`). Automated guards (ten-appearance render sweep + T-004 zero-`dark:` scanner) cover the automatable portion.
4. The LA-040 "toast" is surfaced as a persistent `<output role=status>` live region under the table rather than a transient toast component, because no toast infrastructure exists in the repo. The announcement behavior is fully implemented and tested; the wording deviation is presentation-only.

**SUGGESTION**:
1. When a toast/notification system is introduced repo-wide, migrate the LA-040 correction announcement from the inline `<output>` to it for consistency with future surfaces.
2. Consider a real-browser (Playwright) visual regression for sticky/frozen columns and computed 36–40 px row height to complement the jsdom inline-style/class proxies, once the manual QA matrix is signed.
3. Epic #106 still lacks the `status:approved` label — PR opening/merge is gated on it (dependency gate, not an implementation defect).

### Verdict
PASS WITH WARNINGS
All 4 requirements / 9 scenarios are COMPLIANT with passing runtime tests; full suite (654), typecheck, lint, and dependency-cruiser are green for the changed files; all 19 tasks complete; non-goals (#109–#111, `Lugar compra`, offline, #107 surface) respected. Remaining items are documented deviations and process gates, none blocking acceptance of the implementation.
