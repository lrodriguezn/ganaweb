/**
 * XLSX generator via exceljs (LA-070/073).
 *
 * Builds a workbook with a single sheet named `Animales`, writes the canonical
 * header and one row per format-free `AnimalListadoRow`, and forces EVERY cell
 * to text (`numFmt = "@"`) after neutralizing it. Forcing text guarantees a
 * formula like `=CMD()` is stored as inert text and is never evaluated by
 * Excel/LibreOffice. Server-only: exceljs never enters the client bundle.
 */
import type { AnimalListadoRow } from "@ganaweb/aplicacion"
import ExcelJS from "exceljs"
import {
  type AnimalListadoColumn,
  formatearCeldaListado,
} from "../../features/animal-listado/animal-listado-route-adapter.js"
import { neutralizarCelda } from "./neutralizar-celda.js"

const NOMBRE_HOJA = "Animales"
/** Excel text format code: the cell is treated as text, never a formula. */
const FORMATO_TEXTO = "@"

function escribirFilaTexto(
  hoja: ExcelJS.Worksheet,
  valores: readonly string[],
  numeroFila: number,
): void {
  const fila = hoja.getRow(numeroFila)
  valores.forEach((valor, indice) => {
    const celda = fila.getCell(indice + 1)
    celda.value = valor
    celda.numFmt = FORMATO_TEXTO
  })
  fila.commit()
}

export async function generarXlsx(
  filas: readonly AnimalListadoRow[],
  columnas: readonly AnimalListadoColumn[],
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook()
  const hoja = workbook.addWorksheet(NOMBRE_HOJA)
  escribirFilaTexto(
    hoja,
    columnas.map((columna) => neutralizarCelda(columna.label)),
    1,
  )
  filas.forEach((fila, indice) => {
    escribirFilaTexto(
      hoja,
      columnas.map((columna) => neutralizarCelda(formatearCeldaListado(columna, fila))),
      indice + 2,
    )
  })
  const buffer = await workbook.xlsx.writeBuffer()
  return new Uint8Array(buffer)
}
