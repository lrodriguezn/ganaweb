import { sql } from "drizzle-orm"
import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { animales } from "./animales.js"
import { usuarios } from "./auth.js"
import { configCondicionesCorporales } from "./config.js"
import { imagenes } from "./imagenes.js"
import { grupos, lotes, potreros, sectores } from "./maestros.js"
import { registrosGrupales } from "./registros-grupales.js"

export const animalesCondicionCorporal = pgTable("animales_condicion_corporal", {
  id: text("id").primaryKey(),
  animalId: text("animal_id")
    .notNull()
    .references(() => animales.id),
  condicionId: text("condicion_id").references(() => configCondicionesCorporales.id),
  puntaje: numeric("puntaje", { precision: 3, scale: 1 }).notNull(),
  fecha: date("fecha").notNull(),
  usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
})

export const animalesImagenes = pgTable(
  "animales_imagenes",
  {
    id: text("id").primaryKey(),
    animalId: text("animal_id")
      .notNull()
      .references(() => animales.id),
    imagenId: text("imagen_id")
      .notNull()
      .references(() => imagenes.id),
    activo: integer("activo").default(1).notNull(),
    esPrincipal: integer("es_principal").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_animales_imagenes").on(t.animalId, t.imagenId),
    uniqueIndex("uq_animales_imagenes_principal_activa")
      .on(t.animalId)
      .where(sql`${t.activo} = 1 AND ${t.esPrincipal} = 1`),
  ],
)

export const animalesUbicacionHistorico = pgTable(
  "animales_ubicacion_historico",
  {
    id: text("id").primaryKey(),
    animalId: text("animal_id")
      .notNull()
      .references(() => animales.id),
    registroGrupalId: text("registro_grupal_id").references(() => registrosGrupales.id),
    potreroId: text("potrero_id").references(() => potreros.id),
    sectorId: text("sector_id").references(() => sectores.id),
    loteId: text("lote_id").references(() => lotes.id),
    grupoId: text("grupo_id").references(() => grupos.id),
    fecha: timestamp("fecha", { withTimezone: true }).defaultNow().notNull(),
    motivo: text("motivo"),
    usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
  },
  (t) => [index("idx_ubic_hist_animal").on(t.animalId, t.fecha)],
)
