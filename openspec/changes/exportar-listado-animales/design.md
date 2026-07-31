# Design: Exportar listado de animales (Excel/CSV/PDF)

Answers `proposal.md`. Online-only, server-side in-memory generation (Approach 1). Reuses the #107 query stack; adds a full-set read model, three format generators, an export dialog, and config-driven limits.

## Technical Approach & Data Flow

    Dialog (ui) ─fetch+blob─▶ exportar.ts ─▶ animal-exportacion-http.ts
        │                       parseAnimalListadoQuery + format/scope
        │                       authorize (reuse fail-closed authz CTE)
        ▼                       resolve limits · AbortSignal(timeoutSegundos)
    download ◀─ binary stream ─ exportadores/{xlsx,csv,pdf} ◀─ AnimalExportacionReadPort.exportar
                                                            └─ listarTodos (db)

Boundaries: `dominio` untouched (zero deps); `aplicacion` adds the format-free port; `db` adds `listarTodos` + config reader; `web` owns parsing/handler/generators/transport; `ui` owns dialog + primitives.

## Architecture Decisions

| Decision | Options | Choice & why |
|---|---|---|
| Generation site | server in-memory · streaming · client | Server in-memory — streaming premature (50k is a net); client violates LA-070 |
| Port shape | format-aware · format-free | Format-free returning rows — keeps format deps out of `aplicacion` |
| Limit source | hardcode · read in read model · resolve+inject | Handler reads config, injects `maxFilas`; signal uses `timeoutSegundos` — keeps port unit-testable, no hardcode |
| Overflow detect | COUNT then fetch · LIMIT n+1 | `LIMIT maxFilas+1`, overflow if rows>n — one bounded query |
| CSV lib | csv-stringify · hand-rolled | Hand-rolled RFC 4180 + shared neutralizer — ~30 lines, no dep |
| LA-RBAC-03 owner | gate in dialog · in button · shared flag | Single owner: `canExport` projection, consumed once in `BarraAcciones` (spec flagged duplication) |

## Interfaces / Contracts

`packages/aplicacion/src/puertos/animal-exportacion-port.ts` (format-free):

```ts
export interface AnimalExportacionRequest {
  readonly usuarioId: string; readonly fincaId: string
  readonly sort: `${string}:${"asc" | "desc"}`; readonly q: string | null
  readonly filters: readonly AnimalListadoReadFilter[]
  readonly columnas: readonly string[] // effective columnIds, canonical order
  readonly maxFilas: number            // resolved from config; LIMIT n+1
}
export interface AnimalExportacionReadPort {
  exportar(r: AnimalExportacionRequest): Promise<readonly AnimalListadoRow[]>
}
```

Throws `AnimalExportacionOverflowError` (rows > maxFilas); reuses `AnimalListadoForbiddenError`. Generators in `web/server/exportadores/`: `generarXlsx|generarCsv|generarPdf(filas, columnas): Promise<Uint8Array>`. PDF is landscape (pdfkit `size: 'A4', layout: 'landscape'`) with fixed-width 36-column layout; XLSX via exceljs; CSV hand-rolled.

Shared neutralizer — `web/server/exportadores/neutralizar-celda.ts` (isolated, unit-testable):

```ts
const PREFIJOS = ["=", "+", "-", "@", "\t", "\r"]
export function neutralizarCelda(v: string): string {
  return PREFIJOS.some((p) => v.startsWith(p)) ? `'${v}` : v
}
```

CSV applies `neutralizarCelda` + RFC 4180 quoting; XLSX sets `cell.numFmt = "@"` on the neutralized string; PDF renders neutralized text.

`listarTodos` (db): reuses `buildAnimalListadoPredicates`, `animalListadoJoins`, sort mapping, and the identical `authz` CTE; `SELECT … LIMIT maxFilas+1`, no OFFSET, maps via `mapAnimalListadoDbRow`. `leerLimitesExportacion(db, fincaId)` reads `export_max_filas`/`export_timeout_segundos` from `config_parametros_finca` (fail-safe 50000/30) — first runtime reader of this table.

Handler `animal-exportacion-http.ts` mirrors `animal-list-http.ts`: `parseAnimalListadoQuery` + `format`/`scope` validation → 400 with `campo`; `getUsuarioId` null/forbidden → 403 no data; overflow → 413; abort → timeout 500; catch → sanitized 500 `ApiErrorDto` + `requestId`, no driver/stack (LA-043). Success sets `Content-Type` + `Content-Disposition: attachment`.

## Resolved Open Questions

- **Filename/sheet**: server sets `Content-Disposition: attachment; filename="animales_{vista|todas}_{yyyyMMdd-HHmmss}.{xlsx|csv|pdf}"`; XLSX sheet `Animales`.
- **Toast copy**: 403 "No tienes permiso para exportar en esta finca."; 413 "Demasiados resultados — Afina los filtros para reducir los animales."; timeout "La exportación tardó demasiado — Reduce los filtros o el alcance."; 500 "No se pudo exportar — Ocurrió un error al generar el archivo." + `Reintentar`; success "Exportación lista — El archivo se descargó correctamente."; PDF warn "El PDF con 36 columnas puede ser difícil de leer. Te recomendamos Excel.".
- **scope=vista empty cols**: effective cols = `normalizeCols(cols)` if non-empty, else the canonical 29 defaults (LA-032 fail-safe, as `resolverColumnasListado`). `scope=todas` ignores `cols`, emits all 36. `Lugar compra` never appears.

## File Changes

| File | Action | Description |
|---|---|---|
| `aplicacion/src/puertos/animal-exportacion-port.ts` | Create | Port, request/result, overflow error |
| `db/src/animal-infrastructure.ts` | Modify | `listarTodos` + `leerLimitesExportacion` |
| `web/src/server/animal-exportacion-http.ts` | Create | parse→authorize→generate→stream |
| `web/src/server/exportadores/{index,neutralizar-celda,xlsx,csv,pdf}.ts` | Create | Generators + shared neutralizer |
| `web/src/routes/api/fincas/$fincaId/animales/exportar.ts` | Create | Route (mirrors `animales.ts`) |
| `ui/src/primitives/{dialog,toast}.tsx` | Create | shadcn-style from `alert-dialog` |
| `ui/src/ganado/animal-exportacion-dialog.tsx` | Create | Scope/format, PDF warn, error/Retry |
| `ui/src/ganado/animal-listado-desktop.tsx` | Modify | `BarraAcciones` Exportar opens dialog |
| `web/src/features/animal-listado/animal-listado-route-adapter.ts` | Modify | Export transport + error mapping |
| `web/src/routes/_app/fincas/$fincaId/animales.tsx` | Modify | Wire button→dialog, pass transport |
| `db/src/seed/seed.ts` | Modify | Add `export_max_filas=50000`, `export_timeout_segundos=30` to `PARAMETROS` |

## Permissions

Server re-validates `animales:ver` + `reportes:exportar` + finca membership via the authz CTE (fail-closed). **Single owner of LA-RBAC-03 visual gate**: the `canExport` projection in `animal-listado-permissions.server.ts`, consumed once in `BarraAcciones` (renders `Exportar` iff `canExport`). The dialog never recomputes it; server authorization stays authoritative.

## Testing Strategy

| Layer | What | Where (reference) |
|---|---|---|
| dominio/aplicacion | neutralizer (`=CMD()`,`+`,`-`,`@`,`\t`,`\r`); port overflow/forbidden | `aplicacion/tests/animal-exportacion-port.test.ts` (scaffold vitest — not yet scaffolded) |
| db integration | `listarTodos` overflow, finca isolation, filter/order | `db/tests/animal-exportacion-postgres.test.ts` (`animal-listado-postgres.test.ts`; `describe.skipIf(CI)`) |
| web contract | 400 `campo`, 403 no data, 413, 500 sanitized, timeout | `web/tests/animal-exportacion-server-contract.test.ts` (`animal-list-server-contract.test.ts`) |
| ui | scope/format, PDF warn, 500 Retry preserves filters/scope/format | `ui/tests/animal-exportacion-dialog.test.tsx` |

Scenario map: LA-071→db; LA-072→db(overflow)+web(timeout); LA-073→aplicacion+web; LA-RBAC-04/05→db+web; LA-040/041/043→web; LA-074/076→ui.

## Threat Matrix

N/A — rows below do not apply; routing security is covered by LA-RBAC/LA-043/LA-073 propagated to tests above.

| Boundary | Applicability |
|---|---|
| Documentation-like paths | N/A: generates data files (xlsx/csv/pdf), no executable classification; CSV-injection is content sanitization |
| Git repository selection | N/A: no git ops |
| Commit state | N/A: no commits |
| Push state | N/A: no pushes |
| PR commands | N/A: no PR automation |

## Migration / Rollout

No schema migration. Seed adds 2 `config_parametros_finca` rows per finca (additive, `ON CONFLICT DO NOTHING`). Additive behind a permission-gated button; rollback = revert route/handlers/dialog wiring + drop the 2 seeded rows.

## Open Questions

None — filename/sheet, toast copy, and `scope=vista` empty-cols are resolved above.
