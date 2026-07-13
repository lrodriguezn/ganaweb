import { index, integer, numeric, pgTable, text, timestamp, uniqueIndex, date } from "drizzle-orm/pg-core"
import { fincas } from "./fincas.js"
import { animales } from "./animales.js"
import { diagnosticosVeterinarios, veterinarios } from "./maestros.js"
import { registrosGrupales } from "./registros-grupales.js"
import { usuarios } from "./auth.js"

export const productosSanitarios = pgTable(
  "productos_sanitarios",
  {
    id: text("id").primaryKey(),
    fincaId: text("finca_id").notNull().references(() => fincas.id),
    codigo: text("codigo").notNull(),
    descripcion: text("descripcion").notNull(),
    mlMgPorDosis: numeric("ml_mg_por_dosis", { precision: 10, scale: 2 }),
    tipoTratamiento: text("tipo_tratamiento").default("no_reproductivo").notNull(),
    precioDosis: numeric("precio_dosis", { precision: 14, scale: 2 }),
    comentarios: text("comentarios"),
    activo: integer("activo").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_productos_sanitarios_finca_codigo").on(t.fincaId, t.codigo)],
)

export const almacenEntradas = pgTable("almacen_entradas", {
  id: text("id").primaryKey(),
  productoId: text("producto_id").notNull().references(() => productosSanitarios.id),
  fecha: date("fecha").notNull(),
  dosis: integer("dosis").notNull(),
  precioPorDosis: numeric("precio_por_dosis", { precision: 14, scale: 2 }),
  comentario: text("comentario"),
  usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const aplicacionesSanitarias = pgTable(
  "aplicaciones_sanitarias",
  {
    id: text("id").primaryKey(),
    animalId: text("animal_id").notNull().references(() => animales.id),
    registroGrupalId: text("registro_grupal_id").references(() => registrosGrupales.id),
    productoId: text("producto_id").notNull().references(() => productosSanitarios.id),
    fecha: date("fecha").notNull(),
    dosis: numeric("dosis", { precision: 10, scale: 2 }).default("1").notNull(),
    precioDosis: numeric("precio_dosis", { precision: 14, scale: 2 }),
    proximaDosis: date("proxima_dosis"),
    comentarios: text("comentarios"),
    usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_aplicaciones_animal").on(t.animalId, t.fecha),
    index("idx_aplicaciones_producto").on(t.productoId, t.fecha),
  ],
)

export const revisionesVeterinarias = pgTable(
  "revisiones_veterinarias",
  {
    id: text("id").primaryKey(),
    animalId: text("animal_id").notNull().references(() => animales.id),
    registroGrupalId: text("registro_grupal_id").references(() => registrosGrupales.id),
    fecha: date("fecha").notNull(),
    diagnosticoId: text("diagnostico_id").references(() => diagnosticosVeterinarios.id),
    tipoDiagnostico: text("tipo_diagnostico").default("vitaminas").notNull(),
    celoPresentado: integer("celo_presentado").default(0).notNull(),
    comentarios: text("comentarios"),
    veterinarioId: text("veterinario_id").references(() => veterinarios.id),
    usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_revisiones_animal").on(t.animalId, t.fecha)],
)
