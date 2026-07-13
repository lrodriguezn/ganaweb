/**
 * TS-004 — Integration smoke test for RN-001 (uq_animales_finca_codigo).
 *
 * Objetivo: el índice único `uq_animales_finca_codigo` definido en
 * `src/schema/animales.ts` (T2) ENFORZA a nivel de DB que no se pueda
 * insertar un segundo animal con el mismo (finca_id, codigo). Este test
 * lo verifica insertando un duplicado deliberado y assertando que
 * Postgres rechaza el segundo INSERT.
 *
 * ¿Por qué un test de integración y no un unit test? La invariante
 * vive en el schema SQL (UNIQUE INDEX btree), no en código TS. Un unit
 * test que mockee el driver no probaría nada — el riesgo real es que
 * el nombre del index cambie, que la columna referenciada sea
 * incorrecta, o que la constraint no se cree al ejecutar la migration.
 * Solo un INSERT real contra Postgres expone esos fallos.
 *
 * Test-first discipline (TDD):
 *   - RED: este test fue escrito ANTES de aplicar la migration
 *     (migrations/0000_initial.sql). En ese estado, la tabla `animales`
 *     no existe o no tiene el index → el primer INSERT ya fallaría.
 *   - GREEN: tras correr `drizzle-kit migrate` (o `pnpm --filter
 *     @ganaweb/db migrate` en CI) el primer INSERT funciona y el
 *     segundo falla con PostgresError code '23505' (unique_violation).
 *
 * Local execution:
 *   - Sin Postgres: este describe se skip-ea via `describe.skipIf`.
 *   - Con Postgres: `DB_SMOKE=true pnpm --filter @ganaweb/db test:smoke`
 *     requiere DATABASE_URL apuntando a una DB donde ya se corrieron
 *     las migrations. El test crea su propia `finca-test-<uuid>` y la
 *     limpia al final, así que NO depende del seed (D11: cero animales
 *     sembrados, pero podemos crear fincas ad-hoc para el test).
 *
 * CI (PR5):
 *   - GitHub Actions con service container `postgres:17-alpine`.
 *   - Step order: pnpm install → biome ci → migrate → seed → test:smoke.
 */

import { eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createClient } from "../src/client.js"
import { animales, fincas } from "../src/schema/index.js"

// Skip todo el describe cuando no hay DB_SMOKE. La razón: el test
// requiere una conexión real a Postgres (no podemos mockear el UNIQUE
// INDEX — eso sería tautológico). En local sin Docker, el dev setea
// DB_SMOKE=true solo cuando quiere correr el smoke.
const dbSmoke = process.env.DB_SMOKE === "true"

describe.skipIf(!dbSmoke)("TS-004: unique index uq_animales_finca_codigo", () => {
  const testFincaId = `finca-test-${crypto.randomUUID()}`
  const testCodigo = `A${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`

  // Cliente dedicado al test. Creado lazy en beforeAll (no en module
  // load) para que el describe.skipIf pueda saltarlo cuando no hay
  // DB_SMOKE sin que `createClient()` lance por DATABASE_URL ausente.
  let db: ReturnType<typeof createClient>

  beforeAll(async () => {
    db = createClient(process.env.DATABASE_URL)
    // Precondición: la migration DEBE estar aplicada. Si la tabla
    // `fincas` no existe, el insert falla con "relation does not exist"
    // — eso es un fallo de CI legítimo (migrations no aplicadas),
    // no un skip.
    await db.insert(fincas).values({
      id: testFincaId,
      codigo: `TST${testFincaId.slice(-6).toUpperCase()}`,
      nombre: "Test Finca (TS-004)",
    })
  })

  afterAll(async () => {
    // Guard: si beforeAll falló (ej. DATABASE_URL ausente), db es undefined.
    if (!db) return

    // Limpieza: borrar la finca borra los animales asociados por FK
    // (ON DELETE no action → falla si hay animales; limpiamos primero).
    await db.delete(animales).where(eq(animales.fincaId, testFincaId))
    await db.delete(fincas).where(eq(fincas.id, testFincaId))

    // Cerrar la conexión para no dejar el event loop colgado en CI.
    await db.$client.end()
  })

  it("rechaza un INSERT duplicado de (fincaId, codigo) en la misma finca", async () => {
    // Primer INSERT: válido, el animal se crea.
    await db.insert(animales).values({
      id: `animal-test-${crypto.randomUUID()}`,
      fincaId: testFincaId,
      codigo: testCodigo,
      sexoKey: 1,
      estadoAnimalKey: 1,
    })

    // Segundo INSERT: mismo (fincaId, codigo) → DEBE fallar.
    // Postgres error code 23505 = unique_violation. La
    // constraint name debe matchear 'uq_animales_finca_codigo'.
    const insertDuplicado = db.insert(animales).values({
      id: `animal-test-${crypto.randomUUID()}`,
      fincaId: testFincaId,
      codigo: testCodigo, // mismo codigo que el primero
      sexoKey: 2,
      estadoAnimalKey: 1,
    })

    // Un solo await: capturar el error y assertar sus propiedades.
    try {
      await insertDuplicado
      expect.unreachable("El INSERT duplicado debió fallar con 23505")
    } catch (err) {
      // drizzle-orm wraps the original PostgresError in a higher-level
      // error. The actual PostgresError with code/constraint_name is
      // at `err.cause` (postgres.js v3.x uses constraint_name not constraint).
      const pgError = (err as { cause?: { code?: number | string; constraint_name?: string } }).cause
      expect(pgError?.code).toBe("23505")
      expect(pgError?.constraint_name).toBe("uq_animales_finca_codigo")
    }
  })

  it("permite el mismo codigo en una finca distinta (la unique es por (fincaId, codigo), no solo codigo)", async () => {
    const otraFincaId = `finca-test-otra-${crypto.randomUUID()}`
    await db.insert(fincas).values({
      id: otraFincaId,
      codigo: `TST${otraFincaId.slice(-6).toUpperCase()}`,
      nombre: "Test Finca 2 (TS-004)",
    })

    try {
      // Mismo codigo que el test anterior, distinta finca → NO debe fallar.
      await db.insert(animales).values({
        id: `animal-test-${crypto.randomUUID()}`,
        fincaId: otraFincaId,
        codigo: testCodigo,
        sexoKey: 1,
        estadoAnimalKey: 1,
      })
    } finally {
      // Limpieza: borrar la otra finca (no tiene animales porque ya
      // los borramos arriba al limpiar testFincaId; este insert es el
      // único animal suyo).
      await db.delete(animales).where(eq(animales.fincaId, otraFincaId))
      await db.delete(fincas).where(eq(fincas.id, otraFincaId))
    }
  })
})
