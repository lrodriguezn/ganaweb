/**
 * Drizzle Kit configuration for `@ganaweb/db`.
 *
 * Online-first scope (D3, Req 1): PostgreSQL only. No SQLite/WASM/OPFS
 * drivers in this package — enforced by the `no-sqlite` guard in CI
 * (grep over `wa-sqlite|OPFS|sqlite-wasm|sql\.js|better-sqlite3|...`).
 *
 * Schema files live in `src/schema/*.ts` and are re-exported through
 * `src/schema/index.ts`. Migrations are versioned under `migrations/`
 * (drizzle-kit journal + SQL files) so CI can run `drizzle-kit migrate`
 * against the ephemeral `postgres:17` service container (PR5 wires the
 * CI step; for local dev use `pnpm --filter @ganaweb/db push` to sync
 * the schema to a long-lived dev PG without writing a migration).
 *
 * DATABASE_URL is loaded lazily by `drizzle-kit` from the environment;
 * the seed script (src/seed/seed-v3.ts) loads it explicitly via dotenv
 * so `pnpm --filter @ganaweb/db seed` works without exporting env vars
 * in the developer's shell.
 */
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/ganaweb",
  },
  strict: true,
  verbose: true,
})
