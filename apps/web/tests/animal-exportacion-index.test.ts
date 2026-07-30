/**
 * RED → GREEN for task 3.6 (LA-071): exportadores barrel + scope/column
 * resolution.
 *
 * `resolverColumnasExportacion(alcance, cols)` resolves the columns to export:
 * `todas` emits the 36 canonical columns in ordinal order; `vista` emits the
 * normalized effective `cols` (fail-safe to the 29 defaults). `Lugar compra`
 * never appears in any scope. The barrel re-exports the three generators.
 */
import { describe, expect, it } from "vitest"
import { ANIMAL_LISTADO_COLUMN_REGISTRY } from "../src/features/animal-listado/animal-listado-route-adapter.js"
import {
  generarCsv,
  generarPdf,
  generarXlsx,
  resolverColumnasExportacion,
} from "../src/server/exportadores/index.js"

describe("resolverColumnasExportacion — scope=todas (LA-071)", () => {
  it("emits exactly the 36 canonical columns in ordinal order", () => {
    const columnas = resolverColumnasExportacion("todas", [])
    expect(columnas).toHaveLength(36)
    expect(columnas[0].id).toBe("codigo")
    expect(columnas[0].ordinal).toBe(1)
    expect(columnas[35].id).toBe("tipoExplotacion")
    expect(columnas[35].ordinal).toBe(36)
    // Strictly increasing ordinals == canonical order.
    expect(columnas.map((columna) => columna.ordinal)).toEqual(
      Array.from({ length: 36 }, (_, i) => i + 1),
    )
  })

  it("ignores any provided cols when scope=todas", () => {
    const columnas = resolverColumnasExportacion("todas", ["codigo", "nombre"])
    expect(columnas).toHaveLength(36)
  })

  it("never includes 'Lugar compra'", () => {
    const columnas = resolverColumnasExportacion("todas", [])
    expect(columnas.map((columna) => columna.label)).not.toContain("Lugar compra")
    expect(columnas.map((columna) => columna.id as string)).not.toContain("lugarCompra")
  })
})

describe("resolverColumnasExportacion — scope=vista (LA-071)", () => {
  it("emits the normalized effective cols in canonical order", () => {
    const columnas = resolverColumnasExportacion("vista", ["raza", "codigo", "sexo", "nombre"])
    expect(columnas.map((columna) => columna.id)).toEqual(["codigo", "nombre", "sexo", "raza"])
  })

  it("fails safe to the 29 default columns when cols is empty (LA-032)", () => {
    const columnas = resolverColumnasExportacion("vista", [])
    expect(columnas).toHaveLength(29)
  })

  it("drops unknown identifiers", () => {
    const columnas = resolverColumnasExportacion("vista", ["codigo", "noExiste"])
    expect(columnas.map((columna) => columna.id)).toEqual(["codigo"])
  })

  it("excludes 'Lugar compra' even if injected into cols", () => {
    const columnas = resolverColumnasExportacion("vista", ["lugarCompra", "codigo"])
    expect(columnas.map((columna) => columna.id)).toEqual(["codigo"])
    expect(columnas.map((columna) => columna.label)).not.toContain("Lugar compra")
  })
})

describe("exportadores barrel (LA-070)", () => {
  it("re-exports the three format generators as functions", () => {
    expect(typeof generarCsv).toBe("function")
    expect(typeof generarXlsx).toBe("function")
    expect(typeof generarPdf).toBe("function")
  })

  it("the canonical registry the resolver builds on has 36 columns", () => {
    expect(ANIMAL_LISTADO_COLUMN_REGISTRY).toHaveLength(36)
  })
})
