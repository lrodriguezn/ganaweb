import { pgTable, smallint, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import { usuarios } from "./auth.js"
import { fincas } from "./fincas.js"

/**
 * #110 — Per-user/per-finca animal-list UI preferences.
 *
 * Stores the normalized visible column ids and the chosen page size.
 * `columnas` is a Postgres `text[]` of stable `AnimalListColumnId` values;
 * `page_size` is constrained to 25, 50, or 100 at the application layer.
 * The composite unique index enforces one preference row per user+finca scope.
 */
export const animalListadoPreferencias = pgTable(
  "animal_listado_preferencias",
  {
    id: text("id").primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    fincaId: text("finca_id")
      .notNull()
      .references(() => fincas.id),
    columnas: text("columnas").array().notNull().default([]),
    pageSize: smallint("page_size").notNull().default(25),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_animal_listado_preferencias_usuario_finca").on(t.usuarioId, t.fincaId)],
)

export type AnimalListadoPreferencia = typeof animalListadoPreferencias.$inferSelect
export type NuevaAnimalListadoPreferencia = typeof animalListadoPreferencias.$inferInsert
