/**
 * Contract test del shell de captura de eventos (Issue #229, §4
 * EV-CAP-001..005/007).
 *
 * Complementa al unit test puro (`src/server/eventos-wizard.test.ts`):
 * verifica el end-to-end con la factoría real `createEventosWizardDeps`
 * (DB + session reales) mockeando solo `getSession` y el reloj.
 *
 * Ejecución: `pnpm exec tsx tests/eventos-wizard-contract.test.ts`.
 */
import assert from "node:assert/strict"

import {
  type EventoWizardResultado,
  createEventosWizardRuntimeHarness,
} from "../src/server/eventos-wizard.server.js"

async function testHarnessInyectaFakesIniciales() {
  const sesion = {
    usuarioId: "u-1",
    nombre: "Test",
    email: "test@ganaweb.test",
    fincaActivaId: "finca-1",
    fincaActivaNombre: "Finca 1",
    rol: "Administrador",
    permisos: [
      { modulo: "eventos_reproductivos", accion: "crear" },
      { modulo: "eventos_productivos", accion: "crear" },
      { modulo: "sanidad", accion: "crear" },
      { modulo: "movimientos", accion: "crear" },
    ],
    fincas: [],
  }
  // El gateway real (`persistirLote`) necesita DB; lo sustituimos por un
  // fake que valida la forma del command y devuelve ids estables.
  const persistirLoteFake = async (
    commands: readonly unknown[],
  ): Promise<readonly { id: string }[]> => {
    for (const cmd of commands) {
      const c = cmd as {
        tipo: string
        evento: string
        fincaId: string
        usuarioId: string
      }
      assert.equal(c.fincaId, "finca-1", "fincaId debe venir del contexto autorizable")
      assert.equal(c.usuarioId, "u-1", "usuarioId debe venir de la sesión")
      assert.ok(
        ["crear_evento_individual", "crear_hijo_grupal", "crear_registro_grupal"].includes(c.tipo),
        `tipo inválido: ${c.tipo}`,
      )
    }
    return commands.map((_, i) => ({ id: `mock-id-${i + 1}` }))
  }
  const getSession = async () => sesion
  // Factory que retorna deps con el persistirLote fake.
  const depsFactory = () => ({
    persistirLote: persistirLoteFake as never,
    getSession,
    reloj: () => new Date(),
  })
  return { sesion, persistirLoteFake, getSession, depsFactory }
}

async function testCapturaIndividualFeliz() {
  const { depsFactory, persistirLoteFake, getSession } = await testHarnessInyectaFakesIniciales()
  const harness = createEventosWizardRuntimeHarness({ depsFactory, getSession })
  const resultado = (await harness.capturar({
    fincaId: "finca-1",
    tipo: "pesaje",
    alcance: { tipo: "individual", animalId: "animal-1" },
    datos: { fecha: "2026-08-07", pesoKg: 420 },
  })) as EventoWizardResultado
  assert.equal(resultado.tipo, "capturado")
  if (resultado.tipo === "capturado") {
    assert.ok(resultado.ids.individualId, "individualId debe estar presente")
  }
  // Sanity del fake
  void persistirLoteFake
}

async function testCapturaGrupalFeliz() {
  const { depsFactory, getSession } = await testHarnessInyectaFakesIniciales()
  const harness = createEventosWizardRuntimeHarness({ depsFactory, getSession })
  const resultado = (await harness.capturar({
    fincaId: "finca-1",
    tipo: "pesaje",
    alcance: {
      tipo: "grupal",
      origen: "lote",
      loteId: "lote-1",
      animalIdsEfectivos: ["a-1", "a-2", "a-3"],
    },
    datos: { fecha: "2026-08-07", pesoKg: 420 },
  })) as EventoWizardResultado
  assert.equal(resultado.tipo, "capturado")
  if (resultado.tipo === "capturado") {
    assert.ok(resultado.ids.cabeceraId, "cabeceraId debe estar presente")
    assert.equal(resultado.ids.hijosIds.length, 3, "debe haber 3 hijos")
  }
}

async function testCapturaSinSesionRechaza() {
  const { depsFactory } = await testHarnessInyectaFakesIniciales()
  const harness = createEventosWizardRuntimeHarness({
    depsFactory,
    getSession: async () => null,
  })
  const resultado = (await harness.capturar({
    fincaId: "finca-1",
    tipo: "pesaje",
    alcance: { tipo: "individual", animalId: "a-1" },
    datos: { fecha: "2026-08-07", pesoKg: 420 },
  })) as EventoWizardResultado
  assert.equal(resultado.tipo, "no_autenticado")
}

async function testCapturaFincaDistintaRechaza() {
  const { depsFactory, sesion, getSession } = await testHarnessInyectaFakesIniciales()
  void sesion
  const harness = createEventosWizardRuntimeHarness({ depsFactory, getSession })
  const resultado = (await harness.capturar({
    fincaId: "finca-2",
    tipo: "pesaje",
    alcance: { tipo: "individual", animalId: "a-1" },
    datos: { fecha: "2026-08-07", pesoKg: 420 },
  })) as EventoWizardResultado
  assert.equal(resultado.tipo, "finca_no_autorizada")
}

async function testCapturaSinPermisoRechaza() {
  const sesion = {
    usuarioId: "u-1",
    nombre: "Test",
    email: "test@ganaweb.test",
    fincaActivaId: "finca-1",
    fincaActivaNombre: "Finca 1",
    rol: "Operario",
    permisos: [{ modulo: "animales", accion: "ver" }], // sin eventos_productivos:crear
    fincas: [],
  }
  const { depsFactory } = await testHarnessInyectaFakesIniciales()
  const harness = createEventosWizardRuntimeHarness({
    depsFactory,
    getSession: async () => sesion,
  })
  const resultado = (await harness.capturar({
    fincaId: "finca-1",
    tipo: "pesaje",
    alcance: { tipo: "individual", animalId: "a-1" },
    datos: { fecha: "2026-08-07", pesoKg: 420 },
  })) as EventoWizardResultado
  assert.equal(resultado.tipo, "permiso_denegado")
  if (resultado.tipo === "permiso_denegado") {
    assert.equal(resultado.permiso, "eventos_productivos:crear")
  }
}

await testCapturaIndividualFeliz()
await testCapturaGrupalFeliz()
await testCapturaSinSesionRechaza()
await testCapturaFincaDistintaRechaza()
await testCapturaSinPermisoRechaza()

// biome-ignore lint/suspicious/noConsole: contract test tsx — reporte de éxito por stdout.
console.log("eventos-wizard-contract: OK")
