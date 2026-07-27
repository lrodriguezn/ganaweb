import assert from "node:assert/strict"

import {
  ANIMAL_LIST_COLUMNS,
  apiError,
  mapAnimalListadoRow,
  parseAnimalListadoQuery,
} from "../src/server/animal-list-contract.js"

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

testRegistryAndNullableRow()
testParserDefaultsAndNormalizedColumns()
testInvalidGrammar()
testErrorEnvelope()

// biome-ignore lint/suspicious/noConsole: focused TDD harness progress output
console.log("✅ animal-list-server-contract.test.ts passed")
