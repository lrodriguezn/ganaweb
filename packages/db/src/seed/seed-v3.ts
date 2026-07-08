/**
 * Seed minimal para `@ganaweb/db` — adaptado de `docs/seed_v3.ts`.
 *
 * Decisión D11 (Seed Subset Extent): este script inserta SOLO las 2
 * fincas reales del seed_v3.ts fuente (finca-esperanza/GAN001 +
 * finca-roble/GAN002). NO se insertan animales — el seed_v3.ts fuente
 * tampoco lo hace, e inventar IDs (finca-demo-01, animal-a001) divergiría
 * del source-of-truth.
 *
 * ¿Por qué cero animales? La invariante RN-001 se valida en dos lugares
 * complementarios, no en el seed:
 *   - Dominio (packages/dominio/src/rn-001.ts): pure function con
 *     fixtures en memoria (TS-003) → unit test, no necesita DB.
 *   - DB (este paquete, unique index uq_animales_finca_codigo):
 *     integration test TS-004 (T4) que inserta un duplicado contra
 *     Postgres y asserta el error de unique constraint → tampoco
 *     necesita datos seed, solo una finca padre para satisfacer la FK.
 *
 * Por eso el seed se reduce a 2 fincas (suficientes para que la FK
 * de animales deje crear filas de prueba en tests) y nada más.
 *
 * Idempotencia: `onConflictDoNothing()` en ambas tablas. Re-correr
 * el seed es seguro — los IDs son TEXT PKs ('finca-esperanza' /
 * 'finca-roble') y el segundo insert hace no-op. Sin esta cláusula
 * el segundo run lanzaría 'duplicate key value violates unique
 * constraint'.
 *
 * Ejecución:
 *   pnpm --filter @ganaweb/db seed
 * Requiere DATABASE_URL en el environment (o .env en cwd).
 */

import "dotenv/config"
import { createClient } from "../client.js"
import { fincas } from "../schema/index.js"

/** Source-of-truth IDs from docs/seed_v3.ts lines 204-217. */
const FINCAS_INICIALES = [
  {
    id: "finca-esperanza",
    codigo: "GAN001",
    nombre: "La Esperanza",
  },
  {
    id: "finca-roble",
    codigo: "GAN002",
    nombre: "Hacienda El Roble",
  },
] as const

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and set DATABASE_URL, " +
        "or export it in the shell before running 'pnpm --filter @ganaweb/db seed'.",
    )
  }

  const db = createClient(databaseUrl)

  // biome-ignore lint/suspicious/noConsole: seed CLI script — stdout is the user-facing output channel.
  console.log(
    `[seed-v3] Inserting ${FINCAS_INICIALES.length} fincas (idempotent: onConflictDoNothing)…`,
  )
  await db
    .insert(fincas)
    .values([...FINCAS_INICIALES])
    .onConflictDoNothing()

  // biome-ignore lint/suspicious/noConsole: seed CLI script — stdout is the user-facing output channel.
  console.log("[seed-v3] Done. Zero animales inserted (D11).")
  process.exit(0)
}

main().catch((err: unknown) => {
  // biome-ignore lint/suspicious/noConsole: seed CLI script — stderr reports the failure to the user.
  console.error("[seed-v3] Failed:", err)
  process.exit(1)
})
