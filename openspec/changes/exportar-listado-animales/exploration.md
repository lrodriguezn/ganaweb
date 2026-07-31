## Exploration: Exportar listado de animales (Excel/CSV/PDF)

### Current State

Issue #108 delivered the desktop animal list: 29 visible columns (36 total), RBAC visual flags (`canCreate`, `canExport`), state machine (cargando/listo/sin-acceso/error), LA-040 400 sanitization, and accessibility. The `Exportar` button is rendered in `BarraAcciones` but is **inert** — no `onClick`, no dialog, no download. The comment in `animal-listado-desktop.tsx` explicitly says "#111 owns export execution, dialog, and download."

The server-side listing is fully operational via `GET /api/fincas/{fincaId}/animales` (#107), with:
- `DrizzleAnimalListadoReadModel.listar()` — paginated query with all 36-column joins, filters, sort, accent-insensitive search, and per-finca RBAC authorization.
- `parseAnimalListadoQuery()` — validates `page`, `pageSize`, `sort`, `cols`, and `f.*` filters.
- `AnimalListadoForbiddenError` — thrown when the user lacks `animales:ver` on the requested finca.

**No export infrastructure exists.** Zero export libraries (exceljs, xlsx, csv-stringify, pdfkit, jspdf) are in any `package.json`. No `dialog` or `toast` primitive exists in `packages/ui/src/primitives/` (only `alert-dialog`, `drawer`, `button`, etc.).

### Affected Areas

| Area | File(s) | Why |
|---|---|---|
| **HTTP export endpoint** | `apps/web/src/routes/api/fincas/$fincaId/animales/exportar.ts` (new) | New route for `GET /api/fincas/{fincaId}/animales/exportar?format=xlsx\|csv\|pdf&scope=vista\|todas&cols=...` |
| **Export use case / port** | `packages/aplicacion/src/puertos/animal-exportacion-port.ts` (new) | Port for the export read model; domain-level row limit + injection protection |
| **Export read model adapter** | `packages/db/src/animal-infrastructure.ts` (extend) | Reuse `buildAnimalListadoPredicates`, `animalListadoJoins`, sort; add `listarTodos` (no pagination, with LIMIT 50k) |
| **HTTP handler** | `apps/web/src/server/animal-exportacion-http.ts` (new) | Mirrors `animal-list-http.ts` pattern: parse → authorize → generate → stream |
| **Export generators** | `apps/web/src/server/exportadores/` (new) | XLSX, CSV, PDF generators with CSV-injection neutralization and XLSX text-forcing |
| **Export dialog UI** | `packages/ui/src/ganado/animal-exportacion-dialog.tsx` (new) | Vista actual/Todas scope, format picker, PDF 36-column warning, error/retry states |
| **Dialog primitive** | `packages/ui/src/primitives/dialog.tsx` (new) | shadcn/ui Dialog — does not exist yet |
| **Toast primitive** | `packages/ui/src/primitives/toast.tsx` (new) | Needed for 400 correction announcements and export feedback |
| **Route wiring** | `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx` (modify) | Wire `Exportar` button to open dialog; handle export download + error states |
| **Route adapter** | `apps/web/src/features/animal-listado/animal-listado-route-adapter.ts` (extend) | Add export transport (fetch → blob → download) with error mapping |
| **Config parameters** | `config_parametros_finca` seed (extend) | Add `export_max_filas` (50000) and `export_timeout_segundos` (30) |
| **Permissions** | `apps/web/src/server/animal-listado-permissions.server.ts` (no change) | Already projects `canExport` from `animales:ver` + `reportes:exportar` |

### Approaches

#### 1. Server-side generation with in-memory buffers (Recommended)

Generate XLSX/CSV/PDF entirely on the server using `exceljs` (XLSX), a manual CSV serializer (no dependency needed), and `pdfkit` (PDF). The server queries all filtered rows (up to 50k), builds the file in memory, and streams it back as a binary response.

- **Pros**: Simplest implementation; CSV injection neutralization is trivial on the server; XLSX text-forcing via `exceljs` cell style; no client-side library bloat; reuses the existing `DrizzleAnimalListadoReadModel` query infrastructure directly.
- **Cons**: 50k rows × 36 columns in memory could reach ~100-200MB for XLSX; a single request holds the buffer for up to 30s.
- **Effort**: Medium — 3 new generators, 1 new endpoint, 1 new port, dialog + wiring.
- **Libraries**: `exceljs` (XLSX), `pdfkit` (PDF). CSV is hand-rolled (RFC 4180 + injection neutralization).

#### 2. Server-side generation with streaming cursors

Same server-side approach but use database cursor streaming (Drizzle's `db.execute(sql`...`) with `for await...of`) and streaming XLSX/PDF writers to avoid holding the full row set in memory.

- **Pros**: Lower peak memory; safer for the 50k ceiling; demonstrates good citizenship on the VPS.
- **Cons**: `exceljs` supports streaming writes (`Workbook.xlsx.write(stream)`) but it's more complex; `pdfkit` is already streaming; adds complexity for a limit that's unlikely to be hit in practice (most farms have <5k animals).
- **Effort**: Medium-High — streaming plumbing, error handling mid-stream, partial-file cleanup.
- **Libraries**: Same as Approach 1.

#### 3. Client-side generation from the DTO

Fetch the full filtered set as JSON from a new endpoint, then generate XLSX/CSV/PDF in the browser using `SheetJS` (xlsx) and `jspdf` + `jspdf-autotable`.

- **Pros**: Server only serves JSON; no server-side binary generation.
- **Cons**: **Rejected by the requirement** (LA-070: "se generan en servidor"); 50k rows × 36 columns as JSON is ~50-100MB over the wire; client memory pressure on low-end devices; CSV injection protection is harder to guarantee across clients.
- **Effort**: Medium — but violates the requirement.
- **Libraries**: `xlsx` (SheetJS), `jspdf`, `jspdf-autotable`.

### Recommendation

**Approach 1 (in-memory server-side)** is the right starting point. The 50k row limit is a safety net, not an expected volume — most GanaWeb farms will have hundreds to low thousands of animals. `exceljs` handles 50k × 36 comfortably within the 30s timeout on the VPS. If performance testing reveals memory pressure, Approach 2's streaming can be adopted as a targeted optimization without changing the API contract.

**Key design decisions:**

1. **New endpoint, not a query param on the existing one**: `GET /api/fincas/{fincaId}/animales/exportar` keeps the listing endpoint focused on pagination. The export endpoint reuses the same filter/sort parsing (`parseAnimalListadoQuery`) but replaces pagination with a full-set query bounded by LIMIT 50001 (to detect overflow → 413).

2. **New port in `aplicacion`**: `AnimalExportacionReadPort` with a single method `exportar(request): Promise<ExportResult>`. The port returns rows (or a stream); the generator layer (in `apps/web/src/server/exportadores/`) handles format-specific serialization. This keeps `aplicacion` free of format dependencies.

3. **Row limit as `config_parametros_finca`**: Seed `export_max_filas` = `50000` and `export_timeout_segundos` = `30` per finca. The read model reads these at query time. This follows the "no hardcoded business thresholds" convention.

4. **CSV injection neutralization**: Prefix any cell starting with `=`, `+`, `-`, `@`, `\t`, `\r` with a single quote (`'`) in CSV output. In XLSX, force the cell type to `string` via `exceljs` `cell.value = { text: rawValue, richText: ... }` or `cell.numFmt = '@'`.

5. **PDF 36-column warning**: The dialog shows the warning when `scope=todas` AND `format=pdf`. The user can continue or switch to Excel. This is pure UI logic.

6. **Error mapping**: The export transport maps HTTP status codes to the same discriminated-union pattern as `ResultadoListadoDesktop`:
   - 400 → sanitize params, keep dialog open
   - 403 → access denied
   - 413 → "afina los filtros" (too many rows)
   - 500/timeout → keep dialog open, non-destructive message, Retry preserves filters/scope/format

### Risks

| Risk | Severity | Mitigation |
|---|---|---|
| No `dialog` or `toast` primitive exists | Medium | Must create shadcn-compatible `dialog.tsx` and a toast mechanism. The `alert-dialog` primitive exists and can serve as a reference. |
| `exceljs` is ~1MB added to server bundle | Low | Server-only dependency; doesn't affect client bundle. Acceptable for the VPS deployment. |
| 50k rows × 36 columns may timeout on slow VPS | Medium | The 30s timeout is configurable via `config_parametros_finca`. If hit, the user gets a clear message. Streaming (Approach 2) is the escape hatch. |
| CSV injection neutralization must be exhaustive | High | Test with `=CMD()`, `+cmd`, `-cmd`, `@cmd`, `\tcmd`, `\rcmd`. Cover all grammars (contains, in, range, drange, bool). |
| PDF with 36 columns is nearly unreadable | Low | The requirement already mandates a warning (LA-074). The dialog recommends Excel. |
| Test scaffolding is incomplete (no formal unit/integration/e2e layers) | Medium | The existing per-package vitest configs work. Export use case tests go in `packages/aplicacion/tests/`; HTTP handler tests in `apps/web/tests/`; DB adapter tests in `packages/db/tests/`. |
| `pdfkit` requires Node.js canvas for some features | Low | GanaWeb PDFs are text-only tables; no canvas needed. `pdfkit` works without native deps. |

### Dependencies & Blockers

- **Issue #107**: ✅ Merged and archived. The server contract is live.
- **Issue #108**: ✅ Merged. Desktop table with inert `Exportar` button is the integration point.
- **Issue #109** (filters/search): Not yet delivered. Export must work with the filter URL params that #107 already parses. #109 adds the UI controls but the query grammar is already operational.
- **Issue #110** (pagination/column selector/preferences): Not yet delivered. Export's `cols` parameter uses the same `columnId` registry that #108 already consumes.

**No blockers for #111.** The export can be built against the existing #107 query infrastructure and the #108 column registry. #109 and #110 add UI controls that feed the same URL params.

### Ready for Proposal

**Yes.** The codebase has a clear integration surface:
- The `Exportar` button in `BarraAcciones` is inert and permission-gated.
- The `DrizzleAnimalListadoReadModel` query infrastructure (predicates, joins, sort, authorization) is directly reusable.
- The `parseAnimalListadoQuery` function already validates the filter/sort/cols grammar.
- The `animal-list-http.ts` handler pattern is the template for the export handler.
- The `animal-listado-permissions.server.ts` already projects `canExport`.

The proposal should cover: new dependencies (`exceljs`, `pdfkit`), the new port + adapter, the export endpoint, the generators, the dialog + toast primitives, and the route wiring.
