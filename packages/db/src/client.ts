/**
 * Cliente Drizzle para `@ganaweb/db`.
 *
 * Dos exports:
 *   1. `createClient(url?)` — factory puro. Útil para tests
 *      (cada test crea su propio client contra un Postgres
 *      efímero) y para setups que necesiten inyectar la URL
 *      explícitamente. El parámetro default a
 *      `process.env.DATABASE_URL` permite que tanto el seed
 *      script como el `db` singleton lean la misma env var.
 *   2. `db` — Proxy lazy que inicializa el client en el primer
 *      acceso. Razón: TanStack Start (PR5) y los server functions
 *      se ejecutan en serverless cold-starts; instanciar un
 *      pool `postgres` en module-load bloquearía el arranque
 *      si la DB estuviera caída. El Proxy difiere la conexión
 *      al primer SELECT real, momento en el que el fallo se
 *      reporta en la respuesta HTTP 503 (health route) o en
 *      la query concreta, en vez de tirar el proceso.
 *
 * Driver: `postgres` (postgres-js) — Drizzle lo recomienda sobre
 * `pg` para nuevos proyectos; soporta prepared statements,
 * tipos Postgres nativos (text/integer/timestamp) y conexiones
 * pooling automático. NO usar `pg` ni `pglite` (D3: online-first
 * solo, gateado por `pnpm no-sqlite` y la regla `dominio-to-io`).
 *
 * `schema` se pasa al `drizzle()` para que las queries hereden
 * los tipos de las tablas. Sin esto, `db.select().from(animales)`
 * devuelve `unknown[]` en vez de `Animal[]`.
 *
 * El `DATABASE_URL` se carga perezoso dentro de `createClient`
 * — el Proxy solo lee la env var en el primer acceso, no en
 * module-load.
 */

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema/index.js"

export function createClient(url = process.env.DATABASE_URL ?? "") {
  if (!url) {
    throw new Error("DATABASE_URL is not set. Configure it in .env or environment.")
  }
  const queryClient = postgres(url, { max: 10 })
  return drizzle(queryClient, { schema })
}

export type DbClient = ReturnType<typeof createClient>

let _db: DbClient | null = null
function getDb(): DbClient {
  _db ??= createClient()
  return _db
}

/**
 * Singleton lazy vía Proxy. Cada acceso a una propiedad/método
 * (`db.select`, `db.execute`, etc.) dispara `getDb()` la primera
 * vez y reusa el client en llamadas subsiguientes.
 */
export const db = new Proxy({} as DbClient, {
  get(_target, prop, _receiver) {
    const client = getDb()
    const value = Reflect.get(client, prop, client)
    return typeof value === "function" ? value.bind(client) : value
  },
})
