/**
 * RED → GREEN for task 3.3 (LA-070/073): hand-rolled RFC 4180 CSV generator.
 *
 * `generarCsv(filas, columnas)` renders the header from the canonical column
 * labels and one row per `AnimalListadoRow`, applying the shared null-safe
 * cell formatter, the CSV-injection neutralizer, and RFC 4180 quoting (fields
 * containing a comma, double-quote, CR or LF are enclosed in double-quotes
 * with internal quotes doubled). Output is UTF-8 bytes with CRLF line breaks.
 */
import { describe, expect, it } from "vitest"
import { resolverColumnasListado } from "../src/features/animal-listado/animal-listado-route-adapter.js"
import { generarCsv } from "../src/server/exportadores/csv.js"
import { filaAnimal } from "./animal-exportacion-fixture.js"

const decodificar = (bytes: Uint8Array): string => new TextDecoder().decode(bytes)

describe("generarCsv — structure (LA-070)", () => {
  it("returns UTF-8 bytes (Uint8Array)", async () => {
    const columnas = resolverColumnasListado(["codigo", "nombre"])
    const bytes = await generarCsv([filaAnimal()], columnas)
    expect(bytes).toBeInstanceOf(Uint8Array)
  })

  it("emits the header from canonical labels in column order, CRLF terminated", async () => {
    const columnas = resolverColumnasListado(["codigo", "nombre"])
    const csv = decodificar(await generarCsv([], columnas))
    expect(csv).toBe("Código,Nombre\r\n")
  })

  it("renders one data row per fila using the null-safe formatter", async () => {
    const columnas = resolverColumnasListado(["codigo", "nombre"])
    const csv = decodificar(
      await generarCsv([filaAnimal({ codigo: "A-001", nombre: "Estrella" })], columnas),
    )
    expect(csv).toBe("Código,Nombre\r\nA-001,Estrella\r\n")
  })

  it("preserves row order across multiple filas", async () => {
    const columnas = resolverColumnasListado(["codigo"])
    const csv = decodificar(
      await generarCsv([filaAnimal({ codigo: "B" }), filaAnimal({ codigo: "A" })], columnas),
    )
    expect(csv).toBe("Código\r\nB\r\nA\r\n")
  })
})

describe("generarCsv — RFC 4180 quoting (LA-070)", () => {
  it("quotes a field containing a comma", async () => {
    const columnas = resolverColumnasListado(["comentarios"])
    const csv = decodificar(
      await generarCsv([filaAnimal({ comentarios: "leche, carne" })], columnas),
    )
    expect(csv).toBe('Comentarios\r\n"leche, carne"\r\n')
  })

  it("escapes embedded double-quotes by doubling them and quotes the field", async () => {
    const columnas = resolverColumnasListado(["comentarios"])
    const csv = decodificar(await generarCsv([filaAnimal({ comentarios: 'dice "mu"' })], columnas))
    expect(csv).toBe('Comentarios\r\n"dice ""mu"""\r\n')
  })

  it("quotes a field containing a newline", async () => {
    const columnas = resolverColumnasListado(["comentarios"])
    const csv = decodificar(
      await generarCsv([filaAnimal({ comentarios: "línea1\nlínea2" })], columnas),
    )
    expect(csv).toBe('Comentarios\r\n"línea1\nlínea2"\r\n')
  })
})

describe("generarCsv — injection neutralization (LA-073)", () => {
  it("neutralizes a formula cell so it is not executable", async () => {
    const columnas = resolverColumnasListado(["codigo"])
    const csv = decodificar(await generarCsv([filaAnimal({ codigo: "=CMD()" })], columnas))
    expect(csv).toBe("Código\r\n'=CMD()\r\n")
  })

  it("neutralizes AND quotes a dangerous value that also contains a comma", async () => {
    const columnas = resolverColumnasListado(["comentarios"])
    const csv = decodificar(await generarCsv([filaAnimal({ comentarios: "=CMD(),x" })], columnas))
    expect(csv).toBe('Comentarios\r\n"\'=CMD(),x"\r\n')
  })

  it("neutralizes every dangerous prefix in data cells", async () => {
    const columnas = resolverColumnasListado(["codigo"])
    // Prefixes that do NOT trigger RFC 4180 quoting stay unquoted.
    for (const valor of ["=A", "+B", "-C", "@D", "\tE"]) {
      const csv = decodificar(await generarCsv([filaAnimal({ codigo: valor })], columnas))
      expect(csv).toBe(`Código\r\n'${valor}\r\n`)
    }
  })

  it("neutralizes AND quotes a CR-led value (CR triggers RFC 4180 quoting)", async () => {
    const columnas = resolverColumnasListado(["codigo"])
    const csv = decodificar(await generarCsv([filaAnimal({ codigo: "\rF" })], columnas))
    // The neutralizer prefixes '; RFC 4180 then quotes because of the CR.
    expect(csv).toBe('Código\r\n"\'\rF"\r\n')
  })
})
