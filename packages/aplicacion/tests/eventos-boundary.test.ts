import { describe, expect, it } from "vitest"
import {
  EVENTOS_CANONICOS,
  EventoForbiddenError,
  type EventoWriteCommand,
  registrarEvento,
} from "../src/casos-uso/eventos/autorizar-operacion-evento.js"
import type { SesionAutorizada } from "../src/index.js"

function sesion(permisos: SesionAutorizada["permisos"]): SesionAutorizada {
  return {
    usuarioId: "u-1",
    nombre: "Operaria",
    email: "o@ganaweb.test",
    fincaActivaId: "f-1",
    fincaActivaNombre: "Finca 1",
    rol: "Operario",
    permisos,
    fincas: [],
  }
}

const command: EventoWriteCommand = {
  tipo: "crear_evento_individual",
  evento: "pesaje",
  id: "peso-1",
  fincaId: "f-1",
  usuarioId: "u-1",
  animalId: "a-1",
  datos: { fecha: "2026-08-06", pesoKg: 420 },
}

describe("mandatory event write gateway", () => {
  it("derives table, domain and permission from one canonical event type", () => {
    expect(EVENTOS_CANONICOS.pesaje).toEqual({
      tabla: "pesos",
      dominio: "productivo",
      tipoGrupal: "pesaje",
    })
    expect(EVENTOS_CANONICOS.aplicacion_sanitaria).toEqual({
      tabla: "aplicaciones_sanitarias",
      dominio: "sanidad",
      tipoGrupal: "tratamiento",
    })
    expect("dominio" in command).toBe(false)
    expect("tabla" in command).toBe(false)
  })
  it("passes the exact authorized command to a bounded persistence method", async () => {
    const received: EventoWriteCommand[] = []
    const gateway = {
      async persistir(value: EventoWriteCommand) {
        received.push(value)
        return { id: value.id }
      },
    }
    const boundary = registrarEvento(gateway)
    await expect(
      boundary({
        sesion: sesion([{ modulo: "eventos_productivos", accion: "crear" }]),
        command,
      }),
    ).resolves.toEqual({ id: "peso-1" })
    expect(received).toEqual([command])
    expect(Object.keys(gateway)).toEqual(["persistir"])
  })

  it("fails closed before persistence for foreign farms, actors and permissions", async () => {
    let calls = 0
    const boundary = registrarEvento({
      async persistir(value) {
        calls += 1
        return { id: value.id }
      },
    })
    await expect(
      boundary({ sesion: sesion([]), command: { ...command, fincaId: "f-2" } }),
    ).rejects.toMatchObject({ motivo: "finca_no_autorizada", status: 403 })
    await expect(boundary({ sesion: sesion([]), command })).rejects.toBeInstanceOf(
      EventoForbiddenError,
    )
    await expect(
      boundary({
        sesion: sesion([{ modulo: "sanidad", accion: "crear" }]),
        command,
      }),
    ).rejects.toMatchObject({
      motivo: "permiso_denegado",
      permiso: "eventos_productivos:crear",
    })
    expect(calls).toBe(0)
  })
})
