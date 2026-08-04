/**
 * Issue #156 — SSR resolver for the mobile animal list first page.
 *
 * The loader of `/_app/fincas/$fincaId/animales` resolves the #155 mobile
 * contract server-side through the read model (no self-fetch to its own HTTP
 * endpoint). This focused test pins the resolver contract with stubbed deps:
 *
 * - authorized session → read model page 1 / pageSize 25 / sin filtros;
 * - unauthorized session → fail-closed `permiso_denegado` without reading data;
 * - any failure (forbidden or unexpected) → fail-closed `permiso_denegado`,
 *   never a thrown loader (the desktop branch must survive a mobile failure).
 *
 * The route-view wiring is covered by `animal-listado-route-integration.test.tsx`.
 */
import assert from "node:assert/strict"

import type { AnimalMobileListReadResult } from "@ganaweb/aplicacion"
import { AnimalListadoForbiddenError } from "@ganaweb/db/animal-mobile-list-infrastructure"

import {
  crearResolverListadoMobileServer,
  resolverListadoMobileServer,
} from "../src/server/animal-mobile-list.server.js"

const resultadoPrimeraPagina: AnimalMobileListReadResult = {
  data: [
    {
      id: "animal-1",
      codigo: "MT-122",
      nombre: "Matilda",
      sexo: { key: "1", label: "Hembra" },
      raza: { id: "raza-1", label: "Holstein" },
      categoriaReproductiva: { key: "prenada", label: "Preñada" },
      salud: { key: "0", label: "Sano" },
      esDeMonta: false,
      propietario: { id: "prop-1", label: "Don Juan" },
      madre: { codigo: "MT-101", nombre: "Estrella" },
    },
  ],
  page: 1,
  pageSize: 25,
  total: 1,
  totalSinFiltro: 1,
  hayMas: false,
}

async function testSesionAutorizadaResuelveLaPrimeraPagina() {
  let requestRecibido: unknown
  const resolver = crearResolverListadoMobileServer({
    getUsuarioId: async () => "usuario-1",
    readPort: {
      listar: async (request) => {
        requestRecibido = request
        return resultadoPrimeraPagina
      },
    },
  })

  const resultado = await resolver("finca-1")
  assert.deepEqual(resultado, { tipo: "lista", resultado: resultadoPrimeraPagina })
  assert.deepEqual(requestRecibido, {
    usuarioId: "usuario-1",
    fincaId: "finca-1",
    page: 1,
    pageSize: 25,
    q: null,
    filters: [],
  })
}

async function testSesionNoAutorizadaDeniegaSinLeerDatos() {
  let lecturas = 0
  const resolver = crearResolverListadoMobileServer({
    getUsuarioId: async () => null,
    readPort: {
      listar: async () => {
        lecturas += 1
        return resultadoPrimeraPagina
      },
    },
  })

  assert.deepEqual(await resolver("finca-1"), { tipo: "permiso_denegado" })
  assert.equal(lecturas, 0, "an unauthorized session must never read animal data")
}

async function testFallosCierranDenegados() {
  const forbidden = crearResolverListadoMobileServer({
    getUsuarioId: async () => "usuario-1",
    readPort: { listar: async () => Promise.reject(new AnimalListadoForbiddenError()) },
  })
  assert.deepEqual(await forbidden("finca-1"), { tipo: "permiso_denegado" })

  const inesperado = crearResolverListadoMobileServer({
    getUsuarioId: async () => "usuario-1",
    readPort: { listar: async () => Promise.reject(new Error("connection refused")) },
  })
  assert.deepEqual(await inesperado("finca-1"), { tipo: "permiso_denegado" })

  const sesionRota = crearResolverListadoMobileServer({
    getUsuarioId: async () => {
      throw new Error("password=secret")
    },
    readPort: { listar: async () => resultadoPrimeraPagina },
  })
  assert.deepEqual(await sesionRota("finca-1"), { tipo: "permiso_denegado" })
}

async function testResolverDeRuntimeCierraDenegadoFueraDeRequest() {
  // No request context, no session cookie, no E2E env: the runtime wiring must
  // fail closed (same contract as `resolverPermisosVisualesListado`) and never
  // throw — the loader Promise.all must not take the desktop branch down.
  const resultado = await resolverListadoMobileServer("finca-1")
  assert.deepEqual(resultado, { tipo: "permiso_denegado" })
}

await testSesionAutorizadaResuelveLaPrimeraPagina()
await testSesionNoAutorizadaDeniegaSinLeerDatos()
await testFallosCierranDenegados()
await testResolverDeRuntimeCierraDenegadoFueraDeRequest()

// biome-ignore lint/suspicious/noConsole: focused TDD harness progress output
console.log("✅ animal-mobile-list-loader.test.ts passed")
