# Archive Report: exportar-listado-animales

## Change Summary
- **Issue**: #111 — Exportar listado de animales (Excel/CSV/PDF) (CLOSED)
- **Epic**: #106 (approved) · depends on #107 (merged) · Req RF-ANIM-LIST v2.1 §9
- **Delivery**: commit `ae400c6` (PR #128, merged 2026-07-31)
- **Review slices**: #122–#127 (PR1–PR6 stacked, auto-chain)
- **Branch**: sdd/issue-111-* → master
- **Mode**: Online-only; strict TDD (RED → GREEN → REFACTOR)

## Lifecycle
| Phase | Status | Date |
|-------|--------|------|
| Exploration | ✅ Complete | 2026-07-30 |
| Proposal | ✅ Complete | 2026-07-30 |
| Spec | ✅ Complete (3 specs: export-server NEW, export-ui NEW, desktop-ui MODIFIED) | 2026-07-30 |
| Design | ✅ Complete | 2026-07-30 |
| Tasks | ✅ Complete (33 tasks, 6 work units / PR1–PR6) | 2026-07-30 |
| Apply PR1 | ✅ Port + `listarTodos` + `leerLimitesExportacion` + seed | 2026-07-31 |
| Apply PR2 | ✅ Exportadores (neutralizer + csv + xlsx + pdf + cols) | 2026-07-31 |
| Apply PR3 | ✅ Handler + route + contract | 2026-07-31 |
| Apply PR4 | ✅ UI primitives (dialog + toast) | 2026-07-31 |
| Apply PR5 | ✅ Dialog + download transport | 2026-07-31 |
| Apply PR6 | ✅ Desktop button activation + route wiring | 2026-07-31 |
| Verify | ✅ PASS WITH WARNINGS — 0 CRITICAL, 0 WARNING against the change | 2026-07-31 |
| PR Merge | ✅ #128 merged (delivery commit `ae400c6`) | 2026-07-31 |
| Archive | ✅ This report | 2026-07-31 |

## Evidence (sdd-verify)
- **Verdict**: PASS WITH WARNINGS — 0 CRITICAL, 0 WARNING findings against the change
- **Spec compliance**: 27/27 scenarios, 11/11 requirements implemented and proven
- **Tests**: 217 #111 export tests passing across 13 focused fresh (uncached) runs; 0 failures
- **Typecheck**: `pnpm turbo typecheck` exit 0 — 13/13 tasks successful
- **Lint**: `pnpm exec biome ci .` exit 0 — 7 warnings, all pre-existing in `animal-crud.tsx`, none in #111 files
- **TDD**: Strict RED→GREEN→REFACTOR; every production module has a covering test
- **Clean architecture**: dominio zero-dep, aplicacion format-free, exceljs/pdfkit server-only; no `dark:` variants introduced

## Capabilities Delivered
- `animal-listado-export-server` (NEW) — endpoint, full-set read model (`listarTodos`), XLSX/CSV/PDF generators, config-driven row-limit/413/timeout, CSV-injection neutralization + XLSX text-forcing, RBAC re-validation + finca isolation, sanitized error contract.
- `animal-listado-export-ui` (NEW) — export dialog (scope/format/PDF 36-col warning), fetch→blob→download transport, non-destructive error/retry contract (500 keeps the dialog and preserves filters/scope/format), visual RBAC gate.
- `animal-listado-desktop-ui` (MODIFIED) — the previously inert `Exportar` button is now active and opens the export dialog; rendering gate (LA-RBAC-03) unchanged; LA-RBAC-02 (`Nuevo animal`) and LA-091 (ficha navigation) preserved.

## Specs Promoted
- `openspec/specs/animal-listado-export-server/spec.md` (new — from change delta)
- `openspec/specs/animal-listado-export-ui/spec.md` (new — from change delta)
- `openspec/specs/animal-listado-desktop-ui/spec.md` (updated — `Exportar opens the export dialog` scenario added to Visual RBAC and Ficha Navigation; "#111 export excluded" non-goal retired)

## Known Follow-up
- The global `pnpm turbo test` exits 1 solely because of the **pre-existing `packages/ui/tests/date-picker.test.tsx` RN-002 month-boundary flake** (fails on the last day of any month; "tomorrow" falls into the next month's grid). No date-picker code was touched by #111; the failure is independent of this change and was recorded by sdd-verify as INFO / pre-existing, NOT a regression. Recommend a separate ticket to make the global suite green year-round.

## Out of Scope (delivered by future issues)
- #110: pagination controls, column selection, preferences
- Offline/async/streaming export, multi-sort, column reordering, `Lugar compra`
