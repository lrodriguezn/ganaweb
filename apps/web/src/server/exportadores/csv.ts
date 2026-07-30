/**
 * Hand-rolled RFC 4180 CSV generator (LA-070/073).
 *
 * Renders the header from the canonical column labels and one record per
 * format-free `AnimalListadoRow`. Each cell goes through the shared null-safe
 * formatter, the CSV-injection neutralizer, and RFC 4180 quoting (a field
 * containing a comma, double-quote, CR or LF is enclosed in double-quotes with
 * internal quotes doubled). Output is UTF-8 bytes with CRLF line breaks. No
 * external CSV dependency (design: ~30 lines, hand-rolled).
 */
import type { AnimalListadoRow } from "@ganaweb/aplicacion"
import {
  type AnimalListadoColumn,
  formatearCeldaListado,
} from "../../features/animal-listado/animal-listado-route-adapter.js"
import { neutralizarCelda } from "./neutralizar-celda.js"

/** RFC 4180: quote a field when it contains a comma, quote, CR or LF. */
function escaparCampoCsv(valor: string): string {
  if (/[",\r\n]/.test(valor)) return `"${valor.replaceAll('"', '""')}"`
  return valor
}

function celdaCsv(columna: AnimalListadoColumn, fila: AnimalListadoRow): string {
  return escaparCampoCsv(neutralizarCelda(formatearCeldaListado(columna, fila)))
}

export async function generarCsv(
  filas: readonly AnimalListadoRow[],
  columnas: readonly AnimalListadoColumn[],
): Promise<Uint8Array> {
  const encabezado = columnas
    .map((columna) => escaparCampoCsv(neutralizarCelda(columna.label)))
    .join(",")
  const registros = filas.map((fila) =>
    columnas.map((columna) => celdaCsv(columna, fila)).join(","),
  )
  const texto = `${[encabezado, ...registros].join("\r\n")}\r\n`
  return new TextEncoder().encode(texto)
}
