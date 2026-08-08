/**
 * Contract test del dashboard Inicio (Issue #214, §13.10, SAN-063).
 *
 * Verifica el harness de server functions (`dashboard-inicio.server.ts`) con un
 * puerto falso en memoria (TS-003) y sesión inyectada:
 * - §13.10: la invocación directa sin `sanidad:ver` se rechaza en el
 *   servidor (`permiso_denegado`), aunque no pase por la UI.
 * - SAN-063/PE-002: la finca del input se revalida contra la finca activa
 *   de la sesión (`finca_no_autorizada`).
 * - Happy path devuelve `alertas` (≤ 5 con severidad y `href`) y
 *   `metricaEnfermos` (placeholder D-003).
 * - Degradación por fuente: si la consulta de refuerzos falla, se devuelven
 *   las alertas de stock con `error` por fuente (consistente con #212).
 *
 * Ejecución: `pnpm exec tsx tests/dashboard-inicio-contract.test.ts`.
 */
import assert from "node:assert/strict"

import type {
  AlertaAccionInicio,
  DashboardInicioLecturaPort,
  MetricaEnfermos,
  SesionAutorizada,
} from "@ganaweb/aplicacion"
import {
  type DashboardInicioDeps,
  createDashboardInicioActionHarness,
} from "../src/server/dashboard-inicio.server.js"

const FINCA_ID = "finca-esperanza"
const RELOJ_AHORA = new Date("2026-08-05T12:00:00Z")

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

const ALERTAS: readonly AlertaAccionInicio[] = [
  {
    id: "alerta-1",
    texto: "Vacuna aftosa vence en 3 días",
    severidad: "alerta",
    tipo: "refuerzo",
    fechaReferencia: "2026-08-08",
  },
  {
    id: "alerta-2",
    texto: "Stock de ivermectina agotado",
    severidad: "peligro",
    tipo: "stock",
    fechaReferencia: "2026-08-05",
  },
]

const METRICA_ENFERMOS: MetricaEnfermos = {
  id: "enfermos",
  label: "Enfermos",
  labelMobile: "Enfermos",
  value: "0",
  href: null,
}

function fakeDashboardInicioLectura(
  config: {
    alertas?: readonly AlertaAccionInicio[]
    metrica?: MetricaEnfermos
    error?: boolean
  } = {},
): DashboardInicioLecturaPort {
  return {
    listarAlertasRequiereAccion: async () => {
      if (config.error) throw new Error("DB timeout")
      return config.alertas ?? ALERTAS
    },
    obtenerMetricaEnfermosPlaceholder: async () => {
      return config.metrica ?? METRICA_ENFERMOS
    },
  }
}

function crearHarness(port: DashboardInicioLecturaPort) {
  return createDashboardInicioActionHarness({
    deps: { dashboard: port, reloj: { ahora: () => RELOJ_AHORA } },
    getSession: async () => sesionAutorizada(),
  })
}

async function run() {
  let passed = 0
  let failed = 0

  function test(name: string, fn: () => Promise<void>) {
    return fn()
      .then(() => {
        console.log(`  ✓ ${name}`)
        passed++
      })
      .catch((err) => {
        console.error(`  ✗ ${name}`)
        console.error(`    ${err.message}`)
        failed++
      })
  }

  console.log("\nContract test: dashboard-inicio.server.ts\n")

  await test("permiso_denegado sin sanidad:ver", async () => {
    const harness = crearHarness(fakeDashboardInicioLectura())
    const resultado = await harness.alertas({
      fincaId: FINCA_ID,
      sesion: sesionAutorizada({
        permisos: [{ modulo: "sanidad", accion: "crear" }],
      }),
    })
    assert.equal(resultado.tipo, "permiso_denegado")
  })

  await test("finca_no_autorizada cuando fincaId ≠ finca activa", async () => {
    const harness = crearHarness(fakeDashboardInicioLectura())
    const resultado = await harness.alertas({
      fincaId: "finca-ajena",
      sesion: sesionAutorizada(),
    })
    assert.equal(resultado.tipo, "finca_no_autorizada")
  })

  await test("happy path devuelve alertas y metricaEnfermos", async () => {
    const harness = crearHarness(fakeDashboardInicioLectura())
    const resultado = await harness.alertas({
      fincaId: FINCA_ID,
      sesion: sesionAutorizada(),
    })
    assert.equal(resultado.tipo, "ok")
    if (resultado.tipo === "ok") {
      assert.ok(resultado.alertas.length <= 5)
      assert.equal(resultado.metricaEnfermos.value, "0")
      assert.equal(resultado.metricaEnfermos.href, null)
    }
  })

  await test("degradación: error en alertas devuelve alertas con error", async () => {
    const harness = crearHarness(fakeDashboardInicioLectura({ error: true }))
    const resultado = await harness.alertas({
      fincaId: FINCA_ID,
      sesion: sesionAutorizada(),
    })
    assert.equal(resultado.tipo, "ok")
    if (resultado.tipo === "ok") {
      assert.equal(typeof resultado.errorDetalle, "string")
    }
  })

  console.log(`\n  ${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
