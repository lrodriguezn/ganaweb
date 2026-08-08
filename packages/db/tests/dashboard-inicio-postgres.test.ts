/**
 * Smoke test del adaptador de Dashboard Inicio (Issue #214) contra Postgres REAL.
 *
 * Patrón #208: `describe.skipIf(!dbSmoke)` con `DB_SMOKE=true` + `DATABASE_URL`.
 *
 * Ejecución:
 *   DB_SMOKE=true pnpm --filter @ganaweb/db exec vitest run \
 *     tests/dashboard-inicio-postgres.test.ts
 */
import { eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createClient } from "../src/client.js"
import { DrizzleDashboardInicioAdapter } from "../src/dashboard-inicio-infrastructure.js"
import { fincas, usuarios } from "../src/schema/index.js"

const dbSmoke = process.env.DB_SMOKE === "true"

describe.skipIf(!dbSmoke)("Issue #214: dashboard inicio (smoke Postgres)", () => {
  const sufijo = crypto.randomUUID().slice(0, 8)
  const fincaId = `finca-dash-${sufijo}`
  const usuarioId = `user-dash-${sufijo}`

  let db: ReturnType<typeof createClient>
  let adaptador: DrizzleDashboardInicioAdapter

  beforeAll(async () => {
    db = createClient(process.env.DATABASE_URL)
    adaptador = new DrizzleDashboardInicioAdapter(db)

    await db.insert(fincas).values({
      id: fincaId,
      codigo: `DS-${sufijo.toUpperCase()}`,
      nombre: "Finca Dashboard Test",
      activo: 1,
    })

    await db.insert(usuarios).values({
      id: usuarioId,
      nombre: "Usuario Dashboard Test",
      email: `dash-${sufijo}@ganaweb.test`,
    })
  })

  afterAll(async () => {
    if (!db) return
    await db.delete(usuarios).where(eq(usuarios.id, usuarioId))
    await db.delete(fincas).where(eq(fincas.id, fincaId))
  })

  it("listarAlertasRequiereAccion devuelve array (puede ser vacío)", async () => {
    const resultado = await adaptador.listarAlertasRequiereAccion(fincaId, "2026-08-05")
    expect(Array.isArray(resultado)).toBe(true)
  })

  it("obtenerMetricaEnfermosPlaceholder devuelve placeholder D-003", async () => {
    const resultado = await adaptador.obtenerMetricaEnfermosPlaceholder()
    expect(resultado.id).toBe("enfermos")
    expect(resultado.value).toBe("0")
    expect(resultado.href).toBeNull()
  })
})
