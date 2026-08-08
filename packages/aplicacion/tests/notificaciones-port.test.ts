/**
 * Puerto de notificaciones — contrato type-only (Issue #214, SAN-051/RN-042).
 *
 * Verifica que el puerto define correctamente:
 * - `listarPendientes(fincaId, usuarioId, hoy)` filtra `activo=1` y `leida=0`,
 *   ventana ≥ hoy.
 * - `listarPreferencias(usuarioId)` left-join con defaults.
 * - `obtenerPreferencia(usuarioId, tipo)`.
 * - `marcarLeida(notificacionId)`.
 * - `insertarNotificacionesEnTx(tx, notificaciones)` dentro de la transacción
 *   externa (D1 server-first).
 *
 * Type-only: sin I/O real; verifica la forma de los tipos (TS-003).
 */
import { describe, expect, it } from "vitest"
import type {
  NotificacionSanidad,
  NotificacionesEscrituraPort,
  NotificacionesLecturaPort,
  PreferenciaNotificacion,
} from "../src/puertos/notificaciones-port.js"

describe("NotificacionesLecturaPort: contrato type-only", () => {
  it("define listarPendientes con la forma correcta", () => {
    const port: NotificacionesLecturaPort = {
      listarPendientes: async () => [],
      listarPreferencias: async () => [],
      obtenerPreferencia: async () => null,
      marcarLeida: async () => {},
    }

    expect(typeof port.listarPendientes).toBe("function")
    expect(typeof port.listarPreferencias).toBe("function")
    expect(typeof port.obtenerPreferencia).toBe("function")
    expect(typeof port.marcarLeida).toBe("function")
  })

  it("listarPendientes devuelve NotificacionSanidad[] serializable", async () => {
    const port: NotificacionesLecturaPort = {
      listarPendientes: async () => [
        {
          id: "notif-1",
          fincaId: "finca-1",
          tipo: "refuerzo_vacuna",
          titulo: "Refuerzo pendiente",
          mensaje: "Vacuna aftosa vence el 15/08",
          entidadTipo: "aplicacion_sanitaria",
          entidadId: "apl-1",
          leida: 0,
          fechaEvento: 1755206400, // 2026-08-15T00:00:00Z epoch
        },
      ],
      listarPreferencias: async () => [],
      obtenerPreferencia: async () => null,
      marcarLeida: async () => {},
    }

    const resultado = await port.listarPendientes("finca-1", "user-1", "2026-08-05")
    expect(resultado).toHaveLength(1)
    expect(resultado[0]?.tipo).toBe("refuerzo_vacuna")
    expect(typeof resultado[0]?.fechaEvento).toBe("number")
  })

  it("listarPreferencias devuelve PreferenciaNotificacion[] con defaults", async () => {
    const port: NotificacionesLecturaPort = {
      listarPendientes: async () => [],
      listarPreferencias: async () => [
        {
          usuarioId: "user-1",
          tipo: "refuerzo_vacuna",
          canalInapp: 1,
          canalEmail: 1,
          canalPush: 0,
          diasAnticipacion: 7,
          activo: 1,
        },
      ],
      obtenerPreferencia: async () => null,
      marcarLeida: async () => {},
    }

    const resultado = await port.listarPreferencias("user-1")
    expect(resultado).toHaveLength(1)
    expect(resultado[0]?.diasAnticipacion).toBe(7)
  })

  it("obtenerPreferencia devuelve null cuando no existe", async () => {
    const port: NotificacionesLecturaPort = {
      listarPendientes: async () => [],
      listarPreferencias: async () => [],
      obtenerPreferencia: async () => null,
      marcarLeida: async () => {},
    }

    const resultado = await port.obtenerPreferencia("user-1", "refuerzo_vacuna")
    expect(resultado).toBeNull()
  })

  it("obtenerPreferencia devuelve la preferencia cuando existe", async () => {
    const port: NotificacionesLecturaPort = {
      listarPendientes: async () => [],
      listarPreferencias: async () => [],
      obtenerPreferencia: async () => ({
        usuarioId: "user-1",
        tipo: "refuerzo_vacuna",
        canalInapp: 1,
        canalEmail: 1,
        canalPush: 0,
        diasAnticipacion: 10,
        activo: 1,
      }),
      marcarLeida: async () => {},
    }

    const resultado = await port.obtenerPreferencia("user-1", "refuerzo_vacuna")
    expect(resultado).not.toBeNull()
    expect(resultado?.diasAnticipacion).toBe(10)
  })
})

describe("NotificacionesEscrituraPort: contrato type-only", () => {
  it("define insertarNotificacionesEnTx con la forma correcta", () => {
    const port: NotificacionesEscrituraPort = {
      insertarNotificacionesEnTx: async () => {},
    }

    expect(typeof port.insertarNotificacionesEnTx).toBe("function")
  })

  it("insertarNotificacionesEnTx acepta notificaciones con la forma correcta", async () => {
    const port: NotificacionesEscrituraPort = {
      insertarNotificacionesEnTx: async () => {},
    }

    await expect(
      port.insertarNotificacionesEnTx({} as never, [
        {
          fincaId: "finca-1",
          tipo: "refuerzo_vacuna",
          titulo: "Refuerzo pendiente",
          mensaje: "Vacuna aftosa vence el 15/08",
          entidadTipo: "aplicacion_sanitaria",
          entidadId: "apl-1",
          fechaEvento: "2026-08-08",
          usuarioId: "user-1",
        },
      ]),
    ).resolves.toBeUndefined()
  })
})
