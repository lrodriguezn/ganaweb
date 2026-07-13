import { integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core"

export const configCalidadAnimal = pgTable("config_calidad_animal", {
  id: text("id").primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const configColores = pgTable("config_colores", {
  id: text("id").primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull(),
  codigo: varchar("codigo", { length: 20 }),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const configCondicionesCorporales = pgTable("config_condiciones_corporales", {
  id: text("id").primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  valorMin: integer("valor_min").default(1),
  valorMax: integer("valor_max").default(5),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const configKeyValues = pgTable(
  "config_key_values",
  {
    id: text("id").primaryKey(),
    opcion: varchar("opcion", { length: 50 }).notNull(),
    key: varchar("key", { length: 100 }).notNull(),
    value: text("value"),
    descripcion: text("descripcion"),
    activo: integer("activo").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_config_key_values").on(t.opcion, t.key)],
)

export const configRangosEdades = pgTable("config_rangos_edades", {
  id: text("id").primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  rango1: integer("rango1").notNull(),
  rango2: integer("rango2").notNull(),
  sexo: integer("sexo").default(0),
  descripcion: text("descripcion"),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const configRazas = pgTable("config_razas", {
  id: text("id").primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  origen: varchar("origen", { length: 100 }),
  tipoProduccion: varchar("tipo_produccion", { length: 50 }),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const configTiposExplotacion = pgTable("config_tipos_explotacion", {
  id: text("id").primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
