import {
  type AnyPgColumn,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  pgView,
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
import { fincas } from "./fincas.js"
import { diagnosticosVeterinarios, veterinarios } from "./maestros.js"
import { registrosGrupales } from "./registros-grupales.js"

export const productosSanitarios = pgTable(
  "productos_sanitarios",
  {
    id: text("id").primaryKey(),
    fincaId: text("finca_id")
      .notNull()
      .references(() => fincas.id),
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
  productoId: text("producto_id")
    .notNull()
    .references(() => productosSanitarios.id),
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
    animalId: text("animal_id")
      .notNull()
      .references(() => animales.id),
    registroGrupalId: text("registro_grupal_id").references(() => registrosGrupales.id),
    productoId: text("producto_id")
      .notNull()
      .references(() => productosSanitarios.id),
    fecha: date("fecha").notNull(),
    dosis: numeric("dosis", { precision: 10, scale: 2 }).default("1").notNull(),
    precioDosis: numeric("precio_dosis", { precision: 14, scale: 2 }),
    proximaDosis: date("proxima_dosis"),
    comentarios: text("comentarios"),
    usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    ...columnasAuditoriaEvento(),
    corrigeAId: text("corrige_a_id").references((): AnyPgColumn => aplicacionesSanitarias.id),
  },
  (t) => [
    index("idx_aplicaciones_animal").on(t.animalId, t.fecha),
    index("idx_aplicaciones_producto").on(t.productoId, t.fecha),
    index("idx_aplicaciones_corrige_a").on(t.corrigeAId),
    check("ck_aplicaciones_auditoria", auditoriaEventoCoherente(t)),
    check("ck_aplicaciones_hijo_grupal", hijoGrupalSinAuditoriaIndividual(t)),
  ],
)

export const revisionesVeterinarias = pgTable(
  "revisiones_veterinarias",
  {
    id: text("id").primaryKey(),
    animalId: text("animal_id")
      .notNull()
      .references(() => animales.id),
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
    ...columnasAuditoriaEvento(),
    corrigeAId: text("corrige_a_id").references((): AnyPgColumn => revisionesVeterinarias.id),
  },
  (t) => [
    index("idx_revisiones_animal").on(t.animalId, t.fecha),
    index("idx_revisiones_corrige_a").on(t.corrigeAId),
    check("ck_revisiones_auditoria", auditoriaEventoCoherente(t)),
    check("ck_revisiones_hijo_grupal", hijoGrupalSinAuditoriaIndividual(t)),
  ],
)

/**
 * Vista `inventario_sanitario` (RN-041/KPI-10): stock SIEMPRE calculado.
 *
 * La crea la migración `0007_inventario_sanitario.sql` — `.existing()` le
 * indica a drizzle-kit que la vista ya vive en la base (no la genera en
 * `generate`). A diferencia de la definición literal de schema_v3, la
 * migración excluye las aplicaciones de grupos anulados (RN-051).
 */
export const inventarioSanitario = pgView("inventario_sanitario", {
  productoId: text("producto_id"),
  fincaId: text("finca_id"),
  codigo: text("codigo"),
  descripcion: text("descripcion"),
  dosisDisponibles: numeric("dosis_disponibles"),
}).existing()
