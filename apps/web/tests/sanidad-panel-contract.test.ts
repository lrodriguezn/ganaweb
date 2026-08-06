/**
 * Contract test del read model del panel de sanidad (Issue #212,
 * SAN-001..SAN-006, §13.10, PE-001/PE-002, SAN-063).
 *
 * Verifica el harness de server functions (`sanidad-panel.server.ts`) con un
 * puerto falso en memoria (TS-003) y sesión inyectada:
 * - §13.10: la invocación directa sin `sanidad:ver` se rechaza en el
 *   servidor (`permiso_denegado`), aunque no pase por la UI.
 * - SAN-063/PE-002: la finca del input se revalida contra la finca activa
 *   de la sesión (`finca_no_autorizada`).
 * - Degradación por card: el fallo de UNA consulta devuelve `error` para esa
 *   card mientras las demás responden con normalidad — el panel nunca se
 *   cae completo.
 * - SAN-052/KPI-09: `proximas` agrupa por semana natural vía el dominio.
 * - T-001/reloj: las ventanas de fecha usan el `hoy` del reloj inyectado.
 *
 * Ejecución: `pnpm exec tsx tests/sanidad-panel-contract.test.ts`.
 */
import assert from "node:assert/strict"

import type {
  AlertaStockPanel,
  FiltrosHistorialSanidad,
  HistorialSanidadPagina,
  PanelSanidadMetricas,
  RefuerzoPendienteFila,
  SanidadPanelLecturaPort,
  SesionAutorizada,
  UltimaAplicacionPanel,
} from "@ganaweb/aplicacion"
import {
  type SanidadPanelDeps,
  createSanidadPanelActionHarness,
} from "../src/server/sanidad-panel.server.js"

const FINCA_ID = "finca-esperanza"
const RELOJ_AHORA = new Date("2026-08-05T12:00:00Z")
const HOY_ISO = "2026-08-05"

function sesionAutorizada(overrides: Partial<SesionAutorizada> = {}): SesionAutorizada {
  return {
    usuarioId: "user-admin",
    nombre: "Admin",
    email: "admin@ganaweb.test",
    fincaActivaId: FINCA_ID,
    fincaActivaNombre: "Finca Esperanza",
    rol: "administrador",
    permisos: [{ modulo: "sanidad", accion: "ver" }],
    fincas: [],
    ...overrides,
  }
}

const METRICAS: PanelSanidadMetricas = {
  aplicacionesEstaSemana: 3,
  animalesEnTratamiento: 2,
  stockCritico: 1,
  productosAgotados: 1,
}

const FILAS_REFUERZOS: readonly RefuerzoPendienteFila[] = [
  {
    productoId: "prod-aftosa",
    codigo: "VAC-AFTOSA",
    descripcion: "Vacuna fiebre aftosa",
    tipoTratamiento: "vacuna",
    animalId: "animal-1",
    proximaDosis: "2026-08-06", // esta semana
  },
  {
    productoId: "prod-aftosa",
    codigo: "VAC-AFTOSA",
    descripcion: "Vacuna fiebre aftosa",
    tipoTratamiento: "vacuna",
    animalId: "animal-2",
    proximaDosis: "2026-08-12", // próxima semana
  },
]

const ULTIMAS: readonly UltimaAplicacionPanel[] = [
  {
    id: "apl-1",
    fecha: "2026-08-04",
    productoCodigo: "VAC-AFTOSA",
    productoDescripcion: "Vacuna fiebre aftosa",
    objetivo: "animal",
    cantidadAnimales: 1,
    responsable: "María",
  },
]

const ALERTAS: readonly AlertaStockPanel[] = [
  {
    productoId: "prod-aftosa",
    codigo: "VAC-AFTOSA",
    descripcion: "Vacuna fiebre aftosa",
    dosisDisponibles: 0,
    estado: "agotado",
  },
]

const HISTORIAL: HistorialSanidadPagina = {
  filas: [
    {
      id: "apl-1",
      fecha: "2026-08-04",
      productoCodigo: "VAC-AFTOSA",
      productoDescripcion: "Vacuna fiebre aftosa",
      objetivo: "animal",
      cantidadAnimales: 1,
      animalCodigo: "AN-001",
      loteDescripcion: null,
      dosis: 2,
      responsable: "María",
    },
  ],
  total: 1,
  pagina: 1,
  tamanoPagina: 20,
}

function fakePanel(
  config: {
    readonly fallarMetricas?: boolean
    readonly fallarRefuerzos?: boolean
    readonly filasRefuerzos?: readonly RefuerzoPendienteFila[]
  } = {},
) {
  const llamadas = {
    obtenerMetricas: [] as { fincaId: string; hoy: string }[],
    listarRefuerzosPendientes: [] as { fincaId: string; hoy: string }[],
    listarUltimasAplicaciones: [] as string[],
    listarAlertasStock: [] as string[],
    listarHistorial: [] as { fincaId: string; filtros: FiltrosHistorialSanidad }[],
  }
  const panel: SanidadPanelLecturaPort = {
    obtenerMetricas: async (fincaId, hoy) => {
      llamadas.obtenerMetricas.push({ fincaId, hoy })
      if (config.fallarMetricas) throw new Error("timeout de base de datos")
      return METRICAS
    },
    listarRefuerzosPendientes: async (fincaId, hoy) => {
      llamadas.listarRefuerzosPendientes.push({ fincaId, hoy })
      if (config.fallarRefuerzos) throw new Error("connection lost")
      return config.filasRefuerzos ?? FILAS_REFUERZOS
    },
    listarUltimasAplicaciones: async (fincaId) => {
      llamadas.listarUltimasAplicaciones.push(fincaId)
      return ULTIMAS
    },
    listarAlertasStock: async (fincaId) => {
      llamadas.listarAlertasStock.push(fincaId)
      return ALERTAS
    },
    listarHistorial: async (fincaId, filtros) => {
      llamadas.listarHistorial.push({ fincaId, filtros })
      return HISTORIAL
    },
  }
  const deps: SanidadPanelDeps = { panel, reloj: { ahora: () => RELOJ_AHORA } }
  return { deps, llamadas }
}

function harnessCon(deps: SanidadPanelDeps, sesion: SesionAutorizada | null) {
  return createSanidadPanelActionHarness({
    deps,
    getSession: async () => sesion,
  })
}

async function testRbacPorPermiso() {
  // §13.10/PE-001: sin sesión → no_autenticado, sin tocar el puerto.
  const { deps, llamadas } = fakePanel()
  const sinSesion = await harnessCon(deps, null).metricas({ fincaId: FINCA_ID })
  assert.deepEqual(sinSesion, { tipo: "no_autenticado" })
  assert.equal(llamadas.obtenerMetricas.length, 0)

  // SAN-063/PE-002: finca del input ≠ finca activa → finca_no_autorizada.
  const fincaAjena = await harnessCon(
    deps,
    sesionAutorizada({ fincaActivaId: "finca-activa-otra" }),
  ).metricas({ fincaId: FINCA_ID })
  assert.deepEqual(fincaAjena, { tipo: "finca_no_autorizada" })
  assert.equal(llamadas.obtenerMetricas.length, 0)

  // §13.10: sin sanidad:ver la invocación directa se rechaza por PERMISO.
  const { deps: depsSinPermiso, llamadas: llamadasSinPermiso } = fakePanel()
  const sinPermiso = await harnessCon(
    depsSinPermiso,
    sesionAutorizada({ permisos: [{ modulo: "animales", accion: "ver" }] }),
  ).metricas({ fincaId: FINCA_ID })
  assert.deepEqual(sinPermiso, { tipo: "permiso_denegado", permiso: "sanidad:ver" })
  assert.equal(llamadasSinPermiso.obtenerMetricas.length, 0)

  // El comodín *:* (roles con todos los permisos) también decide por permiso.
  const comodin = await harnessCon(
    deps,
    sesionAutorizada({ permisos: [{ modulo: "*", accion: "*" }] }),
  ).metricas({ fincaId: FINCA_ID })
  assert.equal(comodin.tipo, "ok")
}

async function testCardsResponden() {
  const { deps, llamadas } = fakePanel()
  const harness = harnessCon(deps, sesionAutorizada())

  const metricas = await harness.metricas({ fincaId: FINCA_ID })
  assert.deepEqual(metricas, { tipo: "ok", metricas: METRICAS })

  const ultimas = await harness.ultimas({ fincaId: FINCA_ID })
  assert.deepEqual(ultimas, { tipo: "ok", aplicaciones: ULTIMAS })

  const stock = await harness.stock({ fincaId: FINCA_ID })
  assert.deepEqual(stock, { tipo: "ok", alertas: ALERTAS })

  const historial = await harness.historial({
    fincaId: FINCA_ID,
    filtros: { pagina: 1, tamanoPagina: 20 },
  })
  assert.deepEqual(historial, { tipo: "ok", pagina: HISTORIAL })
  assert.deepEqual(llamadas.listarHistorial[0], {
    fincaId: FINCA_ID,
    filtros: { pagina: 1, tamanoPagina: 20 },
  })

  // El hoy del reloj viaja a las consultas con ventana (T-001/KPI-09).
  assert.deepEqual(llamadas.obtenerMetricas[0], { fincaId: FINCA_ID, hoy: HOY_ISO })
}

async function testProximasAgrupadasPorSemana() {
  // SAN-052/KPI-09: la server function agrupa por semana natural vía dominio.
  const { deps, llamadas } = fakePanel()
  const harness = harnessCon(deps, sesionAutorizada())

  const proximas = await harness.proximas({ fincaId: FINCA_ID })
  assert.equal(proximas.tipo, "ok")
  if (proximas.tipo !== "ok") return
  assert.equal(proximas.periodos.estaSemana.length, 1)
  assert.equal(proximas.periodos.proximaSemana.length, 1)
  assert.equal(proximas.periodos.esteMes.length, 0)
  assert.deepEqual(proximas.periodos.estaSemana[0], {
    productoId: "prod-aftosa",
    codigo: "VAC-AFTOSA",
    descripcion: "Vacuna fiebre aftosa",
    proposito: "Vacuna",
    cantidadAnimales: 1,
    venceFecha: "2026-08-06",
  })
  assert.equal(proximas.periodos.proximaSemana[0]?.venceFecha, "2026-08-12")
  assert.deepEqual(llamadas.listarRefuerzosPendientes[0], { fincaId: FINCA_ID, hoy: HOY_ISO })
}

async function testDegradacionPorCard() {
  // El fallo de métricas NO tumba las demás cards (degradación por card).
  const { deps } = fakePanel({ fallarMetricas: true })
  const harness = harnessCon(deps, sesionAutorizada())

  const metricas = await harness.metricas({ fincaId: FINCA_ID })
  assert.equal(metricas.tipo, "error")
  if (metricas.tipo === "error") {
    // El detalle interno no se filtra: mensaje genérico serializable.
    assert.ok(!metricas.detalle.includes("timeout de base de datos"))
  }

  const proximas = await harness.proximas({ fincaId: FINCA_ID })
  assert.equal(proximas.tipo, "ok")
  const ultimas = await harness.ultimas({ fincaId: FINCA_ID })
  assert.equal(ultimas.tipo, "ok")
  const stock = await harness.stock({ fincaId: FINCA_ID })
  assert.equal(stock.tipo, "ok")

  // Y el fallo de otra card tampoco afecta a métricas.
  const { deps: depsRefuerzosRotos } = fakePanel({ fallarRefuerzos: true })
  const harnessRoto = harnessCon(depsRefuerzosRotos, sesionAutorizada())
  const proximasRoto = await harnessRoto.proximas({ fincaId: FINCA_ID })
  assert.equal(proximasRoto.tipo, "error")
  const metricasOk = await harnessRoto.metricas({ fincaId: FINCA_ID })
  assert.equal(metricasOk.tipo, "ok")
}

await testRbacPorPermiso()
await testCardsResponden()
await testProximasAgrupadasPorSemana()
await testDegradacionPorCard()

// biome-ignore lint/suspicious/noConsole: contract test tsx — reporte de éxito por stdout.
console.log("sanidad-panel-contract: OK")
