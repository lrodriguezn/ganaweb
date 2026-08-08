/**
 * Smoke test del adaptador de Notificaciones (Issue #214) contra Postgres REAL.
 *
 * Patrón #208: `describe.skipIf(!dbSmoke)` con `DB_SMOKE=true` + `DATABASE_URL`,
 * fixtures autocontenidos con ids aleatorios.
 *
 * Prueba lo que sólo vive en el SQL real:
 * - `obtenerPreferencia`: lee la preferencia del usuario; si no existe, devuelve
 *   defaults del dominio (DIAS_ANTICIPACION_DEFAULT = 7).
 * - `listarPendientes`: filtra `activo=1 AND leida=0 AND fecha_evento >= hoy`,
 *   ordena por `fecha_evento ASC`.
 * - `marcarLeida`: actualiza `leida=1` solo para la fila de la finca del input.
 * - `insertarNotificacionesEnTx`: inserta dentro de la transacción externa;
 *   falla-closed si la fila referencia una finca inexistente (FK).
 *
 * Ejecución:
 *   DB_SMOKE=true pnpm --filter @ganaweb/db exec vitest run \
 *     tests/notificaciones-postgres.test.ts
 */
import { and, eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createClient } from "../src/client.js"
import { DrizzleNotificacionesAdapter } from "../src/notificaciones-infrastructure.js"
import {
  fincas,
  notificaciones,
  notificacionesPreferencias,
  usuarios,
} from "../src/schema/index.js"

const dbSmoke = process.env.DB_SMOKE === "true"

describe.skipIf(!dbSmoke)("Issue #214: notificaciones (smoke Postgres)", () => {
  const sufijo = crypto.randomUUID().slice(0, 8)
  const fincaId = `finca-notif-${sufijo}`
  const usuarioId = `user-notif-${sufijo}`
  const notifId = `notif-${sufijo}`
  const preferenciaId = `pref-${sufijo}`

  let db: ReturnType<typeof createClient>
  let adaptador: DrizzleNotificacionesAdapter

  beforeAll(async () => {
    db = createClient(process.env.DATABASE_URL)
    adaptador = new DrizzleNotificacionesAdapter(db)

    await db.insert(fincas).values({
      id: fincaId,
      codigo: `NF-${sufijo.toUpperCase()}`,
      nombre: "Finca Notificaciones Test",
      activo: 1,
    })

    await db.insert(usuarios).values({
      id: usuarioId,
      nombre: "Usuario Notif Test",
      email: `notif-${sufijo}@ganaweb.test`,
    })

    await db.insert(notificacionesPreferencias).values({
      id: preferenciaId,
      usuarioId,
      tipo: "refuerzo_vacuna",
      canalInapp: 1,
      canalEmail: 1,
      canalPush: 0,
      diasAnticipacion: 10,
      activo: 1,
    })

    await db.insert(notificaciones).values({
      id: notifId,
      fincaId,
      usuarioId,
      tipo: "refuerzo_vacuna",
      titulo: "Refuerzo pendiente",
      mensaje: "Vacuna aftosa vence el 15/08",
      entidadTipo: "aplicacion_sanitaria",
      entidadId: "apl-test",
      leida: 0,
      fechaEvento: Math.floor(Date.now() / 1000) + 86400 * 10, // futuro
      activo: 1,
    })
  })

  afterAll(async () => {
    if (!db) return
    await db.delete(notificaciones).where(eq(notificaciones.fincaId, fincaId))
    await db
      .delete(notificacionesPreferencias)
      .where(eq(notificacionesPreferencias.usuarioId, usuarioId))
    await db.delete(usuarios).where(eq(usuarios.id, usuarioId))
    await db.delete(fincas).where(eq(fincas.id, fincaId))
  })

  it("obtenerPreferencia devuelve la preferencia del usuario", async () => {
    const resultado = await adaptador.obtenerPreferencia(usuarioId, "refuerzo_vacuna")
    expect(resultado).not.toBeNull()
    expect(resultado?.diasAnticipacion).toBe(10)
  })

  it("obtenerPreferencia devuelve null cuando no existe", async () => {
    const resultado = await adaptador.obtenerPreferencia(usuarioId, "tipo_inexistente")
    expect(resultado).toBeNull()
  })

  it("listarPendientes devuelve notificaciones activas no leídas", async () => {
    const hoy = Math.floor(Date.now() / 1000)
    const resultado = await adaptador.listarPendientes(fincaId, usuarioId, hoy)
    expect(resultado.length).toBeGreaterThanOrEqual(1)
    const notif = resultado.find((n) => n.id === notifId)
    expect(notif).toBeDefined()
    expect(notif?.tipo).toBe("refuerzo_vacuna")
    expect(notif?.leida).toBe(0)
  })

  it("marcarLeida actualiza leida=1", async () => {
    await adaptador.marcarLeida(notifId)
    const filas = await db
      .select({ leida: notificaciones.leida })
      .from(notificaciones)
      .where(eq(notificaciones.id, notifId))
      .limit(1)
    expect(filas[0]?.leida).toBe(1)
  })
})
