import assert from "node:assert/strict"

import type { AnimalMobileListReadResult } from "@ganaweb/aplicacion"

import { mapAnimalMobileListDbRow } from "@ganaweb/db/animal-mobile-list-infrastructure"

import { parseAnimalMobileListQuery } from "../src/server/animal-mobile-list-contract.js"
import { createAnimalMobileListHttpHandler } from "../src/server/animal-mobile-list-http.js"
import { createAnimalE2eMobileListReadPort } from "../src/server/e2e-animals-fixture.server.js"

function testParserDefaults() {
  assert.deepEqual(parseAnimalMobileListQuery(new URLSearchParams("")), {
    ok: true,
    value: { page: 1, pageSize: 25, q: null, filters: [] },
  })
  assert.deepEqual(parseAnimalMobileListQuery(new URLSearchParams("page=3&pageSize=30")), {
    ok: true,
    value: { page: 3, pageSize: 30, q: null, filters: [] },
  })
  assert.deepEqual(parseAnimalMobileListQuery(new URLSearchParams("pageSize=20")), {
    ok: true,
    value: { page: 1, pageSize: 20, q: null, filters: [] },
  })
}

function testParserPageSizeWhitelist() {
  for (const raw of ["50", "100", "0", "abc", "25.5", "-20"]) {
    assert.deepEqual(
      parseAnimalMobileListQuery(new URLSearchParams(`pageSize=${raw}`)),
      {
        ok: false,
        error: { campo: "pageSize", motivo: "pageSize debe ser 20, 25 o 30" },
      },
      `pageSize=${raw} must be rejected`,
    )
  }
}

function testParserPageValidation() {
  for (const raw of ["0", "-1", "1.5", "abc"]) {
    assert.deepEqual(
      parseAnimalMobileListQuery(new URLSearchParams(`page=${raw}`)),
      {
        ok: false,
        error: { campo: "page", motivo: "page debe ser un entero positivo" },
      },
      `page=${raw} must be rejected`,
    )
  }
}

function testParserQueryValidation() {
  assert.deepEqual(parseAnimalMobileListQuery(new URLSearchParams("q=")), {
    ok: false,
    error: { campo: "q", motivo: "q no puede estar vacío" },
  })
  assert.deepEqual(parseAnimalMobileListQuery(new URLSearchParams("q=%20%20")), {
    ok: false,
    error: { campo: "q", motivo: "q no puede estar vacío" },
  })
  assert.deepEqual(parseAnimalMobileListQuery(new URLSearchParams("q=%20MT-12%20")), {
    ok: true,
    value: { page: 1, pageSize: 25, q: "MT-12", filters: [] },
  })
}

function testParserFilters() {
  const valid = parseAnimalMobileListQuery(
    new URLSearchParams(
      "f.categoriaReproductivaKey=in:prenada&f.saludKey=in:1&f.propietarioId=in:prop-1",
    ),
  )
  assert.deepEqual(valid, {
    ok: true,
    value: {
      page: 1,
      pageSize: 25,
      q: null,
      filters: [
        { key: "categoriaReproductivaKey", value: "prenada" },
        { key: "saludKey", value: "1" },
        { key: "propietarioId", value: "prop-1" },
      ],
    },
  })

  for (const categoria of ["gestante", "PRENADA", "prenada,parida", ""]) {
    assert.deepEqual(
      parseAnimalMobileListQuery(new URLSearchParams(`f.categoriaReproductivaKey=in:${categoria}`)),
      {
        ok: false,
        error: { campo: "f.categoriaReproductivaKey", motivo: "Valor de filtro no permitido" },
      },
      `categoriaReproductivaKey=${categoria} must be rejected`,
    )
  }

  for (const salud of ["2", "sano", "0,1", ""]) {
    assert.deepEqual(
      parseAnimalMobileListQuery(new URLSearchParams(`f.saludKey=in:${salud}`)),
      {
        ok: false,
        error: { campo: "f.saludKey", motivo: "Valor de filtro no permitido" },
      },
      `saludKey=${salud} must be rejected`,
    )
  }

  for (const propietario of ["", "a,b"]) {
    assert.deepEqual(
      parseAnimalMobileListQuery(new URLSearchParams(`f.propietarioId=in:${propietario}`)),
      {
        ok: false,
        error: { campo: "f.propietarioId", motivo: "Valor de filtro no permitido" },
      },
      `propietarioId=${propietario} must be rejected`,
    )
  }

  assert.deepEqual(parseAnimalMobileListQuery(new URLSearchParams("f.saludKey=contains:1")), {
    ok: false,
    error: { campo: "f.saludKey", motivo: "Valor de filtro no permitido" },
  })
  assert.deepEqual(parseAnimalMobileListQuery(new URLSearchParams("f.saludKey=1")), {
    ok: false,
    error: { campo: "f.saludKey", motivo: "Valor de filtro no permitido" },
  })

  // Unknown f.* keys mirror the desktop parser: 400 with the offending param.
  assert.deepEqual(parseAnimalMobileListQuery(new URLSearchParams("f.unknown=in:value")), {
    ok: false,
    error: { campo: "f.unknown", motivo: "Filtro no permitido" },
  })
  assert.deepEqual(parseAnimalMobileListQuery(new URLSearchParams("f.sexoKey=in:1")), {
    ok: false,
    error: { campo: "f.sexoKey", motivo: "Filtro no permitido" },
  })

  // Unknown non-filter params are ignored (desktop parity).
  assert.deepEqual(parseAnimalMobileListQuery(new URLSearchParams("sort=codigo:asc&cols=codigo")), {
    ok: true,
    value: { page: 1, pageSize: 25, q: null, filters: [] },
  })
}

function testMapperCategoriaReproductiva() {
  const base = {
    id: "animal-1",
    codigo: "MT-130",
    nombre: "Torito",
    sexo_key: 0,
    sexo_label: "Macho",
    salud_animal_key: 0,
    salud_label: "Sano",
    es_de_monta: 0,
  }

  const macho = mapAnimalMobileListDbRow({ ...base, categoria_reproductiva: "no_aplica" })
  assert.equal(macho.categoriaReproductiva, null, "no_aplica must map to null (MT-130)")
  assert.equal(
    mapAnimalMobileListDbRow({ ...base, categoria_reproductiva: null }).categoriaReproductiva,
    null,
  )
  assert.equal(
    mapAnimalMobileListDbRow({ ...base, categoria_reproductiva: "gestante" }).categoriaReproductiva,
    null,
    "unknown stored values must map to null, never an invented label",
  )

  assert.deepEqual(
    mapAnimalMobileListDbRow({ ...base, categoria_reproductiva: "prenada" }).categoriaReproductiva,
    { key: "prenada", label: "Preñada" },
  )
  assert.deepEqual(
    mapAnimalMobileListDbRow({
      ...base,
      categoria_reproductiva: "vacia",
      sexo_key: 1,
      sexo_label: "Hembra",
    }).categoriaReproductiva,
    { key: "vacia", label: "Vacía" },
  )
  assert.deepEqual(
    mapAnimalMobileListDbRow({ ...base, categoria_reproductiva: "servida" }).categoriaReproductiva,
    { key: "servida", label: "Servida" },
  )
  assert.deepEqual(
    mapAnimalMobileListDbRow({ ...base, categoria_reproductiva: "parida" }).categoriaReproductiva,
    { key: "parida", label: "Parida" },
  )
  assert.deepEqual(
    mapAnimalMobileListDbRow({ ...base, categoria_reproductiva: "novilla" }).categoriaReproductiva,
    { key: "novilla", label: "Novilla" },
  )
}

function testMapperMadre() {
  const base = {
    id: "animal-1",
    codigo: "MT-130",
    nombre: "Torito",
    sexo_key: 1,
    sexo_label: "Hembra",
    salud_animal_key: 0,
    salud_label: "Sano",
    es_de_monta: 0,
    categoria_reproductiva: null,
  }

  // madre_id present → resolved codigo + nombre from the madre row.
  assert.deepEqual(
    mapAnimalMobileListDbRow({
      ...base,
      madre_id: "madre-1",
      codigo_madre: "LEGACY-1",
      madre_codigo_join: "MADRE-001",
      madre_nombre_join: "Matilda",
    }).madre,
    { codigo: "MADRE-001", nombre: "Matilda" },
    "madre_id wins over codigo_madre",
  )

  // madre_id present but madre has no nombre → nombre null.
  assert.deepEqual(
    mapAnimalMobileListDbRow({
      ...base,
      madre_id: "madre-1",
      madre_codigo_join: "MADRE-002",
      madre_nombre_join: "",
    }).madre,
    { codigo: "MADRE-002", nombre: null },
  )

  // Only codigo_madre (externa/IA) → nombre null.
  assert.deepEqual(mapAnimalMobileListDbRow({ ...base, codigo_madre: "EXT-999" }).madre, {
    codigo: "EXT-999",
    nombre: null,
  })

  // Neither codigo_madre nor madre_id → null.
  assert.equal(mapAnimalMobileListDbRow({ ...base, codigo_madre: "" }).madre, null)
  assert.equal(mapAnimalMobileListDbRow(base).madre, null)
}

function testMapperSexoSaludKeyLabels() {
  const row = mapAnimalMobileListDbRow({
    id: "animal-1",
    codigo: "MT-130",
    nombre: null,
    sexo_key: 1,
    sexo_label: "Hembra",
    salud_animal_key: 0,
    salud_label: "Sano",
    es_de_monta: 1,
    categoria_reproductiva: "novilla",
  })
  assert.deepEqual(row.sexo, { key: "1", label: "Hembra" })
  assert.deepEqual(row.salud, { key: "0", label: "Sano" })
  assert.equal(row.nombre, "", "nombre ausente must serialize as ''")
  assert.equal(row.esDeMonta, true)

  // Missing catalog row: visible fallback, never an invented label (desktop
  // `Desconocido (<key>)` pattern, see resolveAnimalOrigen).
  const orphan = mapAnimalMobileListDbRow({
    id: "animal-2",
    codigo: "MT-131",
    nombre: "",
    sexo_key: 9,
    sexo_label: null,
    salud_animal_key: 7,
    salud_label: null,
    es_de_monta: 0,
    categoria_reproductiva: null,
  })
  assert.deepEqual(orphan.sexo, { key: "9", label: "Desconocido (9)" })
  assert.deepEqual(orphan.salud, { key: "7", label: "Desconocido (7)" })
}

function testMapperNullableFields() {
  const row = mapAnimalMobileListDbRow({
    id: "animal-1",
    codigo: "MT-132",
    nombre: "",
    sexo_key: 0,
    sexo_label: "Macho",
    salud_animal_key: 1,
    salud_label: "Enfermo",
    es_de_monta: 0,
    categoria_reproductiva: null,
    raza_id: null,
    raza_nombre: null,
    propietario_id: null,
    propietario_nombre: null,
  })
  assert.equal(row.raza, null)
  assert.equal(row.propietario, null)
  assert.equal(row.madre, null)
  assert.equal(row.categoriaReproductiva, null)
  assert.deepEqual(row.salud, { key: "1", label: "Enfermo" })

  const linked = mapAnimalMobileListDbRow({
    id: "animal-2",
    codigo: "MT-133",
    nombre: "Con Raza",
    sexo_key: 1,
    sexo_label: "Hembra",
    salud_animal_key: 0,
    salud_label: "Sano",
    es_de_monta: 0,
    categoria_reproductiva: "parida",
    raza_id: "raza-1",
    raza_nombre: "Holstein",
    propietario_id: "prop-1",
    propietario_nombre: "Don José",
  })
  assert.deepEqual(linked.raza, { id: "raza-1", label: "Holstein" })
  assert.deepEqual(linked.propietario, { id: "prop-1", label: "Don José" })
}

const stubResult: AnimalMobileListReadResult = {
  data: [
    {
      id: "animal-1",
      codigo: "MT-122",
      nombre: "Matilda",
      sexo: { key: "1", label: "Hembra" },
      raza: null,
      categoriaReproductiva: null,
      salud: { key: "0", label: "Sano" },
      esDeMonta: false,
      propietario: null,
      madre: null,
    },
  ],
  page: 1,
  pageSize: 25,
  total: 1,
  totalSinFiltro: 1,
  hayMas: false,
}

function handlerWith(
  overrides: Partial<Parameters<typeof createAnimalMobileListHttpHandler>[0]> = {},
) {
  return createAnimalMobileListHttpHandler({
    getUsuarioId: async () => "usuario-1",
    readPort: { listar: async () => stubResult },
    isForbidden: () => false,
    requestId: () => "req-mobile-1",
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
        return stubResult
      },
    },
  })({
    request: new Request("http://test/api/fincas/finca-1/animales/mobile?pageSize=50"),
    fincaId: "finca-1",
  })
  assert.equal(response400.status, 400)
  assert.deepEqual(await response400.json(), {
    error: "Solicitud inválida",
    campo: "pageSize",
    motivo: "pageSize debe ser 20, 25 o 30",
    requestId: "req-mobile-1",
  })
  assert.equal(sessionReads, 0, "400 must not read the session")
  assert.equal(listingReads, 0, "400 must not read animal data")

  const unauthenticated = await handlerWith({ getUsuarioId: async () => null })({
    request: new Request("http://test/api/fincas/finca-a/animales/mobile"),
    fincaId: "finca-a",
  })
  assert.equal(unauthenticated.status, 403)
  assert.deepEqual(await unauthenticated.json(), {
    error: "Acceso denegado",
    campo: null,
    motivo: "No autorizado",
    requestId: "req-mobile-1",
  })

  const forbidden = await handlerWith({
    readPort: { listar: async () => Promise.reject(new Error("forbidden")) },
    isForbidden: (error) => error instanceof Error && error.message === "forbidden",
  })({
    request: new Request("http://test/api/fincas/finca-b/animales/mobile"),
    fincaId: "finca-b",
  })
  assert.equal(forbidden.status, 403)

  for (const failure of [
    new Error("password=secret"),
    Object.assign(new Error("deadline"), { name: "TimeoutError" }),
  ]) {
    const response = await handlerWith({
      readPort: { listar: async () => Promise.reject(failure) },
    })({
      request: new Request("http://test/api/fincas/finca-1/animales/mobile"),
      fincaId: "finca-1",
    })
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), {
      error: "Error interno",
      campo: null,
      motivo: "No fue posible consultar los animales",
      requestId: "req-mobile-1",
    })
  }

  const response = await handlerWith()({
    request: new Request(
      "http://test/api/fincas/finca-1/animales/mobile?page=1&pageSize=25&q=MT-12",
    ),
    fincaId: "finca-1",
  })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.deepEqual(body, stubResult)
  assert.equal(Object.keys(body.data[0]).length, 10, "mobile row exposes only the 10 card fields")
  assert.equal(body.hayMas, false)

  // Session resolution runs inside the error boundary (desktop #112 parity):
  // a degraded session throw maps to sanitized 500 + reportError, no data read.
  let degradedReportCalls = 0
  let degradedListingReads = 0
  const degradedSession = await handlerWith({
    getUsuarioId: async () => {
      throw new Error("password=secret connection refused")
    },
    readPort: {
      listar: async () => {
        degradedListingReads += 1
        return stubResult
      },
    },
    reportError: () => {
      degradedReportCalls += 1
    },
  })({
    request: new Request("http://test/api/fincas/finca-1/animales/mobile"),
    fincaId: "finca-1",
  })
  assert.equal(degradedSession.status, 500)
  assert.deepEqual(await degradedSession.json(), {
    error: "Error interno",
    campo: null,
    motivo: "No fue posible consultar los animales",
    requestId: "req-mobile-1",
  })
  assert.equal(degradedReportCalls, 1)
  assert.equal(degradedListingReads, 0)

  // Forbidden-classified failures during session resolution map to 403 and
  // never call reportError (authorization denial stays fail-closed).
  let forbiddenSessionReportCalls = 0
  const forbiddenSession = await handlerWith({
    getUsuarioId: async () => {
      throw new Error("forbidden")
    },
    isForbidden: (error) => error instanceof Error && error.message === "forbidden",
    reportError: () => {
      forbiddenSessionReportCalls += 1
    },
  })({
    request: new Request("http://test/api/fincas/finca-c/animales/mobile"),
    fincaId: "finca-c",
  })
  assert.equal(forbiddenSession.status, 403)
  assert.equal(forbiddenSessionReportCalls, 0)
}

async function testE2eFixtureReplaysTheMobileContract() {
  const result = await createAnimalE2eMobileListReadPort().listar({
    usuarioId: "usuario-operario",
    fincaId: "finca-1",
    page: 1,
    pageSize: 25,
    q: "MT-122",
    filters: [],
  })

  assert.equal(result.total, 1)
  assert.equal(result.totalSinFiltro, 1)
  assert.equal(result.hayMas, false)
  assert.deepEqual(result.data[0], {
    id: "animal-1",
    codigo: "MT-122",
    nombre: "Matilda",
    sexo: { key: "1", label: "Hembra" },
    raza: null,
    categoriaReproductiva: null,
    salud: { key: "0", label: "Sano" },
    esDeMonta: false,
    propietario: null,
    madre: null,
  })

  const empty = await createAnimalE2eMobileListReadPort().listar({
    usuarioId: "usuario-operario",
    fincaId: "finca-distinta",
    page: 1,
    pageSize: 20,
    q: null,
    filters: [],
  })
  assert.equal(empty.total, 0)
  assert.equal(empty.totalSinFiltro, 0)
  assert.equal(empty.hayMas, false)
}

testParserDefaults()
testParserPageSizeWhitelist()
testParserPageValidation()
testParserQueryValidation()
testParserFilters()
testMapperCategoriaReproductiva()
testMapperMadre()
testMapperSexoSaludKeyLabels()
testMapperNullableFields()
await testHttpContract()
await testE2eFixtureReplaysTheMobileContract()

// biome-ignore lint/suspicious/noConsole: focused TDD harness progress output
console.log("✅ animal-mobile-list-server-contract.test.ts passed")
