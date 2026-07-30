# Tasks: Exportar listado de animales (Excel/CSV/PDF)

> Strict TDD per phase: RED → GREEN → REFACTOR. Tests ship WITH each work-unit commit.
> Honors: dominio zero-dep · aplicacion format-free · no hardcoded thresholds (`config_parametros_finca`) · online-only · es-CO copy / English identifiers · `pnpm turbo test` + `pnpm turbo typecheck` + `biome ci .`.
>
> **Scaffolding truth (verified):** aplicacion/db/web/ui vitest harnesses ALREADY exist (`vitest.config.ts` + tests/ in each). Design-gate "not yet scaffolded" + `config.yaml available:false` are STALE → no scaffold task; 1.1 is a baseline check.
> **Neutralizer placement:** design puts `neutralizar-celda.ts` in `web/server/exportadores/`; its test lives in `web/tests/` (aplicacion cannot import web — dependency rule).

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1640 (sum of task estimates) |
| 400-line budget risk | High (far above 400; above 1200 session budget) |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR2 → PR3 → PR4 → PR5 → PR6 |
| Delivery strategy | auto-chain |
| Chain strategy | pending (orchestrator resolves with user before apply) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

> Decision = Yes because total > 400 AND > 1200 session budget AND chain strategy is pending. Orchestrator must pick a chain strategy + authorize before apply (then STOP per user instruction).

### Suggested Work Units

| Unit | Goal | PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|----|----------------------|-----------------|-------------------|
| A+B+seed | Port + `listarTodos` + `leerLimitesExportacion` + seed | PR1 (~360) | `pnpm --filter @ganaweb/aplicacion test && pnpm --filter @ganaweb/db test` | N/A — no HTTP/UI surface; db integration test (`describe.skipIf(CI)`, Postgres) is the harness | Revert port+index export, `listarTodos`/`leerLimitesExportacion`, 2 `PARAMETROS` rows; inert without route |
| C | Exportadores (neutralizer+csv+xlsx+pdf+cols) | PR2 (~368) | `pnpm --filter @ganaweb/web test animal-exportacion` | N/A — pure functions; unit tests are the harness (no route yet) | Delete `apps/web/src/server/exportadores/`; no callers until PR3 |
| D | Handler + route + contract test | PR3 (~273) | `pnpm --filter @ganaweb/web test animal-exportacion-server-contract` | `curl -b <session> ".../api/fincas/{id}/animales/exportar?format=csv&scope=todas"` → 200 + attachment file; 403 no perm; 413 overflow | Delete `exportar.ts` + `animal-exportacion-http.ts`; list endpoint untouched |
| E1 | UI primitives dialog+toast | PR4 (~135) | `pnpm --filter @ganaweb/ui test` | N/A — presentational; exercised by dialog tests in PR5 (no standalone route) | Delete `primitives/{dialog,toast}.tsx`; no consumers until PR5 |
| E2 | Dialog + test + download transport | PR5 (~363) | `pnpm --filter @ganaweb/ui test animal-exportacion-dialog` | Dev server: Exportar → dialog → confirm → browser downloads; 500 → Reintentar keeps filters/scope/format | Revert `animal-exportacion-dialog.tsx` + route-adapter transport; button inert until PR6 |
| F | Desktop button activation + route wiring | PR6 (~140) | `pnpm --filter @ganaweb/web test animal-listado-route` | Dev server: Exportar active opens dialog (LA-RBAC-03); Nuevo animal (LA-RBAC-02) + keyboard ficha (LA-091) preserved | Revert desktop `onClick` + `animales.tsx` dialog mount → inert (pre-#111) |

## Phase 1: Foundation — aplicacion port (format-free, zero-dep) → PR1

| # | Task (files) | Satisfies | Proof (test) | ~Ln |
|---|--------------|-----------|--------------|-----|
| 1.1 [x] | Verify aplicacion harness baseline (pre-existing): `pnpm --filter @ganaweb/aplicacion test` green; no scaffold | design-gate WARNING | existing suite green | 0 |
| 1.2 [x] | RED `packages/aplicacion/tests/animal-exportacion-port.test.ts`: request/result shape, overflow when rows>maxFilas, forbidden reuse | LA-072, LA-RBAC-04/05 | tests fail (no port) | 70 |
| 1.3 [x] | GREEN create `packages/aplicacion/src/puertos/animal-exportacion-port.ts` (`AnimalExportacionRequest`, `AnimalExportacionReadPort`, `AnimalExportacionOverflowError`); export from `src/index.ts` | LA-070/071/072 | 1.2 passes | 45 |
| 1.4 [x] | REFACTOR typecheck+biome; `architecture-boundary.test.ts` green (dominio zero-dep, aplicacion format-free) | dependency rule | boundary test green | 5 |

## Phase 2: db read model + config reader + seed → PR1

| # | Task (files) | Satisfies | Proof (test) | ~Ln |
|---|--------------|-----------|--------------|-----|
| 2.1 [x] | RED `packages/db/tests/animal-exportacion-postgres.test.ts` (`describe.skipIf(CI)`, mirror `animal-listado-postgres.test.ts`): total=40→40 at pageSize=25; filter/order preserved; overflow>maxFilas; foreign finca forbidden | LA-071/072, LA-RBAC-04/05 | tests fail | 110 |
| 2.2 [x] | GREEN add `listarTodos` to `packages/db/src/animal-infrastructure.ts`: reuse `buildAnimalListadoPredicates`/`animalListadoJoins`/sort + identical authz CTE; `SELECT … LIMIT maxFilas+1`, no OFFSET; `mapAnimalListadoDbRow`; overflow→`AnimalExportacionOverflowError` | LA-071/072, LA-RBAC-04/05 | 2.1 passes | 70 |
| 2.3 [x] | RED+GREEN `leerLimitesExportacion(db, fincaId)` in `animal-infrastructure.ts`: read `export_max_filas`/`export_timeout_segundos` from `config_parametros_finca`, fail-safe 50000/30; test changed values respected (config-driven) | LA-072 | config-change test passes | 50 |
| 2.4 [x] | Seed: add `["export_max_filas","50000",…]`, `["export_timeout_segundos","30",…]` to `PARAMETROS` in `packages/db/src/seed/seed.ts` (per-finca, `ON CONFLICT DO NOTHING`) | LA-072 | seed idempotent; reader returns seeded values | 6 |
| 2.5 [x] | REFACTOR typecheck+biome db | — | green | 3 |

## Phase 3: web exportadores (generators + neutralizer) → PR2

| # | Task (files) | Satisfies | Proof (test) | ~Ln |
|---|--------------|-----------|--------------|-----|
| 3.1 [x] | RED `apps/web/tests/animal-exportacion-neutralizar.test.ts`: `=CMD()`,`+`,`-`,`@`,`\t`,`\r` neutralized; safe values unchanged; all grammars | LA-073 | tests fail | 50 |
| 3.2 [x] | GREEN create `apps/web/src/server/exportadores/neutralizar-celda.ts` (`PREFIJOS`, prefix→`'`-prefix) | LA-073 | 3.1 passes | 15 |
| 3.3 [x] | RED+GREEN `exportadores/csv.ts` `generarCsv(filas,columnas)`: RFC 4180 quoting + `neutralizarCelda` | LA-070/073 | `=CMD()` quoted+neutralized | 70 |
| 3.4 | RED+GREEN `exportadores/xlsx.ts` `generarXlsx` (exceljs; `cell.numFmt="@"` on neutralized string; sheet `Animales`); add `exceljs` dep (server-only) | LA-070/073 | `=CMD()` stored as text | 80 |
| 3.5 | RED+GREEN `exportadores/pdf.ts` `generarPdf` (pdfkit `A4 landscape`, fixed-width 36-col, neutralized text); add `pdfkit` dep | LA-070/074 | renders neutralized text → `Uint8Array` | 90 |
| 3.6 | RED+GREEN `exportadores/index.ts`: `generarXlsx|Csv|Pdf` barrel + scope/col resolution (`todas`→36 canonical, `vista`→`normalizeCols` effective, `Lugar compra` excluded) | LA-071 | 36 cols / vista cols tests | 60 |
| 3.7 | REFACTOR typecheck+biome web exportadores | — | green | 3 |

## Phase 4: web handler + route + contract → PR3

| # | Task (files) | Satisfies | Proof (test) | ~Ln |
|---|--------------|-----------|--------------|-----|
| 4.1 | RED `apps/web/tests/animal-exportacion-server-contract.test.ts` (mirror `animal-list-server-contract.test.ts`): 400 `campo`; 403 no data; 413 overflow; 500 sanitized+`requestId` no driver/stack; timeout signal; `Content-Type`+`Content-Disposition: attachment` | LA-040/041/043/072, LA-RBAC-04/05 | tests fail | 120 |
| 4.2 | GREEN create `apps/web/src/server/animal-exportacion-http.ts` `createAnimalExportacionHttpHandler(deps)`: `parseAnimalListadoQuery`+format/scope→400 `campo`; `getUsuarioId` null/forbidden→403; `leerLimitesExportacion`; `AbortSignal(timeoutSegundos)`; `port.exportar`; overflow→413; abort→timeout 500; catch→sanitized 500; success headers + filename `animales_{vista|todas}_{yyyyMMdd-HHmmss}.{ext}` | LA-040/041/043/070/072 | 4.1 passes | 110 |
| 4.3 | GREEN create route `apps/web/src/routes/api/fincas/$fincaId/animales/exportar.ts` (mirror `animales.ts`; wire deps) | LA-070 | contract via route | 40 |
| 4.4 | REFACTOR typecheck+biome web | — | green | 3 |

## Phase 5: UI primitives → PR4

| # | Task (files) | Satisfies | Proof (test) | ~Ln |
|---|--------------|-----------|--------------|-----|
| 5.1 | Create `packages/ui/src/primitives/dialog.tsx` (shadcn-style from `alert-dialog.tsx`, `@radix-ui/react-dialog` already dep); no `dark:` variants | LA-074 | render test | 70 |
| 5.2 | Create `packages/ui/src/primitives/toast.tsx` (shadcn-style) | LA-040/041/072 | render test | 60 |
| 5.3 | REFACTOR typecheck+biome ui | — | green | 5 |

## Phase 6: dialog + transport → PR5

| # | Task (files) | Satisfies | Proof (test) | ~Ln |
|---|--------------|-----------|--------------|-----|
| 6.1 | RED `packages/ui/tests/animal-exportacion-dialog.test.tsx`: scope (`Vista actual`/`Todas`) + format (XLSX/CSV/PDF); PDF 36-col warn (continue/switch Excel); 400/403/413/timeout states; 500 Reintentar preserves filters/scope/format | LA-071/074/076/040/041/072 | tests fail | 130 |
| 6.2 | GREEN create `packages/ui/src/ganado/animal-exportacion-dialog.tsx`: scope/format select, PDF warn, error/Retry; EXACT design copy (403 "No tienes permiso para exportar en esta finca."; 413/timeout/500/success/PDF per design) | LA-071/074/076 | 6.1 passes | 150 |
| 6.3 | RED+GREEN export transport in `apps/web/src/features/animal-listado/animal-listado-route-adapter.ts`: fetch→blob→download (no inline/nav); error mapping 400/403/413/timeout/500 | LA-070/076 | transport tests | 80 |
| 6.4 | REFACTOR typecheck+biome ui+web | — | green | 3 |

## Phase 7: wiring + desktop button → PR6

| # | Task (files) | Satisfies | Proof (test) | ~Ln |
|---|--------------|-----------|--------------|-----|
| 7.1 | RED+GREEN `packages/ui/src/ganado/animal-listado-desktop.tsx`: add `onExportar` prop, Exportar `Button onClick` opens dialog; **PRESERVE** LA-RBAC-02 (`Nuevo animal` `canCreate` gate) + LA-091 (row click/Enter → ficha); `canExport` gate unchanged | LA-RBAC-02/03, LA-091 | desktop test: Exportar active; gates intact | 40 |
| 7.2 | Modify `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx`: mount dialog, pass transport + `canExport` | LA-RBAC-03, LA-070 | route renders dialog | 40 |
| 7.3 | RED web route integration test (extend `animal-listado-route-integration.test.tsx` pattern): Exportar opens dialog; confirm triggers download | LA-070/074 | integration test | 60 |

## Phase 8: Verification (final)

- [ ] 8.1 `pnpm turbo test` green (all packages)
- [ ] 8.2 `pnpm turbo typecheck` green
- [ ] 8.3 `biome ci .` green
- [ ] 8.4 Confirm success criteria: total=40→40 rows; `=CMD()` not executable (CSV/XLSX); `Todas`=36 cols / `Vista` respects cols; PDF warn allows continue; >50k→413; 30s→timeout; 500 Retry preserves filters/scope/format; Exportar hidden without both perms + server re-validates + finca isolation
