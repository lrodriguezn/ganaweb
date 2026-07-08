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

import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createClient } from "../src/client.js"
import { animales, fincas } from "../src/schema/index.js"

// Skip TODO el describe cuando no hay DB_SMOKE. La razón: el test
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
    // Limpieza: borrar la finca borra los animales asociados por FK
    // (ON DELETE no action → falla si hay animales; limpiamos primero).
    await db
      .delete(animales)
      .where(/* sql */ (await import("drizzle-orm")).eq(animales.fincaId, testFincaId))
    await db
      .delete(fincas)
      .where(/* sql */ (await import("drizzle-orm")).eq(fincas.id, testFincaId))
  })

  it("rechaza un INSERT duplicado de (fincaId, codigo) en la misma finca", async () => {
    // Primer INSERT:合法, el animal se crea.
    await db.insert(animales).values({
      id: `animal-test-${crypto.randomUUID()}`,
      fincaId: testFincaId,
      codigo: testCodigo,
      sexo: "hembra",
      estadoAnimal: "activo",
    })

    // Segundo INSERT: mismo (fincaId, codigo) → DEBE fallar.
    // Postgres error code 23505 = unique_violation. La
    // constraint name debe matchear 'uq_animales_finca_codigo'.
    const insertDuplicado = db.insert(animales).values({
      id: `animal-test-${crypto.randomUUID()}`,
      fincaId: testFincaId,
      codigo: testCodigo, // mismo codigo que el primero
      sexo: "macho",
      estadoAnimal: "activo",
    })

    await expect(insertDuplicado).rejects.toThrow()
    // Verificación adicional: el error es de unique constraint, no
    // otro tipo de fallo (FK, type mismatch, etc).
    try {
      await insertDuplicado
    } catch (err) {
      // postgres-js throws errors with a `code` property on
      // PostgresError instances.
      const pgError = err as { code?: string; constraint?: string; message?: string }
      expect(pgError.code).toBe("23505")
      expect(pgError.constraint).toBe("uq_animales_finca_codigo")
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
        sexo: "hembra",
        estadoAnimal: "activo",
      })
    } finally {
      // Limpieza: borrar la otra finca (no tiene animales，因为我们 los borramos arriba
      // al limpiar testFincaId; este insert es el único animal suyo).
      await db
        .delete(animales)
        .where((await import("drizzle-orm")).eq(animales.fincaId, otraFincaId))
      await db.delete(fincas).where((await import("drizzle-orm")).eq(fincas.id, otraFincaId))
    }
  })
})
