/**
 * Tabla `animales` — subset mínimo del schema v3 (D5, scaffold-monorepo).
 *
 * Esta tabla es el corazón de RN-001 (código único por finca). El
 * unique index `uq_animales_finca_codigo` es la ÚNICA fuente de verdad
 * del invariante a nivel de base de datos — el dominio
 * (`packages/dominio/validarCodigoUnicoPorFinca`) lo duplica en JS
 * para poder validar ANTES del round-trip, pero la base de datos es
 * quien lo enforza definitivamente.
 *
 * Simplificación deliberada D5:
 *   - `sexo` y `estado_animal` se modelan como `text` (no como
 *     `integer` FK a una lookup `sexo_enum` / `estado_animal_enum`).
 *     El SQL fuente v3 usa `sexo_key integer` y `estado_animal_key
 *     integer`, pero la generación completa del schema se difiere.
 *     `text` permite escribir fixtures de test directos sin tablas
 *     lookup. Migración a integer+FK en un PR posterior.
 *   - NO se incluyen columnas pesadas del v3 (fecha_nacimiento,
 *     madre_id, codigo_madre, raza, potrero_id, etc.) — solo lo
 *     necesario para el unique constraint y el FK a `fincas`.
 *
 * Decisión de tipos (consistencia con `packages/dominio/src/animal.ts`):
 *   - `Sexo = "macho" | "hembra" | "pajuela"`
 *   - `EstadoAnimal = "activo" | "vendido" | "muerto"`
 *   Persistimos el literal del union tal cual; en runtime aceptamos
 *   cualquier string y la validación semántica la hace la capa de
 *   aplicación al construir `AnimalResumen`.
 *
 * Nombres en español (T-003): tabla `animales`, columnas
 * `finca_id`/`estado_animal` en snake_case (consistente con el SQL v3).
 */

import { integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core"
import { fincas } from "./fincas.js"

export const animales = pgTable(
  "animales",
  {
    id: text("id").primaryKey(),
    fincaId: text("finca_id")
      .notNull()
      .references(() => fincas.id),
    codigo: varchar("codigo", { length: 20 }).notNull(),
    nombre: varchar("nombre", { length: 100 }).default(""),
    sexo: text("sexo").notNull(),
    estadoAnimal: text("estado_animal").notNull(),
    activo: integer("activo").default(1).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    // RN-001 enforcement at DB level. El test TS-004 (T4) verifica
    // que un INSERT duplicado (mismo finca_id, mismo codigo) lanza
    // el error de unique constraint de Postgres.
    uqAnimalesFincaCodigo: uniqueIndex("uq_animales_finca_codigo").on(t.fincaId, t.codigo),
  }),
)

export type Animal = typeof animales.$inferSelect
export type NuevoAnimal = typeof animales.$inferInsert
