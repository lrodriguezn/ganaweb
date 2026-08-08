/**
 * Contract test del registro de aplicación de sanidad (Issue #211,
 * SAN-040..SAN-047, §13.10).
 *
 * Verifica el harness de server functions (`sanidad-registro.server.ts`) con
 * puertos falsos en memoria (TS-003) y sesión inyectada:
 * - PE-002/SAN-061: la invocación directa sin sesión o sin `sanidad:crear`
 *   se rechaza en el servidor; la finca del input se revalida (SAN-063).
 * - La unión del caso de uso `aplicarProductoSanitario` se mapea 1:1
 *   (aplicado | validacion | permiso_denegado | conflicto | error, CM-042):
 *   `aplicado` trae registroGrupalId, refuerzosAutoCompletados (RN-042) y
 *   stockDisponible (RN-041).
 * - `listarAnimales` (SAN-043) gatea por `sanidad:ver` y devuelve 1:1 la
 *   lectura del puerto EN_FINCA a la fecha.
 *
 * Ejecución: `pnpm exec tsx tests/sanidad-registro-contract.test.ts`.
 */
import assert from "node:assert/strict"

import type {
  AnimalSanidadListado,
  SanidadEscrituraPort,
  SanidadLecturaPort,
  SesionAutorizada,
} from "@ganaweb/aplicacion"
import {
  type SanidadRegistroDeps,
  createSanidadRegistroActionHarness,
} from "../src/server/sanidad-registro.server.js"

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

type ResultadoRegistro = Awaited<ReturnType<SanidadEscrituraPort["registrarAplicaciones"]>>

function fakeDeps(
  config: {
    readonly producto?: { readonly id: string; readonly fincaId: string } | null
    readonly animales?: readonly { readonly id: string; readonly fincaId: string }[]
    readonly previas?: readonly {
      readonly id: string
      readonly animalId: string
      readonly fecha: string
      readonly proximaDosis: string | null
    }[]
    readonly stock?: number
    readonly animalesEnFinca?: readonly AnimalSanidadListado[]
    readonly resultadoRegistro?: ResultadoRegistro
  } = {},
) {
  const llamadas = {
    registrarAplicaciones: [] as Parameters<SanidadEscrituraPort["registrarAplicaciones"]>,
    listarAnimalesEnFinca: [] as Array<{ fincaId: string; fecha: string }>,
  }
  const lectura: SanidadLecturaPort = {
    obtenerProducto: async (id) => {
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
    obtenerAnimales: async (ids) =>
      ids.map((id, indice) => {
        const animal = config.animales?.[indice] ?? { id, fincaId: FINCA_ID }
        return {
          id: animal.id,
          fincaId: animal.fincaId,
          estadoActual: "en_finca" as const,
          fechaNacimiento: "2021-03-12",
          fechaCompra: null,
          fechaSalida: null,
        }
      }),
    listarAplicacionesPrevias: async () => config.previas ?? [],
    obtenerStockDisponible: async () => config.stock ?? 150,
    listarEntradasAlmacen: async () => [],
    listarAnimalesEnFinca: async (fincaId, fecha) => {
      llamadas.listarAnimalesEnFinca.push({ fincaId, fecha })
      return config.animalesEnFinca ?? []
    },
  }
  const escritura: SanidadEscrituraPort = {
    registrarAplicaciones: async (entrada) => {
      llamadas.registrarAplicaciones.push(entrada)
      return (
        config.resultadoRegistro ?? {
          tipo: "aplicado",
          aplicacionIds: entrada.aplicaciones.map((_, indice) => `app-${indice + 1}`),
        }
      )
    },
    anularRegistroGrupal: async () => ({ tipo: "no_encontrado" }),
    registrarEntradaAlmacen: async () => ({ tipo: "registrada", id: "ent-1" }),
  }
  const notificaciones = {
    insertarNotificacionesEnTx: async () => {},
  }
  const deps: SanidadRegistroDeps = {
    lectura,
    escritura,
    notificaciones,
    reloj: { ahora: () => HOY },
  }
  return { deps, llamadas }
}

function harnessCon(deps: SanidadRegistroDeps, sesion: SesionAutorizada | null) {
  return createSanidadRegistroActionHarness({
    deps,
    getSession: async () => sesion,
  })
}

const CAPTURA = {
  fincaId: FINCA_ID,
  productoId: "prod-aftosa",
  dosis: 2,
  fecha: "2026-08-05",
  proximaDosis: "2027-02-05",
  animalIds: ["animal-1", "animal-2"],
  comentarios: "Vacunación lote",
} as const

async function testRegistrarSinSesionNiFinca() {
  const { deps, llamadas } = fakeDeps()

  // §13.10: la invocación directa sin sesión se rechaza en el servidor.
  const sinSesion = await harnessCon(deps, null).registrar(CAPTURA)
  assert.deepEqual(sinSesion, { tipo: "no_autenticado" })
  assert.equal(llamadas.registrarAplicaciones.length, 0)

  // SAN-063: la finca del input se confronta con la finca activa de la sesión.
  const fincaAjena = await harnessCon(
    deps,
    sesionAutorizada({ fincaActivaId: "finca-activa-otra" }),
  ).registrar(CAPTURA)
  assert.deepEqual(fincaAjena, { tipo: "finca_no_autorizada" })
  assert.equal(llamadas.registrarAplicaciones.length, 0)
}

async function testRegistrarPermisoDenegado() {
  // PE-002/SAN-061: sin sanidad:crear la invocación directa se rechaza.
  const { deps, llamadas } = fakeDeps()
  const soloVer = sesionAutorizada({ permisos: [{ modulo: "sanidad", accion: "ver" }] })

  const sinPermiso = await harnessCon(deps, soloVer).registrar(CAPTURA)
  assert.deepEqual(sinPermiso, { tipo: "permiso_denegado", permiso: "sanidad:crear" })
  assert.equal(llamadas.registrarAplicaciones.length, 0)
}

async function testRegistrarUnionMapeada() {
  // Caso feliz N>1 (SAN-040/RN-052): aplicado 1:1 con registroGrupalId,
  // refuerzosAutoCompletados (RN-042) y stockDisponible (RN-041).
  const previas = [
    { id: "app-previa-1", animalId: "animal-1", fecha: "2026-02-01", proximaDosis: "2026-08-01" },
    { id: "app-previa-2", animalId: "animal-2", fecha: "2026-02-01", proximaDosis: "2026-09-01" },
  ]
  const feliz = fakeDeps({ stock: 150, previas })
  const resultado = await harnessCon(feliz.deps, sesionAutorizada()).registrar(CAPTURA)

  assert.equal(resultado.tipo, "aplicado")
  if (resultado.tipo !== "aplicado") return
  assert.equal(resultado.aplicacionIds.length, 2)
  assert.notEqual(resultado.registroGrupalId, null)
  // RN-042: sólo el refuerzo con proxima_dosis ≤ fecha de aplicación.
  assert.deepEqual(resultado.refuerzosAutoCompletados, ["app-previa-1"])
  // RN-041: 150 − 2 dosis × 2 animales = 146.
  assert.equal(resultado.stockDisponible, 146)
  assert.equal(resultado.alertaStockNegativo, false)
  assert.equal(resultado.precioDosisSnapshot, 3500)

  // PE-006/SAN-063: la escritura recibe usuario y finca de la sesión.
  assert.equal(feliz.llamadas.registrarAplicaciones.length, 1)
  const entrada = feliz.llamadas.registrarAplicaciones[0]
  assert.equal(entrada?.fincaId, FINCA_ID)
  assert.equal(entrada?.usuarioCreadoPor, "user-admin")
  assert.equal(entrada?.aplicaciones.length, 2)

  // RN-002: fecha futura → validacion 1:1 del caso de uso.
  const fechaFutura = await harnessCon(feliz.deps, sesionAutorizada()).registrar({
    ...CAPTURA,
    fecha: "2026-08-06",
  })
  assert.equal(fechaFutura.tipo, "validacion")
  if (fechaFutura.tipo === "validacion") {
    assert.equal(fechaFutura.errores[0]?.campo, "fecha")
  }

  // conflicto y error del puerto pasan 1:1 (CM-042).
  const conflicto = fakeDeps({
    resultadoRegistro: { tipo: "conflicto", detalle: "grupo anulado concurrentemente" },
  })
  const resultadoConflicto = await harnessCon(conflicto.deps, sesionAutorizada()).registrar(CAPTURA)
  assert.deepEqual(resultadoConflicto, {
    tipo: "conflicto",
    detalle: "grupo anulado concurrentemente",
  })

  const error = fakeDeps({
    resultadoRegistro: { tipo: "error", detalle: "timeout de base de datos" },
  })
  const resultadoError = await harnessCon(error.deps, sesionAutorizada()).registrar(CAPTURA)
  assert.deepEqual(resultadoError, { tipo: "error", detalle: "timeout de base de datos" })
}

async function testListarAnimalesGateadoPorPermiso() {
  const animales: readonly AnimalSanidadListado[] = [
    { id: "animal-1", codigo: "AN-001", nombre: "Luna" },
    { id: "animal-2", codigo: "AN-002", nombre: "Sol" },
  ]

  // Sin sesión → no_autenticado; sin sanidad:ver → permiso_denegado.
  const { deps: depsSinSesion, llamadas: llamadasSinSesion } = fakeDeps({
    animalesEnFinca: animales,
  })
  const sinSesion = await harnessCon(depsSinSesion, null).listarAnimales({
    fincaId: FINCA_ID,
    fecha: "2026-08-05",
  })
  assert.deepEqual(sinSesion, { tipo: "no_autenticado" })
  assert.equal(llamadasSinSesion.listarAnimalesEnFinca.length, 0)

  const { deps: depsSinPermiso, llamadas: llamadasSinPermiso } = fakeDeps({
    animalesEnFinca: animales,
  })
  const soloCrear = sesionAutorizada({ permisos: [{ modulo: "sanidad", accion: "crear" }] })
  const sinPermiso = await harnessCon(depsSinPermiso, soloCrear).listarAnimales({
    fincaId: FINCA_ID,
    fecha: "2026-08-05",
  })
  assert.deepEqual(sinPermiso, { tipo: "permiso_denegado", permiso: "sanidad:ver" })
  assert.equal(llamadasSinPermiso.listarAnimalesEnFinca.length, 0)

  // SAN-063: la finca también se revalida en el listado.
  const { deps: depsFinca } = fakeDeps({ animalesEnFinca: animales })
  const fincaAjena = await harnessCon(
    depsFinca,
    sesionAutorizada({ fincaActivaId: "finca-activa-otra" }),
  ).listarAnimales({ fincaId: FINCA_ID, fecha: "2026-08-05" })
  assert.deepEqual(fincaAjena, { tipo: "finca_no_autorizada" })

  // Con permiso: lista 1:1 del puerto (SAN-043), con finca y fecha.
  const { deps, llamadas } = fakeDeps({ animalesEnFinca: animales })
  const lista = await harnessCon(deps, sesionAutorizada()).listarAnimales({
    fincaId: FINCA_ID,
    fecha: "2026-08-05",
  })
  assert.deepEqual(lista, { tipo: "lista", animales })
  assert.deepEqual(llamadas.listarAnimalesEnFinca, [{ fincaId: FINCA_ID, fecha: "2026-08-05" }])
}

await testRegistrarSinSesionNiFinca()
await testRegistrarPermisoDenegado()
await testRegistrarUnionMapeada()
await testListarAnimalesGateadoPorPermiso()

// biome-ignore lint/suspicious/noConsole: contract test tsx — reporte de éxito por stdout.
console.log("sanidad-registro-contract: OK")
