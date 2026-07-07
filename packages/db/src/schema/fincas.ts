/**
 * Tabla `fincas` — subset mínimo del schema v3 (D5, scaffold-monorepo).
 *
 * Solo se incluyen las columnas necesarias para representar una finca a
 * efectos de RN-001 (código único por finca) y de la FK desde `animales`.
 * Las columnas `departamento`, `municipio`, `vereda`, `area_hectareas`,
 * `capacidad_maxima` y `tipo_explotacion_id` del schema v3 se difieren a
 * un PR posterior que generará el schema completo desde
 * `docs/schema_v3_corregido.sql`.
 *
 * Decisión D5 explícita: NO se genera desde el SQL completo — la idea es
 * mantener este PR en ~300 líneas y evitar bloquear en tooling de
 * introspección de drizzle-kit. El subset es suficiente para que:
 *   - `animales.finca_id` referencie `fincas.id` (FK enforced).
 *   - El seed (D11) pueble las 2 fincas reales (finca-esperanza,
 *     finca-roble) sin error.
 *   - El test TS-004 (duplicate-insert) valide el unique index
 *     `uq_animales_finca_codigo` sobre `animales`.
 *
 * Nombres en español (T-003): tabla `fincas` (no `farms` / `estancias`).
 * Timestamps con zona horaria (TIMESTAMPTZ) — el SQL fuente v3 ya los
 * usa así, los conservamos para no divergir del source-of-truth.
 */

import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core"

export const fincas = pgTable("fincas", {
	id: text("id").primaryKey(),
	codigo: varchar("codigo", { length: 20 }).notNull(),
	nombre: varchar("nombre", { length: 100 }).notNull(),
	activo: integer("activo").default(1).notNull(),
	created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export type Finca = typeof fincas.$inferSelect
export type NuevaFinca = typeof fincas.$inferInsert
