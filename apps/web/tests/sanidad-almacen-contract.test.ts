/**
 * Contract test del almacén de sanidad (Issue #210, SAN-030/SAN-031/SAN-061).
 *
 * Verifica el harness de server functions (`sanidad-almacen.server.ts`) con
 * puertos falsos en memoria (TS-003) y sesión inyectada:
 * - PE-002/SAN-061: la invocación directa sin sesión o sin permiso se
 *   rechaza en el servidor; la finca del recurso se revalida (SAN-063).
 * - La unión del caso de uso `registrarEntradaAlmacen` se mapea 1:1
 *   (registrada | validacion | permiso_denegado | conflicto | error).
 * - El listado gatea por `sanidad:ver` y devuelve las entradas del puerto.
 *
 * Ejecución: `pnpm exec tsx tests/sanidad-almacen-contract.test.ts`.
 */
import assert from "node:assert/strict"

import type {
  EntradaAlmacenListada,
  EntradaAlmacenNueva,
  SanidadEscrituraPort,
  SanidadLecturaPort,
  SesionAutorizada,
} from "@ganaweb/aplicacion"
import {
  type SanidadAlmacenDeps,
  createSanidadAlmacenActionHarness,
} from "../src/server/sanidad-almacen.server.js"

const FINCA_ID = "finca-esperanza"
const HOY = new Date("2026-08-05T12:00:00")

function sesionAutorizada(overrides: Partial<SesionAutorizada> = {}): SesionAutorizada {
  return {
    usuarioId: "user-admin",
    nombre: "Admin",
    email: "admin@ganaweb.test",
    fincaActivaId: FINCA_ID,
    fincaActivaNombre: "Finca Esperanza",
    rol: "administrador",
    permisos: [
      { modulo: "sanidad", accion: "ver" },
      { modulo: "sanidad", accion: "crear" },
    ],
    fincas: [],
    ...overrides,
  }
}

type ResultadoEntrada = Awaited<ReturnType<SanidadEscrituraPort["registrarEntradaAlmacen"]>>

function fakeDeps(
  config: {
    readonly producto?: { readonly id: string; readonly fincaId: string } | null
    readonly stock?: number
    readonly entradas?: readonly EntradaAlmacenListada[]
    readonly resultadoEntrada?: ResultadoEntrada
  } = {},
) {
  const llamadas = {
    obtenerProducto: [] as string[],
    obtenerStockDisponible: [] as string[],
    registrarEntradaAlmacen: [] as EntradaAlmacenNueva[],
    listarEntradasAlmacen: [] as string[],
  }
  const lectura: SanidadLecturaPort = {
    obtenerProducto: async (id) => {
      llamadas.obtenerProducto.push(id)
      const producto = config.producto === undefined ? { id, fincaId: FINCA_ID } : config.producto
      if (producto === null) return null
      return {
        id: producto.id,
        fincaId: producto.fincaId,
        codigo: "VAC-AFTOSA",
        descripcion: "Vacuna fiebre aftosa",
        tipoTratamiento: "vacuna",
        precioDosis: 3500,
        mlMgPorDosis: 2,
        activo: true,
      }
    },
    obtenerAnimales: async () => [],
    listarAplicacionesPrevias: async () => [],
    obtenerStockDisponible: async (productoId) => {
      llamadas.obtenerStockDisponible.push(productoId)
      return config.stock ?? 250
    },
    listarEntradasAlmacen: async (fincaId) => {
      llamadas.listarEntradasAlmacen.push(fincaId)
      return config.entradas ?? []
    },
    listarAnimalesEnFinca: async () => [],
  }
  const escritura: SanidadEscrituraPort = {
    registrarAplicaciones: async () => ({ tipo: "aplicado", aplicacionIds: [] }),
    anularRegistroGrupal: async () => ({ tipo: "no_encontrado" }),
    registrarEntradaAlmacen: async (entrada) => {
      llamadas.registrarEntradaAlmacen.push(entrada)
      return config.resultadoEntrada ?? { tipo: "registrada", id: "ent-1" }
    },
  }
  const deps: SanidadAlmacenDeps = { lectura, escritura, reloj: { ahora: () => HOY } }
  return { deps, llamadas }
}

function harnessCon(deps: SanidadAlmacenDeps, sesion: SesionAutorizada | null) {
  return createSanidadAlmacenActionHarness({
    deps,
    getSession: async () => sesion,
  })
}

async function testRegistrarSinSesionNiFinca() {
  const { deps, llamadas } = fakeDeps()

  const sinSesion = await harnessCon(deps, null).registrar({
    fincaId: FINCA_ID,
    productoId: "prod-1",
    fecha: "2026-08-05",
    dosis: 100,
  })
  assert.deepEqual(sinSesion, { tipo: "no_autenticado" })
  assert.equal(llamadas.registrarEntradaAlmacen.length, 0)

  // SAN-063: la finca del recurso se revalida contra la sesión activa.
  const fincaAjena = await harnessCon(
    deps,
    sesionAutorizada({ fincaActivaId: "finca-activa-otra" }),
  ).registrar({
    fincaId: FINCA_ID,
    productoId: "prod-1",
    fecha: "2026-08-05",
    dosis: 100,
  })
  assert.deepEqual(fincaAjena, { tipo: "finca_no_autorizada" })
  assert.equal(llamadas.registrarEntradaAlmacen.length, 0)
}

async function testRegistrarPermisosYValidacion() {
  // PE-002/SAN-061: sin sanidad:crear la invocación directa se rechaza.
  const { deps, llamadas } = fakeDeps()
  const soloVer = sesionAutorizada({ permisos: [{ modulo: "sanidad", accion: "ver" }] })

  const sinPermiso = await harnessCon(deps, soloVer).registrar({
    fincaId: FINCA_ID,
    productoId: "prod-1",
    fecha: "2026-08-05",
    dosis: 100,
  })
  assert.equal(sinPermiso.tipo, "permiso_denegado")
  assert.equal(llamadas.registrarEntradaAlmacen.length, 0)

  // RN-002: la unión de validacion del caso de uso pasa 1:1.
  const fechaFutura = await harnessCon(deps, sesionAutorizada()).registrar({
    fincaId: FINCA_ID,
    productoId: "prod-1",
    fecha: "2026-08-06",
    dosis: 100,
  })
  assert.equal(fechaFutura.tipo, "validacion")
  if (fechaFutura.tipo === "validacion") {
    assert.equal(fechaFutura.errores[0]?.campo, "fecha")
    assert.ok(fechaFutura.errores[0]?.detalle.includes("RN-002"))
  }

  // SAN-030: dosis ≤ 0 también pasa 1:1 como validacion.
  const dosisInvalida = await harnessCon(deps, sesionAutorizada()).registrar({
    fincaId: FINCA_ID,
    productoId: "prod-1",
    fecha: "2026-08-05",
    dosis: 0,
  })
  assert.equal(dosisInvalida.tipo, "validacion")
  if (dosisInvalida.tipo === "validacion") {
    assert.ok(dosisInvalida.errores.some((error) => error.campo === "dosis"))
  }
}

async function testRegistrarUnionMapeada() {
  // Caso feliz: registrada 1:1 con entradaId, stock y alerta.
  const feliz = fakeDeps({ stock: 250 })
  const resultadoFeliz = await harnessCon(feliz.deps, sesionAutorizada()).registrar({
    fincaId: FINCA_ID,
    productoId: "prod-1",
    fecha: "2026-08-05",
    dosis: 100,
    precioPorDosis: 3500,
    comentario: "Compra",
  })
  assert.deepEqual(resultadoFeliz, {
    tipo: "registrada",
    entradaId: "ent-1",
    stockDisponible: 250,
    alertaStockNegativo: false,
  })
  // PE-006/SAN-063: la escritura recibe usuario y finca de la sesión.
  assert.deepEqual(feliz.llamadas.registrarEntradaAlmacen[0], {
    fincaId: FINCA_ID,
    productoId: "prod-1",
    fecha: "2026-08-05",
    dosis: 100,
    precioPorDosis: 3500,
    comentario: "Compra",
    usuarioCreadoPor: "user-admin",
  })

  // conflicto y error del puerto pasan 1:1.
  const conflicto = fakeDeps({
    resultadoEntrada: { tipo: "conflicto", detalle: "producto eliminado" },
  })
  const resultadoConflicto = await harnessCon(conflicto.deps, sesionAutorizada()).registrar({
    fincaId: FINCA_ID,
    productoId: "prod-1",
    fecha: "2026-08-05",
    dosis: 100,
  })
  assert.deepEqual(resultadoConflicto, { tipo: "conflicto", detalle: "producto eliminado" })

  const error = fakeDeps({
    resultadoEntrada: { tipo: "error", detalle: "timeout de base de datos" },
  })
  const resultadoError = await harnessCon(error.deps, sesionAutorizada()).registrar({
    fincaId: FINCA_ID,
    productoId: "prod-1",
    fecha: "2026-08-05",
    dosis: 100,
  })
  assert.deepEqual(resultadoError, { tipo: "error", detalle: "timeout de base de datos" })
}

async function testListarGateadoPorPermiso() {
  const entradas: readonly EntradaAlmacenListada[] = [
    {
      id: "ent-1",
      productoId: "prod-1",
      fecha: "2026-08-02",
      dosis: 20,
      precioPorDosis: null,
      comentario: null,
      productoCodigo: "VAC-AFTOSA",
      productoDescripcion: "Vacuna fiebre aftosa",
    },
  ]

  // Sin sesión → no_autenticado; sin sanidad:ver → permiso_denegado.
  const { deps: depsSinSesion, llamadas: llamadasSinSesion } = fakeDeps({ entradas })
  const sinSesion = await harnessCon(depsSinSesion, null).listar({ fincaId: FINCA_ID })
  assert.deepEqual(sinSesion, { tipo: "no_autenticado" })
  assert.equal(llamadasSinSesion.listarEntradasAlmacen.length, 0)

  const { deps: depsSinPermiso, llamadas: llamadasSinPermiso } = fakeDeps({ entradas })
  const soloCrear = sesionAutorizada({ permisos: [{ modulo: "sanidad", accion: "crear" }] })
  const sinPermiso = await harnessCon(depsSinPermiso, soloCrear).listar({ fincaId: FINCA_ID })
  assert.deepEqual(sinPermiso, { tipo: "permiso_denegado", permiso: "sanidad:ver" })
  assert.equal(llamadasSinPermiso.listarEntradasAlmacen.length, 0)

  // Finca revalidada también en el listado.
  const { deps: depsFinca } = fakeDeps({ entradas })
  const fincaAjena = await harnessCon(
    depsFinca,
    sesionAutorizada({ fincaActivaId: "finca-activa-otra" }),
  ).listar({ fincaId: FINCA_ID })
  assert.deepEqual(fincaAjena, { tipo: "finca_no_autorizada" })

  // Con permiso: lista 1:1 del puerto, acotada a la finca.
  const { deps, llamadas } = fakeDeps({ entradas })
  const lista = await harnessCon(deps, sesionAutorizada()).listar({ fincaId: FINCA_ID })
  assert.deepEqual(lista, { tipo: "lista", entradas })
  assert.deepEqual(llamadas.listarEntradasAlmacen, [FINCA_ID])
}

await testRegistrarSinSesionNiFinca()
await testRegistrarPermisosYValidacion()
await testRegistrarUnionMapeada()
await testListarGateadoPorPermiso()

// biome-ignore lint/suspicious/noConsole: contract test tsx — reporte de éxito por stdout.
console.log("sanidad-almacen-contract: OK")
