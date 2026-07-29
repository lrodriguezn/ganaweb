/**
 * #108 (PR 1) — typed #107 route adapter + fail-closed visual permission
 * projection. Vitest suite, node environment (pure logic, no DOM).
 *
 * Contract source: apps/web/src/server/animal-list-contract.ts (#107) and the
 * RF-ANIM-LIST v2.1 canonical matrix (36 columns, 29 visible, 7 optional).
 * Gate: epic #106 approved + #107 delivered before PR 1. Route wiring, the
 * presentational table, and #109–#111 behavior belong to later PRs.
 */
import { describe, expect, it } from "vitest"
import {
  ANIMAL_LISTADO_COLUMN_REGISTRY,
  ANIMAL_LISTADO_DEFAULT_COLUMNS,
  construirModeloListadoDesktop,
  formatearCeldaListado,
  resolverColumnaListado,
  resolverColumnasListado,
  sanitizarListadoBadRequest,
} from "../src/features/animal-listado/animal-listado-route-adapter.js"
import type {
  AnimalListadoDesktopModel,
  AnimalListadoVisualPermissions,
} from "../src/features/animal-listado/animal-listado-route-adapter.js"
import { ANIMAL_LIST_COLUMNS } from "../src/server/animal-list-contract.js"
import type {
  AnimalListadoResponseDto,
  AnimalListadoRowDto,
  ApiErrorDto,
} from "../src/server/animal-list-contract.js"

const IDS_CANONICOS_29 = [
  "codigo",
  "nombre",
  "sexo",
  "raza",
  "fechaNacimiento",
  "edad",
  "color",
  "origen",
  "codigoMadre",
  "nombreMadre",
  "codigoPadre",
  "nombrePadre",
  "propietario",
  "hierro",
  "numeroPezones",
  "calidad",
  "arete",
  "fechaCompra",
  "precioCompra",
  "pesoCompra",
  "tatuado",
  "herrado",
  "descornado",
  "rfid",
  "potrero",
  "sector",
  "lote",
  "grupo",
  "comentarios",
] as const

const ETIQUETAS_CANONICAS_29 = [
  "Código",
  "Nombre",
  "Sexo",
  "Raza",
  "Fecha nacimiento",
  "Edad",
  "Color",
  "Origen",
  "Madre (Cód.)",
  "Madre (Nom.)",
  "Padre (Cód.)",
  "Padre (Nom.)",
  "Propietario",
  "Hierro",
  "No. Pezones",
  "Calidad",
  "Arete",
  "Fecha compra",
  "Precio",
  "Peso compra",
  "Tatuado",
  "Herrado",
  "Descornado",
  "RFID",
  "Potrero",
  "Sector",
  "Lote",
  "Grupo",
  "Comentarios",
]

const IDS_OPCIONALES_7 = [
  "salud",
  "categoriaReproductiva",
  "estado",
  "pesoUltimo",
  "qr",
  "esDeMonta",
  "tipoExplotacion",
] as const

const filaCompleta: AnimalListadoRowDto = {
  id: "animal-1",
  codigo: "MT-001",
  nombre: "Mariposa",
  sexo: { key: "1", label: "Hembra" },
  raza: { id: "raza-1", label: "Holstein" },
  fechaNacimiento: "2021-03-10",
  edadAnios: 5.4,
  color: { id: "color-1", label: "Blanco" },
  origen: { id: "0", label: "Nacido en finca" },
  codigoMadre: "MT-010",
  nombreMadre: "Luna",
  codigoPadre: "MT-005",
  nombrePadre: "Toro",
  propietario: { id: "prop-1", label: "Don José" },
  hierro: { id: "hierro-1", label: "La Esperanza" },
  numeroPezones: 4,
  calidad: { id: "cal-1", label: "A" },
  codigoArete: "ARE-9",
  fechaCompra: "2022-01-15",
  precioCompra: 1500000,
  pesoCompraKg: 480.5,
  tatuado: true,
  herrado: false,
  descornado: true,
  codigoRfid: "RFID-7",
  potrero: { id: "pot-1", label: "El Prado" },
  sector: { id: "sec-1", label: "Norte" },
  lote: { id: "lote-1", label: "Lote 1" },
  grupo: { id: "grupo-1", label: "Lechería" },
  comentarios: "Excelente productora",
  salud: { key: "0", label: "Sano" },
  categoriaReproductiva: { key: "parida", label: "Parida" },
  estado: { key: "0", label: "Activo" },
  pesoUltimo: { pesoKg: 510.2, fecha: "2026-07-01" },
  codigoQr: "QR-1",
  esDeMonta: false,
  tipoExplotacion: { id: "te-1", label: "Leche" },
}

const filaSinDatos: AnimalListadoRowDto = {
  id: "animal-2",
  codigo: "MT-002",
  nombre: "",
  sexo: { key: "0", label: "Macho" },
  raza: null,
  fechaNacimiento: null,
  edadAnios: null,
  color: null,
  origen: null,
  codigoMadre: null,
  nombreMadre: null,
  codigoPadre: null,
  nombrePadre: null,
  propietario: null,
  hierro: null,
  numeroPezones: null,
  calidad: null,
  codigoArete: null,
  fechaCompra: null,
  precioCompra: null,
  pesoCompraKg: null,
  tatuado: false,
  herrado: false,
  descornado: false,
  codigoRfid: null,
  potrero: null,
  sector: null,
  lote: null,
  grupo: null,
  comentarios: null,
  salud: null,
  categoriaReproductiva: null,
  estado: null,
  pesoUltimo: null,
  codigoQr: null,
  esDeMonta: false,
  tipoExplotacion: null,
}

const permisosFijos: AnimalListadoVisualPermissions = {
  canCreate: true,
  canExport: false,
}

function respuestaListado(
  overrides: Partial<AnimalListadoResponseDto> = {},
): AnimalListadoResponseDto {
  return {
    data: [filaCompleta, filaSinDatos],
    page: 1,
    pageSize: 25,
    total: 2,
    totalSinFiltro: 10,
    sort: "codigo:asc",
    cols: [...IDS_CANONICOS_29],
    ...overrides,
  }
}

function columnaPorId(id: string) {
  const columna = resolverColumnaListado(id)
  if (!columna) throw new Error(`Columna no registrada: ${id}`)
  return columna
}

describe("Canonical online table contract (task 1.2/1.3)", () => {
  it("recognizes the 36 columnId/responseKey pairs of the #107 registry", () => {
    expect(ANIMAL_LIST_COLUMNS).toHaveLength(36)
    expect(ANIMAL_LISTADO_COLUMN_REGISTRY).toHaveLength(36)
    for (const [id, responseKey] of ANIMAL_LIST_COLUMNS) {
      const porId = resolverColumnaListado(id)
      expect(porId?.id).toBe(id)
      expect(porId?.responseKey).toBe(responseKey)
      const porKey = resolverColumnaListado(responseKey)
      expect(porKey?.id).toBe(id)
      expect(porKey?.responseKey).toBe(responseKey)
    }
  })

  it("never recognizes 'Lugar compra' or unknown identifiers", () => {
    expect(resolverColumnaListado("lugarCompra")).toBeNull()
    expect(resolverColumnaListado("compras")).toBeNull()
    expect(resolverColumnaListado("")).toBeNull()
  })

  it("exposes the canonical 29 default columns in order with Spanish labels", () => {
    expect(ANIMAL_LISTADO_DEFAULT_COLUMNS).toHaveLength(29)
    expect(ANIMAL_LISTADO_DEFAULT_COLUMNS.map((columna) => columna.id)).toEqual([...IDS_CANONICOS_29])
    expect(ANIMAL_LISTADO_DEFAULT_COLUMNS.map((columna) => columna.label)).toEqual(
      ETIQUETAS_CANONICAS_29,
    )
    expect(ANIMAL_LISTADO_DEFAULT_COLUMNS.every((columna) => columna.visibleByDefault)).toBe(true)
  })

  it("recognizes the seven optional columns as hidden by default", () => {
    const ocultas = ANIMAL_LISTADO_COLUMN_REGISTRY.filter((columna) => !columna.visibleByDefault)
    expect(ocultas.map((columna) => columna.id)).toEqual([...IDS_OPCIONALES_7])
  })

  it("presents null fields safely — never the null literal nor zero", () => {
    for (const columna of ANIMAL_LISTADO_COLUMN_REGISTRY) {
      const texto = formatearCeldaListado(columna, filaSinDatos)
      expect(texto).not.toBe("null")
      expect(texto).not.toBe("undefined")
      expect(texto).not.toBe("")
      expect(texto.length).toBeGreaterThan(0)
    }
    // Catalog/relation nulls announce absence; scalar nulls use a dash.
    expect(formatearCeldaListado(columnaPorId("raza"), filaSinDatos)).toBe("Sin registrar")
    expect(formatearCeldaListado(columnaPorId("propietario"), filaSinDatos)).toBe("Sin registrar")
    expect(formatearCeldaListado(columnaPorId("tipoExplotacion"), filaSinDatos)).toBe("Sin registrar")
    expect(formatearCeldaListado(columnaPorId("edad"), filaSinDatos)).toBe("-")
    expect(formatearCeldaListado(columnaPorId("numeroPezones"), filaSinDatos)).toBe("-")
    expect(formatearCeldaListado(columnaPorId("comentarios"), filaSinDatos)).toBe("-")
    expect(formatearCeldaListado(columnaPorId("pesoUltimo"), filaSinDatos)).toBe("-")
    expect(formatearCeldaListado(columnaPorId("tatuado"), filaSinDatos)).toBe("No")
  })

  it("formats populated values from the response key, not the label", () => {
    expect(formatearCeldaListado(columnaPorId("codigo"), filaCompleta)).toBe("MT-001")
    expect(formatearCeldaListado(columnaPorId("sexo"), filaCompleta)).toBe("Hembra")
    expect(formatearCeldaListado(columnaPorId("raza"), filaCompleta)).toBe("Holstein")
    expect(formatearCeldaListado(columnaPorId("edad"), filaCompleta)).toBe("5.4")
    expect(formatearCeldaListado(columnaPorId("arete"), filaCompleta)).toBe("ARE-9")
    expect(formatearCeldaListado(columnaPorId("pesoCompra"), filaCompleta)).toBe("480.5")
    expect(formatearCeldaListado(columnaPorId("tatuado"), filaCompleta)).toBe("Sí")
    expect(formatearCeldaListado(columnaPorId("pesoUltimo"), filaCompleta)).toBe("510.2 kg")
  })

  it("builds the desktop model with canonical columns, rows, and counters", () => {
    const modelo = construirModeloListadoDesktop(respuestaListado(), permisosFijos)
    expect(modelo.columns.map((columna) => columna.id)).toEqual([...IDS_CANONICOS_29])
    expect(modelo.rows).toHaveLength(2)
    expect(modelo.rows[0]?.codigo).toBe("MT-001")
    expect(modelo.total).toBe(2)
    expect(modelo.totalSinFiltro).toBe(10)
    expect(modelo.permissions).toEqual(permisosFijos)
  })

  it("resolves custom cols through the registry in canonical order, failing safe", () => {
    const personalizado = resolverColumnasListado(["salud", "codigo", "nombre"])
    expect(personalizado.map((columna) => columna.id)).toEqual(["codigo", "nombre", "salud"])

    const modelo = construirModeloListadoDesktop(
      respuestaListado({ cols: ["qr", "codigo"] }),
      permisosFijos,
    )
    expect(modelo.columns.map((columna) => columna.id)).toEqual(["codigo", "qr"])

    const desconocido = construirModeloListadoDesktop(
      respuestaListado({ cols: ["columna_inexistente"] }),
      permisosFijos,
    )
    expect(desconocido.columns.map((columna) => columna.id)).toEqual([...IDS_CANONICOS_29])
  })
})

function error400(overrides: Partial<ApiErrorDto> = {}): ApiErrorDto {
  return {
    error: "bad_request",
    campo: "f.razaId",
    motivo: "Valor de filtro no permitido",
    requestId: "req-1",
    ...overrides,
  }
}

describe("400 sanitization — invalid query preserves data (LA-040–043, task 1.4)", () => {
  const ultimoModelo: AnimalListadoDesktopModel = construirModeloListadoDesktop(
    respuestaListado(),
    permisosFijos,
  )

  it("retains the last valid model, strips the invalid filter, resets page, and announces a toast", () => {
    const consulta = new URLSearchParams("page=3&pageSize=25&sort=codigo:asc&f.razaId=in:raza-mala")
    const resultado = sanitizarListadoBadRequest(error400(), ultimoModelo, consulta)

    expect(resultado.model).toBe(ultimoModelo)
    expect(resultado.removedParams).toContain("f.razaId")
    expect(resultado.pageReset).toBe(true)
    expect(resultado.sanitizedQuery.has("f.razaId")).toBe(false)
    expect(resultado.sanitizedQuery.has("page")).toBe(false)
    expect(resultado.sanitizedQuery.get("pageSize")).toBe("25")
    expect(resultado.sanitizedQuery.get("sort")).toBe("codigo:asc")
    expect(resultado.toast.mensaje).toBe("Valor de filtro no permitido")
    expect(resultado.toast.requestId).toBe("req-1")
    // The original query object is not mutated.
    expect(consulta.get("f.razaId")).toBe("in:raza-mala")
  })

  it("resets page when page itself is the invalid campo", () => {
    const consulta = new URLSearchParams("page=abc&pageSize=50")
    const resultado = sanitizarListadoBadRequest(
      error400({ campo: "page", motivo: "page debe ser un entero positivo" }),
      ultimoModelo,
      consulta,
    )
    expect(resultado.model).toBe(ultimoModelo)
    expect(resultado.removedParams).toEqual(["page"])
    expect(resultado.pageReset).toBe(true)
    expect(resultado.sanitizedQuery.has("page")).toBe(false)
    expect(resultado.sanitizedQuery.get("pageSize")).toBe("50")
  })

  it("keeps the current page when the invalid campo does not affect pagination", () => {
    const consulta = new URLSearchParams("page=3&pageSize=25&cols=codigo,invalido")
    const resultado = sanitizarListadoBadRequest(
      error400({ campo: "cols", motivo: "cols contiene una columna no permitida" }),
      ultimoModelo,
      consulta,
    )
    expect(resultado.removedParams).toEqual(["cols"])
    expect(resultado.pageReset).toBe(false)
    expect(resultado.sanitizedQuery.get("page")).toBe("3")
    expect(resultado.sanitizedQuery.has("cols")).toBe(false)
  })

  it("leaves the URL untouched when campo is null but still announces the correction", () => {
    const consulta = new URLSearchParams("page=2&pageSize=25")
    const resultado = sanitizarListadoBadRequest(
      error400({ campo: null, motivo: "Petición no permitida" }),
      ultimoModelo,
      consulta,
    )
    expect(resultado.removedParams).toEqual([])
    expect(resultado.pageReset).toBe(false)
    expect(resultado.sanitizedQuery.get("page")).toBe("2")
    expect(resultado.toast.mensaje).toBe("Petición no permitida")
  })
})
