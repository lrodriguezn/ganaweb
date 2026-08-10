/**
 * EWD-CA-013 transversal: payload válido para cada tipo canónico.
 *
 * La suite usa el boundary server con un gateway determinista. Cubre
 * EWD-CA-001/002/003/007/008/009/011/012/013/014; la equivalencia de la
 * Revisión UI se prueba en packages/ui/tests/evento-wizard.test.tsx.
 */
import { describe, expect, it, vi } from "vitest"

import type { SesionAutorizada } from "@ganaweb/aplicacion"

import {
  type EventoWizardWebInput,
  createEventoWizardActionHarness,
} from "./eventos-wizard.server.js"

const FINCA = "finca-matrix"
const HOY = new Date("2026-08-10T12:00:00Z")

const SESION: SesionAutorizada = {
  usuarioId: "user-matrix",
  nombre: "Matriz",
  email: "matrix@ganaweb.test",
  fincaActivaId: FINCA,
  fincaActivaNombre: "Finca matriz",
  rol: "Administrador",
  permisos: [
    { modulo: "eventos_reproductivos", accion: "crear" },
    { modulo: "eventos_productivos", accion: "crear" },
    { modulo: "sanidad", accion: "crear" },
    { modulo: "movimientos", accion: "crear" },
  ],
  fincas: [],
}

const PAYLOADS = {
  servicio: {
    fecha: "2026-08-10",
    tipo: "0",
    padreId: "padre-1",
    tipoInseminacion: "natural",
    dosis: 1,
    precio: 125.5,
    efectivo: 1,
    observaciones: "matriz",
  },
  palpacion: {
    fecha: "2026-08-10",
    diagnosticoId: "diag-1",
    resultado: "prenada",
    diasGestion: 30,
    comentarios: "matriz",
  },
  parto: { fecha: "2026-08-10", tipoParto: "normal", machos: 1, hembras: 0, muertos: 0 },
  aplicacion_sanitaria: {
    fecha: "2026-08-10",
    productoId: "producto-1",
    dosis: 0.125,
    precioDosis: 12.5,
    proximaDosis: "2026-09-10",
    comentarios: "matriz",
  },
  revision_veterinaria: {
    fecha: "2026-08-10",
    veterinarioId: "vet-1",
    diagnosticoId: "diag-1",
    tipoDiagnostico: "vitaminas",
    celoPresentado: "si",
    comentarios: "matriz",
  },
  pesaje: { fecha: "2026-08-10", pesoKg: 420.25, tipoPeso: "control", comentarios: "matriz" },
  produccion_lactea: {
    fecha: "2026-08-10",
    cantidadAm: 0,
    cantidadPm: 12.5,
    loteId: "lote-1",
    potreroId: "potrero-1",
    sectorId: "sector-1",
    grupoId: "grupo-1",
  },
  condicion_corporal: { fecha: "2026-08-10", condicionId: "cond-1", puntaje: 5 },
  venta: {
    fecha: "2026-08-10",
    motivoVentaId: "motivo-1",
    lugarVentaId: "lugar-1",
    pesoVentaKg: 500,
    precio: 0,
    comprador: "Comprador",
    comentarios: "matriz",
  },
  muerte: { fecha: "2026-08-10", causaMuerteId: "causa-1", comentarios: "matriz" },
  traslado: {
    fecha: "2026-08-10",
    potreroId: "potrero-1",
    sectorId: "sector-1",
    loteId: "lote-1",
    grupoId: "grupo-1",
    motivo: "Rotación",
  },
} as const

type Tipo = keyof typeof PAYLOADS
const TIPOS = Object.keys(PAYLOADS) as Tipo[]
const GRUPALES: readonly Tipo[] = [
  "servicio",
  "palpacion",
  "aplicacion_sanitaria",
  "revision_veterinaria",
  "pesaje",
  "produccion_lactea",
  "venta",
  "traslado",
]

function harness(persistirLote: ReturnType<typeof vi.fn>) {
  return createEventoWizardActionHarness({
    getSession: async () => SESION,
    persistirLote: persistirLote as never,
    reloj: () => HOY,
  })
}

function individual(tipo: Tipo): EventoWizardWebInput {
  return {
    fincaId: FINCA,
    tipo,
    alcance: { tipo: "individual", animalId: "animal-1" },
    datos: PAYLOADS[tipo],
  }
}

function grupal(tipo: Tipo): EventoWizardWebInput {
  return {
    fincaId: FINCA,
    tipo,
    alcance: {
      tipo: "grupal",
      origen: "manual",
      animalIdsEfectivos: ["animal-1", "animal-2"],
      excepciones: { "animal-2": { ...exceptionFor(tipo) } },
    },
    datos: PAYLOADS[tipo],
  }
}

function exceptionFor(tipo: Tipo): Record<string, string | number> {
  switch (tipo) {
    case "servicio":
      return { dosis: 2 }
    case "palpacion":
      return { diasGestion: 31 }
    case "aplicacion_sanitaria":
      return { dosis: 0.25 }
    case "revision_veterinaria":
      return { celoPresentado: "no" }
    case "pesaje":
      return { pesoKg: 435 }
    case "produccion_lactea":
      return { cantidadPm: 13.25 }
    case "venta":
      return { precio: 10 }
    case "traslado":
      return { motivo: "Pastoreo" }
    default:
      return {}
  }
}

describe("EventoWizard EWD-CA-013 — matriz server de payloads", () => {
  it.each(TIPOS)("envía el payload individual completo de %s", async (tipo) => {
    const persistirLote = vi.fn(async (commands: readonly unknown[]) =>
      commands.map((_, index) => ({ id: `id-${index + 1}` })),
    )

    const resultado = await harness(persistirLote).capturar(individual(tipo))

    expect(resultado.tipo).toBe("capturado")
    expect(persistirLote).toHaveBeenCalledTimes(1)
    const [command] = persistirLote.mock.calls[0] as [
      Array<{ evento: string; datos: Record<string, unknown> }>,
    ]
    expect(command[0]?.evento).toBe(tipo)
    expect(command[0]?.datos).toEqual(PAYLOADS[tipo])
    expect(typeof command[0]?.datos[Object.keys(PAYLOADS[tipo])[1] ?? ""]).toBe(
      typeof Object.values(PAYLOADS[tipo])[1],
    )
  })

  it.each(GRUPALES)("materializa el payload grupal completo de %s", async (tipo) => {
    const persistirLote = vi.fn(async (commands: readonly unknown[]) =>
      commands.map((_, index) => ({ id: `id-${index + 1}` })),
    )

    const resultado = await harness(persistirLote).capturar(grupal(tipo))

    expect(resultado.tipo).toBe("capturado")
    expect(persistirLote).toHaveBeenCalledTimes(1)
    const [commands] = persistirLote.mock.calls[0] as [Array<{ datos?: Record<string, unknown> }>]
    expect(commands).toHaveLength(3)
    expect(commands[1]?.datos).toEqual(PAYLOADS[tipo])
    expect(commands[2]?.datos).toEqual({ ...PAYLOADS[tipo], ...exceptionFor(tipo) })
  })

  it("rechaza campo desconocido, alcance inválido y excepción inválida antes de persistir", async () => {
    const persistirLote = vi.fn()
    const h = harness(persistirLote)

    await expect(
      h.capturar({ ...individual("pesaje"), datos: { ...PAYLOADS.pesaje, campoInventado: 1 } }),
    ).resolves.toMatchObject({ tipo: "validacion", errores: [{ campo: "campoInventado" }] })
    await expect(
      h.capturar({
        ...individual("parto"),
        alcance: { tipo: "grupal", origen: "manual", animalIdsEfectivos: ["animal-1"] },
      }),
    ).resolves.toMatchObject({ tipo: "validacion", errores: [{ campo: "alcance" }] })
    await expect(
      h.capturar({
        ...grupal("pesaje"),
        alcance: {
          tipo: "grupal",
          origen: "manual",
          animalIdsEfectivos: ["animal-1"],
          excepciones: { "animal-2": { pesoKg: 435 } },
        },
      }),
    ).resolves.toMatchObject({ tipo: "validacion", errores: [{ campo: "excepciones[animal-2]" }] })
    expect(persistirLote).not.toHaveBeenCalled()
  })
})
