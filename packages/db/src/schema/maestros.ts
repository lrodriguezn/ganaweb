import { integer, pgTable, real, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core"
import { fincas } from "./fincas.js"

export const potreros = pgTable(
  "potreros",
  {
    id: text("id").primaryKey(),
    fincaId: text("finca_id")
      .notNull()
      .references(() => fincas.id),
    codigo: varchar("codigo", { length: 20 }).notNull(),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    areaHectareas: real("area_hectareas").default(0),
    tipoPasto: varchar("tipo_pasto", { length: 100 }),
    capacidadMaxima: integer("capacidad_maxima").default(0),
    estado: varchar("estado", { length: 20 }).default("activo"),
    activo: integer("activo").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_potreros_finca_codigo").on(t.fincaId, t.codigo)],
)

export const sectores = pgTable(
  "sectores",
  {
    id: text("id").primaryKey(),
    fincaId: text("finca_id")
      .notNull()
      .references(() => fincas.id),
    codigo: varchar("codigo", { length: 20 }).notNull(),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    areaHectareas: real("area_hectareas").default(0),
    tipoPasto: varchar("tipo_pasto", { length: 100 }),
    capacidadMaxima: integer("capacidad_maxima").default(0),
    estado: varchar("estado", { length: 20 }).default("activo"),
    activo: integer("activo").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_sectores_finca_codigo").on(t.fincaId, t.codigo)],
)

export const lotes = pgTable("lotes", {
  id: text("id").primaryKey(),
  fincaId: text("finca_id")
    .notNull()
    .references(() => fincas.id),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  tipo: varchar("tipo", { length: 50 }).default("producción"),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const grupos = pgTable("grupos", {
  id: text("id").primaryKey(),
  fincaId: text("finca_id")
    .notNull()
    .references(() => fincas.id),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const hierros = pgTable("hierros", {
  id: text("id").primaryKey(),
  fincaId: text("finca_id")
    .notNull()
    .references(() => fincas.id),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const propietarios = pgTable("propietarios", {
  id: text("id").primaryKey(),
  fincaId: text("finca_id")
    .notNull()
    .references(() => fincas.id),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  tipoDocumento: varchar("tipo_documento", { length: 20 }),
  numeroDocumento: varchar("numero_documento", { length: 50 }),
  telefono: varchar("telefono", { length: 20 }),
  email: varchar("email", { length: 100 }),
  direccion: text("direccion"),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const veterinarios = pgTable("veterinarios", {
  id: text("id").primaryKey(),
  fincaId: text("finca_id")
    .notNull()
    .references(() => fincas.id),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  telefono: varchar("telefono", { length: 20 }),
  email: varchar("email", { length: 100 }),
  direccion: text("direccion"),
  numeroRegistro: varchar("numero_registro", { length: 50 }),
  especialidad: varchar("especialidad", { length: 100 }),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const diagnosticosVeterinarios = pgTable("diagnosticos_veterinarios", {
  id: text("id").primaryKey(),
  fincaId: text("finca_id")
    .notNull()
    .references(() => fincas.id),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  categoria: varchar("categoria", { length: 50 }),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const causasMuerte = pgTable("causas_muerte", {
  id: text("id").primaryKey(),
  fincaId: text("finca_id")
    .notNull()
    .references(() => fincas.id),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const motivosVentas = pgTable("motivos_ventas", {
  id: text("id").primaryKey(),
  fincaId: text("finca_id")
    .notNull()
    .references(() => fincas.id),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const lugaresCompras = pgTable("lugares_compras", {
  id: text("id").primaryKey(),
  fincaId: text("finca_id")
    .notNull()
    .references(() => fincas.id),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  tipo: varchar("tipo", { length: 50 }),
  ubicacion: text("ubicacion"),
  contacto: text("contacto"),
  telefono: varchar("telefono", { length: 20 }),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const lugaresVentas = pgTable("lugares_ventas", {
  id: text("id").primaryKey(),
  fincaId: text("finca_id")
    .notNull()
    .references(() => fincas.id),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  tipo: varchar("tipo", { length: 50 }),
  ubicacion: text("ubicacion"),
  contacto: text("contacto"),
  telefono: varchar("telefono", { length: 20 }),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
