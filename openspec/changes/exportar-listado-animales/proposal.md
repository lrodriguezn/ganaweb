# Proposal: Exportar listado de animales (Excel/CSV/PDF)

Linked: GitHub #111 (approved · high) · Epic #106 · depends on #107 (merged) · Req RF-ANIM-LIST v2.1 §9. **Online-only.**

## Intent

The #108 desktop list renders an `Exportar` button that is **inert** (verified: `BarraAcciones` has no `onClick`). Farm admins must take the *full filtered* inventory — not one page — into Excel/CSV/PDF for audits, sales, and field work. This delivers server-side export with RBAC, finca isolation, operational limits, and spreadsheet-injection protection.

## Scope

### In Scope
- `GET /api/fincas/{fincaId}/animales/exportar?format=xlsx|csv|pdf&scope=vista|todas&cols=...` generating the full filtered set with the same filters + order.
- `Vista actual`→`cols`; `Todas`→36 columns. XLSX/CSV/PDF generators with injection neutralization + XLSX text-forcing.
- Row limit + timeout as config; 413 / timeout signaling.
- Export dialog (scope/format/PDF warning), download transport, 400/403/413/500/timeout UX with Retry preserving filters/scope/format.
- New `dialog` + `toast` UI primitives.

### Out of Scope (non-goals)
- #109 filter/search controls and #110 pagination/column-selector/preferences UI — export only *consumes* their URL params (already parsed by #107).
- Offline export, async/job export, streaming cursors, multi-sort, column reordering, `Lugar compra`.

## Capabilities

### New
- `animal-listado-export-server`: endpoint, `AnimalExportacionReadPort`, full-set read model (`listarTodos`, `LIMIT export_max_filas+1`), format generators, row-limit/413/timeout, CSV-injection neutralization, XLSX text-forcing, RBAC re-validation + finca isolation.
- `animal-listado-export-ui`: export dialog (scope/format/PDF 36-col warning), fetch→blob→download transport, error/UX contract, Retry preserving filters/scope/format.

### Modified
- `animal-listado-desktop-ui`: the inert `Exportar` button becomes active (opens dialog); retires the "#111 excluded" non-goal. Rendering gate (LA-RBAC-03) unchanged.

## Approach

**Server-side in-memory generation (exploration Approach 1).** Reuse `parseAnimalListadoQuery`, `buildAnimalListadoPredicates`, `animalListadoJoins`, sort, and the fail-closed authz CTE from `DrizzleAnimalListadoReadModel.listar`; add `listarTodos` (no pagination, overflow detect → 413). `exceljs` (XLSX), hand-rolled RFC 4180 CSV, `pdfkit` (PDF). The new `AnimalExportacionReadPort` keeps `aplicacion` format-free; generators live in `apps/web/src/server/exportadores/`. Handler mirrors `animal-list-http.ts`: parse → authorize → generate → stream.
**Rejected:** streaming cursors (premature — 50k is a safety net, most farms <5k); client-side generation (violates LA-070 "se generan en servidor").

## Dependencies & Impact
- Server deps: `exceljs` (~1MB, server-only), `pdfkit` (text-only, no native canvas). **Zero client-bundle impact.**
- New UI primitives `dialog.tsx` / `toast.tsx` (shadcn-style; `alert-dialog` is the reference).
- Config seed: `export_max_filas=50000`, `export_timeout_segundos=30` in `config_parametros_finca` (no hardcoded thresholds).

## Security & Limits
- Enforce `animales:ver` + `reportes:exportar` and per-finca isolation **in server** (LA-RBAC-04/05, LA-075); the visual gate is presentation only.
- CSV: prefix cells starting `= + - @ \t \r` with `'` (LA-073). XLSX: force text (`numFmt '@'`). >50k rows → 413; 30s → timeout message (LA-072).

## Error / UX Contract
| Status | Behavior |
|---|---|
| 400 | Sanitize params, keep last valid table, toast (LA-040) |
| 403 | Access denied, no data (LA-041) |
| 413 | "Afina los filtros" (LA-072) |
| timeout | Specific message (LA-072) |
| 500 | Keep dialog open, non-destructive message, Retry preserves filters/scope/format (LA-076) |
| PDF 36-col | Warn + recommend Excel, allow continue (LA-074) |

## Assumptions (auto mode — please correct)
- **Problem/value:** offline inventory for audits/sales/field work; full-set export (not the page) is the core need.
- **Users:** admins holding both permissions; viewers without `reportes:exportar` never see Exportar.
- **Rules:** limits are per-finca config; injection protection is mandatory and exhaustive across all filter grammars.
- **Outcome:** the download matches on-screen filters/order exactly — `total=40 → 40 rows` even at `pageSize=25`.
- **Boundaries:** online-only; reuse #107 grammar; do not build #109/#110 controls.
- **Tradeoff:** in-memory buffers (~100–200MB at 50k×36 XLSX) accepted; streaming is the documented escape hatch. Filename/sheet naming and exact toast copy are decided in spec/design.

## Affected Areas
| Area | Impact |
|---|---|
| `apps/web/src/routes/api/fincas/$fincaId/animales/exportar.ts` | New endpoint |
| `apps/web/src/server/animal-exportacion-http.ts` | New handler |
| `apps/web/src/server/exportadores/` | New XLSX/CSV/PDF generators |
| `packages/aplicacion/src/puertos/animal-exportacion-port.ts` | New port |
| `packages/db/src/animal-infrastructure.ts` | Add `listarTodos` |
| `packages/ui/src/ganado/animal-exportacion-dialog.tsx` | New dialog |
| `packages/ui/src/primitives/{dialog,toast}.tsx` | New primitives |
| `apps/web/src/features/animal-listado/animal-listado-route-adapter.ts` | Export transport + error mapping |
| `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` | Wire button → dialog |
| `config_parametros_finca` seed | Add 2 params |

## Risks
| Risk | Sev | Mitigation |
|---|---|---|
| CSV injection not exhaustive | High | Test `=CMD()`,`+`,`-`,`@`,`\t`,`\r` across all grammars |
| 50k×36 timeout/memory on VPS | Med | Config limits; clear 413/timeout; streaming escape hatch |
| Missing dialog/toast primitives | Med | Build shadcn-style from `alert-dialog` reference |
| `exceljs` server bundle +1MB | Low | Server-only; acceptable on VPS |

**Open:** filename/sheet convention; toast wording; `scope=vista` with empty `cols` (assumption: normalized effective cols from #107).

## Rollback Plan
Additive behind a permission-gated button. Revert the export route + handlers + dialog wiring; the list endpoint and inert button remain. Config params are inert without the endpoint; drop the 2 seeded rows. No schema migrations.

## Success Criteria
- [ ] `total=40` → 40 rows exported at `pageSize=25` (LA-071).
- [ ] `=CMD()` not executable in CSV/XLSX (LA-073).
- [ ] `Todas` = exactly 36 cols; `Vista actual` respects normalized `cols` (LA-071).
- [ ] PDF 36-col warning allows continue / switch to Excel (LA-074).
- [ ] >50k rows → 413 "afina filtros"; 30s → timeout message (LA-072).
- [ ] Automated 500 test: message + Retry preserving filters/scope/format (LA-076).
- [ ] 400/403/timeout tests pass (LA-040/041/072).
- [ ] Exportar hidden without both permissions; server re-validates + finca isolation (LA-RBAC-03/04/05, LA-075).
- [ ] `pnpm turbo test`, `pnpm turbo typecheck`, `biome ci .` green.

Rule citations: LA-070–076, LA-RBAC-03/04/05, LA-040–043; PE-001–003.
