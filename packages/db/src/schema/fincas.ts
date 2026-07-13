import { integer, pgTable, real, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core"
import { configTiposExplotacion } from "./config.js"

export const fincas = pgTable("fincas", {
  id: text("id").primaryKey(),
  codigo: varchar("codigo", { length: 20 }).notNull(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  departamento: varchar("departamento", { length: 100 }),
  municipio: varchar("municipio", { length: 100 }),
  vereda: varchar("vereda", { length: 100 }),
  areaHectareas: real("area_hectareas").default(0),
  capacidadMaxima: integer("capacidad_maxima").default(0),
  tipoExplotacionId: text("tipo_explotacion_id").references(() => configTiposExplotacion.id),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const configParametrosFinca = pgTable(
  "config_parametros_finca",
  {
    id: text("id").primaryKey(),
    fincaId: text("finca_id")
      .notNull()
      .references(() => fincas.id),
    codigo: varchar("codigo", { length: 50 }).notNull(),
    valor: text("valor"),
    descripcion: text("descripcion"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    activo: integer("activo").default(1).notNull(),
  },
  (t) => [uniqueIndex("uq_parametros_finca_codigo").on(t.fincaId, t.codigo)],
)

export type Finca = typeof fincas.$inferSelect
export type NuevaFinca = typeof fincas.$inferInsert
