import type { AnyPgColumn } from "drizzle-orm/pg-core"
import {
  check,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { animales } from "./animales.js"
import { usuarios } from "./auth.js"
import {
  auditoriaEventoCoherente,
  columnasAuditoriaEvento,
  hijoGrupalSinAuditoriaIndividual,
} from "./evento-auditoria.js"
import { grupos, lotes, potreros, sectores } from "./maestros.js"
import { registrosGrupales } from "./registros-grupales.js"

export const pesos = pgTable(
  "pesos",
  {
    id: text("id").primaryKey(),
    animalId: text("animal_id")
      .notNull()
      .references(() => animales.id),
    registroGrupalId: text("registro_grupal_id").references(() => registrosGrupales.id),
    fecha: date("fecha").notNull(),
    pesoKg: numeric("peso_kg", { precision: 10, scale: 2 }).notNull(),
    tipoPeso: text("tipo_peso").default("control").notNull(),
    comentarios: text("comentarios"),
    usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    ...columnasAuditoriaEvento(),
    corrigeAId: text("corrige_a_id").references((): AnyPgColumn => pesos.id),
  },
  (t) => [
    index("idx_pesos_animal").on(t.animalId, t.fecha),
    index("idx_pesos_animal_fecha_id").on(t.animalId, t.fecha.desc(), t.id.desc()),
    index("idx_pesos_corrige_a").on(t.corrigeAId),
    check("ck_pesos_auditoria", auditoriaEventoCoherente(t)),
    check("ck_pesos_hijo_grupal", hijoGrupalSinAuditoriaIndividual(t)),
  ],
)

export const produccionesLacteas = pgTable(
  "producciones_lacteas",
  {
    id: text("id").primaryKey(),
    animalId: text("animal_id")
      .notNull()
      .references(() => animales.id),
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
    ...columnasAuditoriaEvento(),
    corrigeAId: text("corrige_a_id").references((): AnyPgColumn => produccionesLacteas.id),
  },
  (t) => [
    uniqueIndex("uq_producciones_lacteas_animal_fecha").on(t.animalId, t.fecha),
    index("idx_prod_lactea_fecha").on(t.fecha, t.potreroId),
    index("idx_prod_lactea_corrige_a").on(t.corrigeAId),
    check("ck_prod_lactea_auditoria", auditoriaEventoCoherente(t)),
    check("ck_prod_lactea_hijo_grupal", hijoGrupalSinAuditoriaIndividual(t)),
  ],
)
