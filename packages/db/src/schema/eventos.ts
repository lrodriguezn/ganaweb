import { index, integer, numeric, pgTable, smallint, text, timestamp, uniqueIndex, date } from "drizzle-orm/pg-core"
import { animales } from "./animales.js"
import { diagnosticosVeterinarios, veterinarios } from "./maestros.js"
import { registrosGrupales } from "./registros-grupales.js"
import { usuarios } from "./auth.js"

export const servicios = pgTable(
  "servicios",
  {
    id: text("id").primaryKey(),
    animalId: text("animal_id").notNull().references(() => animales.id),
    registroGrupalId: text("registro_grupal_id").references(() => registrosGrupales.id),
    fecha: date("fecha").notNull(),
    tipo: text("tipo").notNull(),
    padreId: text("padre_id").references(() => animales.id),
    pajuelaId: text("pajuela_id").references(() => animales.id),
    inseminadorId: text("inseminador_id").references(() => veterinarios.id),
    tipoInseminacion: text("tipo_inseminacion"),
    dosis: smallint("dosis").default(1),
    precio: numeric("precio", { precision: 14, scale: 2 }),
    efectivo: integer("efectivo"),
    observaciones: text("observaciones"),
    usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_servicios_animal").on(t.animalId, t.fecha)],
)

export const palpaciones = pgTable(
  "palpaciones",
  {
    id: text("id").primaryKey(),
    animalId: text("animal_id").notNull().references(() => animales.id),
    registroGrupalId: text("registro_grupal_id").references(() => registrosGrupales.id),
    servicioId: text("servicio_id").references(() => servicios.id),
    fecha: date("fecha").notNull(),
    diagnosticoId: text("diagnostico_id").references(() => diagnosticosVeterinarios.id),
    resultado: text("resultado"),
    diasGestion: integer("dias_gestacion"),
    comentarios: text("comentarios"),
    usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_palpaciones_animal").on(t.animalId, t.fecha)],
)

export const partos = pgTable(
  "partos",
  {
    id: text("id").primaryKey(),
    animalId: text("animal_id").notNull().references(() => animales.id),
    registroGrupalId: text("registro_grupal_id").references(() => registrosGrupales.id),
    servicioId: text("servicio_id").references(() => servicios.id),
    fecha: date("fecha").notNull(),
    machos: smallint("machos").default(0).notNull(),
    hembras: smallint("hembras").default(0).notNull(),
    muertos: smallint("muertos").default(0).notNull(),
    tipoParto: text("tipo_parto").default("normal").notNull(),
    comentarios: text("comentarios"),
    usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_partos_animal").on(t.animalId, t.fecha)],
)

export const partosCrias = pgTable(
  "partos_crias",
  {
    id: text("id").primaryKey(),
    partoId: text("parto_id").notNull().references(() => partos.id),
    criaId: text("cria_id").notNull().references(() => animales.id),
  },
  (t) => [uniqueIndex("uq_partos_crias").on(t.partoId, t.criaId)],
)
