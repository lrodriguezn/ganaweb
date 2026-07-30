import type { DecisionAutorizacion, PermisoUsuario } from "@ganaweb/aplicacion"
/**
 * #108 (PR 1) — typed #107 route adapter + fail-closed visual permission
 * projection. Vitest suite, node environment (pure logic, no DOM).
 *
 * Contract source: apps/web/src/server/animal-list-contract.ts (#107) and the
 * RF-ANIM-LIST v2.1 canonical matrix (36 columns, 29 visible, 7 optional).
 * Gate: epic #106 approved + #107 delivered before PR 1. Route wiring, the
 * presentational table, and #109–#111 behavior belong to later PRs.
 */
import { describe, expect, it, vi } from "vitest"
import {
  ANIMAL_LISTADO_COLUMN_REGISTRY,
  ANIMAL_LISTADO_DEFAULT_COLUMNS,
  aplicarFiltroListado,
  cargarListadoDesktop,
  construirModeloListadoDesktop,
  crearChipsListado,
  crearModelosFiltroListado,
  eliminarChipListado,
  finalizarConsultaListado,
  formatearCeldaListado,
  limpiarFiltrosListado,
  resolverColumnaListado,
  resolverColumnasListado,
  sanitizarListadoBadRequest,
  siguienteOrdenListado,
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
import {
  PERMISOS_VISUALES_LISTADO_DENEGADOS,
  proyectarPermisosVisualesListado,
  resolverPermisosVisualesListado,
} from "../src/server/animal-listado-permissions.server.js"

// Prevent the fail-closed resolver test from loading the real database driver,
// native argon2 binding, and TanStack Start server runtime. The mock makes
// getAuthDeps() throw, which exercises the catch → denied path the test asserts.
vi.mock("../src/server/auth-deps.server.js", () => ({
  getAuthDeps: (): never => {
    throw new Error("no server context in unit tests")
  },
}))
vi.mock("../src/server/session-cookie.server.js", () => ({
  readSessionToken: (): null => null,
  setSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
  readRequestMetadata: () => ({ userAgent: null, ip: null }),
}))

// Prevent the "Server fn exposure" dynamic import from loading the real
// postgres driver, drizzle adapters, and TanStack Start server runtime.
// The test only asserts that the module exports the expected functions.
vi.mock("@ganaweb/db/client", () => ({ db: {} }))
vi.mock("@ganaweb/db/animal-infrastructure", () => ({
  createAnimalUseCaseDeps: () => ({}),
}))
vi.mock("@ganaweb/db/catalogo-animal-maestro-infrastructure", () => ({
  DrizzleCatalogoAnimalMaestroAdapter: class {},
}))
vi.mock("@ganaweb/db/catalogo-finca-infrastructure", () => ({
  DrizzleCatalogoFincaAdapter: class {},
}))
vi.mock("@ganaweb/db/catalogo-global-infrastructure", () => ({
  DrizzleCatalogoGlobalAdapter: class {},
}))
vi.mock("@ganaweb/db/catalogo-padres-infrastructure", () => ({
  DrizzleCatalogoPadresAdapter: class {},
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain: Record<string, unknown> = {}
    chain.validator = () => chain
    chain.handler = (fn: unknown) => fn
    return chain
  },
}))

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
    expect(ANIMAL_LISTADO_DEFAULT_COLUMNS.map((columna) => columna.id)).toEqual([
      ...IDS_CANONICOS_29,
    ])
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
    expect(formatearCeldaListado(columnaPorId("tipoExplotacion"), filaSinDatos)).toBe(
      "Sin registrar",
    )
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

describe("Issue #109 canonical query adapter (tasks 1.1–1.3)", () => {
  it("serializes stable IDs with metadata grammar into a complete canonical query", () => {
    const consulta = aplicarFiltroListado(
      new URLSearchParams("cols=nombre,codigo&q=toros&pageSize=50&page=3&sort=razaLabel:desc"),
      { filterKey: "razaId", grammar: "in", value: "raza-uuid" },
    )

    expect(finalizarConsultaListado(consulta)).toEqual({
      searchParams:
        "pageSize=50&sort=razaLabel%3Adesc&q=toros&f.razaId=in%3Araza-uuid&cols=nombre%2Ccodigo",
    })
    expect(consulta.get("f.razaId")).toBe("in:raza-uuid")
    expect(consulta.get("f.razaId")).not.toContain("Brahman")
  })

  it("builds metadata-backed filter models and labels chips without deriving IDs from labels", () => {
    const modelos = crearModelosFiltroListado(new URLSearchParams("f.razaId=in:raza-uuid"), {
      razaId: [{ value: "raza-uuid", label: "Brahman" }],
    })
    const raza = modelos.find((modelo) => modelo.filterKey === "razaId")

    expect(raza).toMatchObject({
      grammar: "in",
      label: "Raza",
      committedValue: "raza-uuid",
      options: [{ value: "raza-uuid", label: "Brahman" }],
    })
    expect(
      crearChipsListado(new URLSearchParams("q=toros&f.razaId=in:raza-uuid"), modelos),
    ).toEqual([
      { queryKey: "q", label: "Búsqueda", valueLabel: "toros" },
      { queryKey: "f.razaId", label: "Raza", valueLabel: "Brahman" },
    ])
  })

  it("resets page for filter/chip/clear mutations and cycles sort through no-sort", () => {
    const inicial = new URLSearchParams(
      "page=4&pageSize=50&sort=nombre:asc&q=toros&f.razaId=in:raza-uuid&cols=nombre,codigo",
    )

    expect(eliminarChipListado(inicial, "f.razaId").toString()).toBe(
      "pageSize=50&sort=nombre%3Aasc&q=toros&cols=nombre%2Ccodigo",
    )
    expect(limpiarFiltrosListado(inicial).toString()).toBe(
      "pageSize=50&sort=nombre%3Aasc&cols=nombre%2Ccodigo",
    )
    expect(siguienteOrdenListado(inicial, "nombre").get("sort")).toBe("nombre:desc")
    expect(
      siguienteOrdenListado(new URLSearchParams("sort=nombre:desc"), "nombre").has("sort"),
    ).toBe(false)
    expect(siguienteOrdenListado(new URLSearchParams(), "codigo").get("sort")).toBe("codigo:asc")
  })
})

describe("Issue #109 400 recovery map (task 1.2)", () => {
  const ultimoModelo = construirModeloListadoDesktop(respuestaListado(), permisosFijos)
  const camposFiltro = ANIMAL_LIST_COLUMNS.map(([, , filterKey]) => `f.${filterKey}`)

  it.each(camposFiltro)("removes dataset-shaping %s and resets page only", (campo) => {
    const resultado = sanitizarListadoBadRequest(
      error400({ campo }),
      ultimoModelo,
      new URLSearchParams(`page=3&pageSize=50&${campo}=valor`),
    )

    expect(resultado.removedParams).toEqual([campo, "page"])
    expect(resultado.pageReset).toBe(true)
    expect(resultado.sanitizedQuery.toString()).toBe("pageSize=50")
  })

  it.each([
    ["page", "page=3&pageSize=50", ["page"], true, "pageSize=50"],
    ["pageSize", "page=3&pageSize=50", ["pageSize", "page"], true, ""],
    ["sort", "page=3&sort=codigo:asc", ["sort", "page"], true, ""],
    ["cols", "page=3&cols=codigo,nombre", ["cols"], false, "page=3"],
    ["f.desconocido", "page=3&f.desconocido=in:x", [], false, "page=3&f.desconocido=in%3Ax"],
    [null, "page=3&f.razaId=in:x", [], false, "page=3&f.razaId=in%3Ax"],
  ] as const)(
    "applies the exact recovery rule for %s",
    (campo, consulta, removedParams, pageReset, serializada) => {
      const resultado = sanitizarListadoBadRequest(
        error400({ campo }),
        ultimoModelo,
        new URLSearchParams(consulta),
      )

      expect(resultado.removedParams).toEqual(removedParams)
      expect(resultado.pageReset).toBe(pageReset)
      expect(resultado.sanitizedQuery.toString()).toBe(serializada)
    },
  )
})

function sesionAutorizada(
  permisos: readonly PermisoUsuario[],
  fincaActivaId = "finca-1",
): DecisionAutorizacion {
  return {
    tipo: "autorizado",
    sesion: {
      usuarioId: "usuario-1",
      nombre: "Operario",
      email: "operario@ganaweb.test",
      fincaActivaId,
      fincaActivaNombre: "Finca 1",
      rol: "Mayordomo",
      permisos,
    },
  }
}

const permiso = (modulo: string, accion: string): PermisoUsuario => ({ modulo, accion })

describe("Visual permission projection — fail closed (LA-RBAC-02/03, PE-001–003, task 1.5/1.6)", () => {
  const fincaId = "finca-1"

  it("grants nothing when the session has no relevant permissions", () => {
    const resultado = proyectarPermisosVisualesListado(
      sesionAutorizada([permiso("configuracion", "ver")]),
      fincaId,
    )
    expect(resultado).toEqual({ canCreate: false, canExport: false })
  })

  it("canCreate requires animales:crear", () => {
    expect(
      proyectarPermisosVisualesListado(sesionAutorizada([permiso("animales", "crear")]), fincaId),
    ).toEqual({ canCreate: true, canExport: false })
    expect(
      proyectarPermisosVisualesListado(sesionAutorizada([permiso("animales", "ver")]), fincaId),
    ).toEqual({ canCreate: false, canExport: false })
  })

  it("canExport requires animales:ver AND reportes:exportar", () => {
    expect(
      proyectarPermisosVisualesListado(sesionAutorizada([permiso("animales", "ver")]), fincaId),
    ).toEqual({ canCreate: false, canExport: false })
    expect(
      proyectarPermisosVisualesListado(
        sesionAutorizada([permiso("reportes", "exportar")]),
        fincaId,
      ),
    ).toEqual({ canCreate: false, canExport: false })
    expect(
      proyectarPermisosVisualesListado(
        sesionAutorizada([permiso("animales", "ver"), permiso("reportes", "exportar")]),
        fincaId,
      ),
    ).toEqual({ canCreate: false, canExport: true })
  })

  it("grants both flags with the full combination", () => {
    const resultado = proyectarPermisosVisualesListado(
      sesionAutorizada([
        permiso("animales", "crear"),
        permiso("animales", "ver"),
        permiso("reportes", "exportar"),
      ]),
      fincaId,
    )
    expect(resultado).toEqual({ canCreate: true, canExport: true })
  })

  it("the global *:* grant enables both flags", () => {
    const resultado = proyectarPermisosVisualesListado(
      sesionAutorizada([permiso("*", "*")]),
      fincaId,
    )
    expect(resultado).toEqual({ canCreate: true, canExport: true })
  })

  it("fails closed for unauthenticated and pending decisions — no false 403", () => {
    expect(proyectarPermisosVisualesListado({ tipo: "no_autenticado" }, fincaId)).toEqual(
      PERMISOS_VISUALES_LISTADO_DENEGADOS,
    )
    expect(
      proyectarPermisosVisualesListado(
        { tipo: "pendiente", usuarioId: "u", nombre: "N", email: "e" },
        fincaId,
      ),
    ).toEqual(PERMISOS_VISUALES_LISTADO_DENEGADOS)
  })

  it("fails closed when the authorized session belongs to another finca", () => {
    const resultado = proyectarPermisosVisualesListado(
      sesionAutorizada(
        [permiso("animales", "crear"), permiso("animales", "ver"), permiso("reportes", "exportar")],
        "finca-ajena",
      ),
      fincaId,
    )
    expect(resultado).toEqual(PERMISOS_VISUALES_LISTADO_DENEGADOS)
  })

  it("the server resolver fails closed outside a request context instead of throwing", async () => {
    // No request context, no session cookie: the resolver must resolve both
    // flags false (denial/failure fail closed) and never throw a false 403.
    const resultado = await resolverPermisosVisualesListado(fincaId)
    expect(resultado).toEqual({ canCreate: false, canExport: false })
  })
})

describe("Server fn exposure (task 1.7)", () => {
  it("exposes the projection as a read-only server fn and leaves the legacy/#107 surface intact", async () => {
    const modulo = await import("../src/server/animal-actions.server.js")
    expect(typeof modulo.getAnimalListadoVisualPermissionsAction).toBe("function")
    // Regression guard: the legacy mobile list action stays exported and the
    // #107 API route is not modified by this change.
    expect(typeof modulo.listAnimalsAction).toBe("function")
  })
})

describe("Desktop model mirrors the #107 sort — aria-sort source (task 3.1)", () => {
  it("mirrors codigo:asc as the default orden", () => {
    const modelo = construirModeloListadoDesktop(respuestaListado(), permisosFijos)
    expect(modelo.orden).toEqual({ campo: "codigo", direccion: "asc" })
  })

  it("mirrors a descending sort and fails safe on a malformed sort", () => {
    const descendente = construirModeloListadoDesktop(
      respuestaListado({ sort: "nombre:desc" }),
      permisosFijos,
    )
    expect(descendente.orden).toEqual({ campo: "nombre", direccion: "desc" })

    const malformado = construirModeloListadoDesktop(
      respuestaListado({ sort: "nombre:sin-direccion" }),
      permisosFijos,
    )
    expect(malformado.orden).toEqual({ campo: "codigo", direccion: "asc" })
  })
})

describe("Route wiring — #107 outcomes reach only the desktop adapter (task 3.1)", () => {
  const fincaId = "finca-1"

  const fetchFijo =
    (cuerpo: unknown, estado = 200): typeof fetch =>
    async () =>
      new Response(JSON.stringify(cuerpo), { status: estado })

  it("200 → listo with the desktop model built through the adapter", async () => {
    const resultado = await cargarListadoDesktop(fincaId, permisosFijos, {
      fetchImpl: fetchFijo(respuestaListado()),
    })
    if (resultado.tipo !== "listo") throw new Error(`esperado listo, recibido ${resultado.tipo}`)
    expect(resultado.modelo.columns.map((columna) => columna.id)).toEqual([...IDS_CANONICOS_29])
    expect(resultado.modelo.rows).toHaveLength(2)
    expect(resultado.modelo.total).toBe(2)
    expect(resultado.modelo.totalSinFiltro).toBe(10)
    expect(resultado.modelo.permissions).toEqual(permisosFijos)
    expect(resultado.modelo.orden).toEqual({ campo: "codigo", direccion: "asc" })
  })

  it("requests the #107 endpoint for the finca and appends the consulta", async () => {
    const urls: string[] = []
    const fetchImpl: typeof fetch = async (input) => {
      urls.push(String(input))
      return new Response(JSON.stringify(respuestaListado()), { status: 200 })
    }
    await cargarListadoDesktop(fincaId, permisosFijos, { fetchImpl })
    await cargarListadoDesktop(fincaId, permisosFijos, { fetchImpl, consulta: "?page=2" })
    expect(urls).toEqual(["/api/fincas/finca-1/animales", "/api/fincas/finca-1/animales?page=2"])
  })

  it("400 → consulta_invalida carrying the #107 ApiErrorDto", async () => {
    const resultado = await cargarListadoDesktop(fincaId, permisosFijos, {
      fetchImpl: fetchFijo(error400(), 400),
    })
    expect(resultado).toEqual({ tipo: "consulta_invalida", error: error400() })
  })

  it("403 → sin_acceso through the adapter, not the legacy action", async () => {
    const cuerpo = error400({
      error: "forbidden",
      campo: null,
      motivo: "No autorizado",
      requestId: "req-403",
    })
    const resultado = await cargarListadoDesktop(fincaId, permisosFijos, {
      fetchImpl: fetchFijo(cuerpo, 403),
    })
    if (resultado.tipo !== "sin_acceso") {
      throw new Error(`esperado sin_acceso, recibido ${resultado.tipo}`)
    }
    expect(resultado.error.requestId).toBe("req-403")
  })

  it("500 → error_servidor carrying the ApiErrorDto", async () => {
    const cuerpo = error400({
      error: "internal_error",
      campo: null,
      motivo: "No fue posible consultar los animales",
      requestId: "req-500",
    })
    const resultado = await cargarListadoDesktop(fincaId, permisosFijos, {
      fetchImpl: fetchFijo(cuerpo, 500),
    })
    expect(resultado).toEqual({ tipo: "error_servidor", error: cuerpo })
  })

  it("network failure → error_servidor with null error, never a false 403", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new TypeError("fetch failed")
    }
    const resultado = await cargarListadoDesktop(fincaId, permisosFijos, { fetchImpl })
    expect(resultado).toEqual({ tipo: "error_servidor", error: null })
  })

  it("timeout abort → error_servidor with null error", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new DOMException("The operation was aborted", "AbortError")
    }
    const resultado = await cargarListadoDesktop(fincaId, permisosFijos, { fetchImpl })
    expect(resultado).toEqual({ tipo: "error_servidor", error: null })
  })

  it("a 200 with a non-JSON body → error_servidor, never a silent empty table", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response("<html>gateway</html>", { status: 200 })
    const resultado = await cargarListadoDesktop(fincaId, permisosFijos, { fetchImpl })
    expect(resultado).toEqual({ tipo: "error_servidor", error: null })
  })

  it("a 400 with an unparseable body degrades to error_servidor", async () => {
    const fetchImpl: typeof fetch = async () => new Response("oops", { status: 400 })
    const resultado = await cargarListadoDesktop(fincaId, permisosFijos, { fetchImpl })
    expect(resultado).toEqual({ tipo: "error_servidor", error: null })
  })
})
