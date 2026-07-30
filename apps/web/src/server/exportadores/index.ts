/**
 * Exportadores barrel + scope/column resolution (LA-070/071).
 *
 * Re-exports the three server-side format generators and resolves which
 * columns an export emits:
 *   - `todas` → the 36 canonical columns in ordinal order (cols ignored);
 *   - `vista` → the normalized effective `cols`, fail-safe to the 29 defaults
 *     (LA-032), exactly as the list contract resolves them.
 * `Lugar compra` is not a recognized column and never appears in any scope
 * (LA-071); the explicit guard documents that invariant defensively.
 *
 * Server-only: importing this barrel pulls exceljs + pdfkit, so it MUST stay
 * out of the client bundle (only the export HTTP handler consumes it — PR3).
 */
import {
  ANIMAL_LISTADO_COLUMN_REGISTRY,
  type AnimalListadoColumn,
  resolverColumnasListado,
} from "../../features/animal-listado/animal-listado-route-adapter.js"

export { generarCsv } from "./csv.js"
export { neutralizarCelda, PREFIJOS } from "./neutralizar-celda.js"
export { construirFilasPdf, generarPdf } from "./pdf.js"
export { generarXlsx } from "./xlsx.js"

export type AlcanceExportacion = "todas" | "vista"

/** 'Lugar compra' must never be exported (LA-071). */
const COLUMNA_EXCLUIDA = "lugarCompra"

function sinColumnaExcluida(
  columnas: readonly AnimalListadoColumn[],
): readonly AnimalListadoColumn[] {
  return columnas.filter((columna) => (columna.id as string) !== COLUMNA_EXCLUIDA)
}

export function resolverColumnasExportacion(
  alcance: AlcanceExportacion,
  cols: readonly string[],
): readonly AnimalListadoColumn[] {
  const columnas =
    alcance === "todas" ? ANIMAL_LISTADO_COLUMN_REGISTRY : resolverColumnasListado(cols)
  return sinColumnaExcluida(columnas)
}
