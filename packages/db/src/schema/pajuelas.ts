import { date, integer, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { animales } from "./animales.js"
import { usuarios } from "./auth.js"
import { fincas } from "./fincas.js"

export const pajuelasInventario = pgTable("pajuelas_inventario", {
  id: text("id").primaryKey(),
  fincaId: text("finca_id")
    .notNull()
    .references(() => fincas.id),
  animalPajuelaId: text("animal_pajuela_id")
    .notNull()
    .references(() => animales.id),
  toroOrigenId: text("toro_origen_id").references(() => animales.id),
  fechaIngreso: date("fecha_ingreso").notNull(),
  dosisIngresadas: integer("dosis_ingresadas").notNull(),
  dosisDisponibles: integer("dosis_disponibles").notNull(),
  precioPorDosis: numeric("precio_por_dosis", { precision: 14, scale: 2 }),
  proveedor: text("proveedor"),
  usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
