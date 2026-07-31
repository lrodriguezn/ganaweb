/**
 * RED → GREEN for task 3.5 (LA-070/074): landscape PDF generator via pdfkit.
 *
 * `generarPdf(filas, columnas)` renders an A4-landscape, fixed-width table of
 * neutralized cell text and returns the PDF bytes. The pure table model
 * (`construirFilasPdf`) is tested exhaustively for neutralization, canonical
 * column order, and null-safety; the rendering is tested structurally (valid
 * `%PDF-` header + A4-landscape MediaBox) since pdfkit compresses content
 * streams.
 */
import { describe, expect, it } from "vitest"
import { resolverColumnasListado } from "../src/features/animal-listado/animal-listado-route-adapter.js"
import { construirFilasPdf, generarPdf } from "../src/server/exportadores/pdf.js"
import { filaAnimal } from "./animal-exportacion-fixture.js"

const comoTexto = (bytes: Uint8Array): string => Buffer.from(bytes).toString("latin1")

describe("construirFilasPdf — pure neutralized table model (LA-073)", () => {
  it("first row is the neutralized canonical header", () => {
    const columnas = resolverColumnasListado(["codigo", "nombre"])
    const tabla = construirFilasPdf([], columnas)
    expect(tabla[0]).toEqual(["Código", "Nombre"])
  })

  it("renders one neutralized data row per fila in column order", () => {
    const columnas = resolverColumnasListado(["codigo", "nombre"])
    const tabla = construirFilasPdf([filaAnimal({ codigo: "A-001", nombre: "Estrella" })], columnas)
    expect(tabla[1]).toEqual(["A-001", "Estrella"])
  })

  it("neutralizes a formula cell before rendering", () => {
    const columnas = resolverColumnasListado(["codigo"])
    const tabla = construirFilasPdf([filaAnimal({ codigo: "=CMD()" })], columnas)
    expect(tabla[1]).toEqual(["'=CMD()"])
  })

  it("applies the null-safe formatter (Sin registrar / '-') and neutralizes the dash", () => {
    const columnas = resolverColumnasListado(["raza", "comentarios"])
    const tabla = construirFilasPdf([filaAnimal({ raza: null, comentarios: null })], columnas)
    // null catalog -> "Sin registrar"; null scalar -> "-" -> neutralized "'-"
    expect(tabla[1]).toEqual(["Sin registrar", "'-"])
  })
})

describe("generarPdf — A4 landscape PDF bytes (LA-070/074)", () => {
  it("returns a non-empty Uint8Array starting with the %PDF- magic header", async () => {
    const columnas = resolverColumnasListado(["codigo", "nombre"])
    const bytes = await generarPdf([filaAnimal()], columnas)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(comoTexto(bytes).startsWith("%PDF-")).toBe(true)
  })

  it("uses A4 landscape dimensions (MediaBox 841.89 x 595.28)", async () => {
    const columnas = resolverColumnasListado(["codigo"])
    const texto = comoTexto(await generarPdf([filaAnimal()], columnas))
    expect(texto).toContain("MediaBox")
    expect(texto).toContain("841.89")
    expect(texto).toContain("595.28")
  })

  it("renders a header-only PDF when there are no filas", async () => {
    const columnas = resolverColumnasListado(["codigo", "nombre"])
    const bytes = await generarPdf([], columnas)
    expect(comoTexto(bytes).startsWith("%PDF-")).toBe(true)
  })

  it("produces a larger document for more filas (rows are actually drawn)", async () => {
    const columnas = resolverColumnasListado(["codigo", "nombre", "raza"])
    const una = await generarPdf([filaAnimal()], columnas)
    const muchas = await generarPdf(
      Array.from({ length: 30 }, (_, i) => filaAnimal({ codigo: `A-${i}` })),
      columnas,
    )
    expect(muchas.length).toBeGreaterThan(una.length)
  })
})
