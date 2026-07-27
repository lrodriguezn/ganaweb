import assert from "node:assert/strict"

import {
  ANIMAL_LIST_COLUMNS,
  apiError,
  calculateAnimalAge,
  mapAnimalListadoRow,
  parseAnimalListadoQuery,
  resolveAnimalOrigen,
  selectLatestAnimalWeight,
} from "../src/server/animal-list-contract.js"
import { createAnimalListadoHttpHandler } from "../src/server/animal-list-http.js"

function testRegistryAndNullableRow() {
  assert.equal(ANIMAL_LIST_COLUMNS.length, 36)
  assert.deepEqual(
    ANIMAL_LIST_COLUMNS.map((column) => column[1]),
    [
      "codigo",
      "nombre",
      "sexo",
      "raza",
      "fechaNacimiento",
      "edadAnios",
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
      "codigoArete",
      "fechaCompra",
      "precioCompra",
      "pesoCompraKg",
      "tatuado",
      "herrado",
      "descornado",
      "codigoRfid",
      "potrero",
      "sector",
      "lote",
      "grupo",
      "comentarios",
      "salud",
      "categoriaReproductiva",
      "estado",
      "pesoUltimo",
      "codigoQr",
      "esDeMonta",
      "tipoExplotacion",
    ],
  )

  const row = mapAnimalListadoRow({
    id: "animal-1",
    codigo: "MT-122",
    nombre: "Matilda",
    sexo: { key: "1", label: "Hembra" },
    tatuado: false,
    herrado: false,
    descornado: false,
    esDeMonta: false,
  })
  assert.equal(row.id, "animal-1")
  assert.equal(row.raza, null)
  assert.equal(row.pesoUltimo, null)
  assert.equal(row.codigoQr, null)
  assert.equal(row.tatuado, false)
  assert.equal(row.herrado, false)
  assert.equal(row.descornado, false)
  assert.equal(row.esDeMonta, false)
}

function testParserDefaultsAndNormalizedColumns() {
  assert.deepEqual(parseAnimalListadoQuery(new URLSearchParams("cols=nombre,codigo")), {
    ok: true,
    value: {
      page: 1,
      pageSize: 25,
      sort: "codigo:asc",
      q: null,
      filters: [],
      cols: ["codigo", "nombre"],
    },
  })
}

function testInvalidGrammar() {
  assert.deepEqual(parseAnimalListadoQuery(new URLSearchParams("pageSize=30")), {
    ok: false,
    error: { campo: "pageSize", motivo: "pageSize debe ser 25, 50 o 100" },
  })
  assert.deepEqual(parseAnimalListadoQuery(new URLSearchParams("cols=codigo,codigo")), {
    ok: false,
    error: { campo: "cols", motivo: "cols no puede contener valores repetidos" },
  })
  assert.deepEqual(parseAnimalListadoQuery(new URLSearchParams("f.unknown=contains:value")), {
    ok: false,
    error: { campo: "f.unknown", motivo: "Filtro no permitido" },
  })
}

function testErrorEnvelope() {
  assert.deepEqual(apiError("Solicitud inválida", "pageSize", "Valor no permitido", "req-123"), {
    error: "Solicitud inválida",
    campo: "pageSize",
    motivo: "Valor no permitido",
    requestId: "req-123",
  })
}

function testDeterministicDerivations() {
  assert.equal(calculateAnimalAge("2020-01-01", new Date("2025-07-01T00:00:00Z")), 5.5)
  assert.equal(calculateAnimalAge(null, new Date("2025-07-01T00:00:00Z")), null)
  assert.deepEqual(
    selectLatestAnimalWeight([
      { id: "peso-1", fecha: "2025-06-15", pesoKg: 420 },
      { id: "peso-2", fecha: "2025-06-15", pesoKg: 430 },
      { id: "peso-3", fecha: "2025-05-15", pesoKg: 440 },
    ]),
    { pesoKg: 430, fecha: "2025-06-15" },
  )
  assert.equal(selectLatestAnimalWeight([]), null)
}

function testOrigenFallback() {
  assert.equal(resolveAnimalOrigen(null, null), null)
  assert.deepEqual(resolveAnimalOrigen(1, "Comprado"), { id: "1", label: "Comprado" })
  assert.deepEqual(resolveAnimalOrigen(99, null), { id: "99", label: "Desconocido (99)" })
}

function testIsIsoDateStrictness() {
  // Impossible dates must be rejected via drange grammar validation
  const impossibleDates = [
    "2026-02-31", // Feb 31 doesn't exist
    "2026-04-31", // Apr has 30 days
    "2026-02-29", // 2026 is not a leap year
    "2026-13-01", // Month 13 doesn't exist
    "2026-00-15", // Month 0 doesn't exist
    "2026-06-00", // Day 0 doesn't exist
    "2026-06-32", // Day 32 doesn't exist
  ]
  for (const badDate of impossibleDates) {
    const result = parseAnimalListadoQuery(
      new URLSearchParams(`f.fechaNacimiento=drange:${badDate},2026-03-15`),
    )
    assert.deepEqual(result, {
      ok: false,
      error: { campo: "f.fechaNacimiento", motivo: "Valor de filtro no permitido" },
    })
  }

  // Leap-year Feb 29 must be accepted
  const leapResult = parseAnimalListadoQuery(
    new URLSearchParams("f.fechaNacimiento=drange:2024-02-29,2024-03-15"),
  )
  assert.equal(leapResult.ok, true)

  // Valid drange must be accepted
  const validResult = parseAnimalListadoQuery(
    new URLSearchParams("f.fechaNacimiento=drange:2021-03-12,2021-03-20"),
  )
  assert.equal(validResult.ok, true)
  if (validResult.ok) {
    assert.equal(validResult.value.filters.length, 1)
    assert.equal(validResult.value.filters[0].grammar, "drange")
    assert.equal(validResult.value.filters[0].key, "fechaNacimiento")
    assert.equal(validResult.value.filters[0].value, "2021-03-12,2021-03-20")
  }

  // Bool grammar accepts only true/false
  assert.deepEqual(parseAnimalListadoQuery(new URLSearchParams("f.esDeMonta=bool:yes")), {
    ok: false,
    error: { campo: "f.esDeMonta", motivo: "Valor de filtro no permitido" },
  })
  const boolTrueResult = parseAnimalListadoQuery(new URLSearchParams("f.esDeMonta=bool:true"))
  assert.equal(boolTrueResult.ok, true)
}

testRegistryAndNullableRow()
testParserDefaultsAndNormalizedColumns()
testInvalidGrammar()
testErrorEnvelope()
testDeterministicDerivations()
testOrigenFallback()
testIsIsoDateStrictness()

// biome-ignore lint/suspicious/noConsole: focused TDD harness progress output
console.log("✅ animal-list-server-contract.test.ts passed")

const completeNullableResult = {
  data: [
    mapAnimalListadoRow({
      id: "animal-nullable",
      codigo: "MT-123",
      nombre: "",
      sexo: { key: "0", label: "Macho" },
      tatuado: false,
      herrado: false,
      descornado: false,
      esDeMonta: false,
    }),
  ],
  page: 1,
  pageSize: 25 as const,
  total: 1,
  totalSinFiltro: 1,
  sort: "codigo:asc",
  cols: ["codigo", "nombre"] as const,
}

function handlerWith(
  overrides: Partial<Parameters<typeof createAnimalListadoHttpHandler>[0]> = {},
) {
  return createAnimalListadoHttpHandler({
    getUsuarioId: async () => "usuario-1",
    readPort: { listar: async () => completeNullableResult },
    isForbidden: () => false,
    requestId: () => "req-http-1",
    reportError: () => {},
    ...overrides,
  })
}

async function testHttpContract() {
  let sessionReads = 0
  let listingReads = 0
  const response400 = await handlerWith({
    getUsuarioId: async () => {
      sessionReads += 1
      return "usuario-1"
    },
    readPort: {
      listar: async () => {
        listingReads += 1
        return completeNullableResult
      },
    },
  })({
    request: new Request("http://test/api/fincas/finca-1/animales?pageSize=30"),
    fincaId: "finca-1",
  })
  assert.equal(response400.status, 400)
  assert.deepEqual(await response400.json(), {
    error: "Solicitud inválida",
    campo: "pageSize",
    motivo: "pageSize debe ser 25, 50 o 100",
    requestId: "req-http-1",
  })
  assert.equal(sessionReads, 0)
  assert.equal(listingReads, 0)

  const unauthenticated = await handlerWith({ getUsuarioId: async () => null })({
    request: new Request("http://test/api/fincas/finca-a/animales"),
    fincaId: "finca-a",
  })
  const forbidden = await handlerWith({
    readPort: { listar: async () => Promise.reject(new Error("forbidden")) },
    isForbidden: (error) => error instanceof Error && error.message === "forbidden",
  })({ request: new Request("http://test/api/fincas/finca-b/animales"), fincaId: "finca-b" })

  assert.equal(forbidden.status, 403)
  assert.deepEqual(await forbidden.json(), await unauthenticated.json())

  for (const failure of [
    new Error("password=secret"),
    Object.assign(new Error("deadline"), { name: "TimeoutError" }),
  ]) {
    const response = await handlerWith({
      readPort: { listar: async () => Promise.reject(failure) },
    })({ request: new Request("http://test/api/fincas/finca-1/animales"), fincaId: "finca-1" })
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), {
      error: "Error interno",
      campo: null,
      motivo: "No fue posible consultar los animales",
      requestId: "req-http-1",
    })
  }

  const response = await handlerWith()({
    request: new Request("http://test/api/fincas/finca-1/animales?cols=nombre,codigo"),
    fincaId: "finca-1",
  })
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.deepEqual(body.cols, ["codigo", "nombre"])
  assert.equal(Object.keys(body.data[0]).length, 37)
  assert.deepEqual(
    { raza: body.data[0].raza, pesoUltimo: body.data[0].pesoUltimo, tatuado: body.data[0].tatuado },
    { raza: null, pesoUltimo: null, tatuado: false },
  )
}

await testHttpContract()
