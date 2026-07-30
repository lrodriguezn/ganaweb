/**
 * Landscape PDF generator via pdfkit (LA-070/074).
 *
 * Renders an A4-landscape, fixed-width table: every column gets an equal slice
 * of the usable width (so all 36 canonical columns fit), and each cell draws
 * its neutralized, null-safe text clipped to that slice. The pure table model
 * (`construirFilasPdf`) is exported for isolated testing; `generarPdf` lays it
 * out and returns the PDF bytes. Server-only: pdfkit never enters the client
 * bundle. Built-in Helvetica keeps accents (es-CO) without external fonts.
 */
import type { AnimalListadoRow } from "@ganaweb/aplicacion"
import PDFDocument from "pdfkit"
import {
  type AnimalListadoColumn,
  formatearCeldaListado,
} from "../../features/animal-listado/animal-listado-route-adapter.js"
import { neutralizarCelda } from "./neutralizar-celda.js"

const MARGEN = 36
const ALTO_FILA = 15
const ALTO_ENCABEZADO = 17
const TAMANO_FUENTE = 7

/** Header + one neutralized, null-safe text row per fila (canonical order). */
export function construirFilasPdf(
  filas: readonly AnimalListadoRow[],
  columnas: readonly AnimalListadoColumn[],
): readonly (readonly string[])[] {
  const encabezado = columnas.map((columna) => neutralizarCelda(columna.label))
  const datos = filas.map((fila) =>
    columnas.map((columna) => neutralizarCelda(formatearCeldaListado(columna, fila))),
  )
  return [encabezado, ...datos]
}

export async function generarPdf(
  filas: readonly AnimalListadoRow[],
  columnas: readonly AnimalListadoColumn[],
): Promise<Uint8Array> {
  const tabla = construirFilasPdf(filas, columnas)
  const documento = new PDFDocument({ size: "A4", layout: "landscape", margin: MARGEN })
  const fragmentos: Buffer[] = []
  documento.on("data", (fragmento: Buffer) => fragmentos.push(fragmento))
  const bytes = new Promise<Uint8Array>((resolver) => {
    documento.on("end", () => resolver(new Uint8Array(Buffer.concat(fragmentos))))
  })

  const anchoUtil = documento.page.width - MARGEN * 2
  const anchoColumna = anchoUtil / columnas.length
  let y = MARGEN
  for (const [indice, filaTexto] of tabla.entries()) {
    const esEncabezado = indice === 0
    const altoFila = esEncabezado ? ALTO_ENCABEZADO : ALTO_FILA
    if (y + altoFila > documento.page.height - MARGEN) {
      documento.addPage()
      y = MARGEN
    }
    documento.font(esEncabezado ? "Helvetica-Bold" : "Helvetica").fontSize(TAMANO_FUENTE)
    filaTexto.forEach((valor, columna) => {
      documento.text(valor, MARGEN + columna * anchoColumna, y, {
        width: anchoColumna,
        height: altoFila,
        ellipsis: true,
      })
    })
    y += altoFila
  }

  documento.end()
  return bytes
}
