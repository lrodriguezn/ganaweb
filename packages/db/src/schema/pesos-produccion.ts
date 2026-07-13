import { index, numeric, pgTable, text, timestamp, uniqueIndex, date } from "drizzle-orm/pg-core"
import { animales } from "./animales.js"
import { grupos, lotes, potreros, sectores } from "./maestros.js"
import { registrosGrupales } from "./registros-grupales.js"
import { usuarios } from "./auth.js"

export const pesos = pgTable(
  "pesos",
  {
    id: text("id").primaryKey(),
    animalId: text("animal_id").notNull().references(() => animales.id),
    registroGrupalId: text("registro_grupal_id").references(() => registrosGrupales.id),
    fecha: date("fecha").notNull(),
    pesoKg: numeric("peso_kg", { precision: 10, scale: 2 }).notNull(),
    tipoPeso: text("tipo_peso").default("control").notNull(),
    comentarios: text("comentarios"),
    usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_pesos_animal").on(t.animalId, t.fecha)],
)

export const produccionesLacteas = pgTable(
  "producciones_lacteas",
  {
    id: text("id").primaryKey(),
    animalId: text("animal_id").notNull().references(() => animales.id),
    registroGrupalId: text("registro_grupal_id").references(() => registrosGrupales.id),
    fecha: date("fecha").notNull(),
    cantidadAm: numeric("cantidad_am", { precision: 10, scale: 2 }).default("0").notNull(),
    cantidadPm: numeric("cantidad_pm", { precision: 10, scale: 2 }).default("0").notNull(),
    potreroId: text("potrero_id").references(() => potreros.id),
    sectorId: text("sector_id").references(() => sectores.id),
    loteId: text("lote_id").references(() => lotes.id),
    grupoId: text("grupo_id").references(() => grupos.id),
    usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_producciones_lacteas_animal_fecha").on(t.animalId, t.fecha),
    index("idx_prod_lactea_fecha").on(t.fecha, t.potreroId),
  ],
)
