/**
 * RED → GREEN for task 3.4 (LA-070/073): XLSX generator via exceljs.
 *
 * `generarXlsx(filas, columnas)` builds a workbook with a single sheet named
 * `Animales`, writes the canonical header and one row per format-free row, and
 * forces EVERY cell to text (`numFmt = "@"`) after neutralizing it — so a
 * formula like `=CMD()` is stored as inert text, never executable. The tests
 * read the workbook back with exceljs to assert the stored value AND numFmt.
 */
import ExcelJS from "exceljs"
import { describe, expect, it } from "vitest"
import { resolverColumnasListado } from "../src/features/animal-listado/animal-listado-route-adapter.js"
import { generarXlsx } from "../src/server/exportadores/xlsx.js"
import { filaAnimal } from "./animal-exportacion-fixture.js"

async function leerHoja(bytes: Uint8Array): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(bytes))
  const hoja = workbook.getWorksheet("Animales")
  if (!hoja) throw new Error("Sheet 'Animales' not found")
  return hoja
}

describe("generarXlsx — structure (LA-070)", () => {
  it("returns bytes (Uint8Array)", async () => {
    const columnas = resolverColumnasListado(["codigo", "nombre"])
    const bytes = await generarXlsx([filaAnimal()], columnas)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
  })

  it("creates a single sheet named 'Animales'", async () => {
    const columnas = resolverColumnasListado(["codigo"])
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(Buffer.from(await generarXlsx([], columnas)))
    expect(workbook.worksheets.map((hoja) => hoja.name)).toEqual(["Animales"])
  })

  it("writes the header from canonical labels in column order", async () => {
    const columnas = resolverColumnasListado(["codigo", "nombre"])
    const hoja = await leerHoja(await generarXlsx([], columnas))
    expect(hoja.getCell("A1").value).toBe("Código")
    expect(hoja.getCell("B1").value).toBe("Nombre")
  })

  it("writes one data row per fila using the null-safe formatter", async () => {
    const columnas = resolverColumnasListado(["codigo", "nombre"])
    const hoja = await leerHoja(await generarXlsx([filaAnimal({ codigo: "A-001", nombre: "Estrella" })], columnas))
    expect(hoja.getCell("A2").value).toBe("A-001")
    expect(hoja.getCell("B2").value).toBe("Estrella")
  })
})

describe("generarXlsx — injection neutralization forced to text (LA-073)", () => {
  it("stores '=CMD()' neutralized AND forced to text (numFmt '@')", async () => {
    const columnas = resolverColumnasListado(["codigo"])
    const hoja = await leerHoja(await generarXlsx([filaAnimal({ codigo: "=CMD()" })], columnas))
    const celda = hoja.getCell("A2")
    expect(celda.value).toBe("'=CMD()")
    expect(celda.numFmt).toBe("@")
  })

  it("neutralizes every dangerous prefix in data cells", async () => {
    const columnas = resolverColumnasListado(["codigo"])
    // These five prefixes round-trip byte-for-byte through the xlsx format.
    for (const valor of ["=A", "+B", "-C", "@D", "\tE"]) {
      const hoja = await leerHoja(await generarXlsx([filaAnimal({ codigo: valor })], columnas))
      expect(hoja.getCell("A2").value).toBe(`'${valor}`)
    }
  })

  it("neutralizes a CR-led value (xlsx normalizes CR to LF, the quote still neutralizes)", async () => {
    const columnas = resolverColumnasListado(["codigo"])
    const hoja = await leerHoja(await generarXlsx([filaAnimal({ codigo: "\rF" })], columnas))
    const celda = hoja.getCell("A2")
    // The xlsx XML layer normalizes \r to \n in shared strings; the security
    // invariant is the leading quote (neutralized) plus text format.
    expect(String(celda.value).startsWith("'")).toBe(true)
    expect(String(celda.value)).toContain("F")
    expect(celda.numFmt).toBe("@")
  })

  it("forces text format on header and data cells alike", async () => {
    const columnas = resolverColumnasListado(["codigo", "nombre"])
    const hoja = await leerHoja(await generarXlsx([filaAnimal()], columnas))
    expect(hoja.getCell("A1").numFmt).toBe("@")
    expect(hoja.getCell("B1").numFmt).toBe("@")
    expect(hoja.getCell("A2").numFmt).toBe("@")
    expect(hoja.getCell("B2").numFmt).toBe("@")
  })

  it("leaves a safe value unchanged (still text-forced)", async () => {
    const columnas = resolverColumnasListado(["codigo"])
    const hoja = await leerHoja(await generarXlsx([filaAnimal({ codigo: "Holstein" })], columnas))
    expect(hoja.getCell("A2").value).toBe("Holstein")
    expect(hoja.getCell("A2").numFmt).toBe("@")
  })
})
