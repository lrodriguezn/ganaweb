import { sql } from "drizzle-orm"
import type { AnyPgColumn } from "drizzle-orm/pg-core"
import { check, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { usuarios } from "./auth.js"
import { auditoriaEventoCoherente, columnasAuditoriaEvento } from "./evento-auditoria.js"
import { fincas } from "./fincas.js"
import { grupos, lotes, potreros } from "./maestros.js"

export const registrosGrupales = pgTable(
  "registros_grupales",
  {
    id: text("id").primaryKey(),
    fincaId: text("finca_id")
      .notNull()
      .references(() => fincas.id),
    tipoEvento: text("tipo_evento").notNull(),
    descripcion: text("descripcion"),
    origenSeleccion: text("origen_seleccion").default("manual").notNull(),
    loteId: text("lote_id").references(() => lotes.id),
    potreroId: text("potrero_id").references(() => potreros.id),
    grupoId: text("grupo_id").references(() => grupos.id),
    totalAnimales: integer("total_animales").notNull(),
    fecha: timestamp("fecha", { withTimezone: true }).defaultNow().notNull(),
    ...columnasAuditoriaEvento(),
    corrigeAId: text("corrige_a_id").references((): AnyPgColumn => registrosGrupales.id),
    usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_reg_grupales_finca").on(t.fincaId, t.fecha),
    index("idx_reg_grupales_grupo").on(t.grupoId),
    index("idx_reg_grupales_corrige_a").on(t.corrigeAId),
    check("ck_registros_grupales_auditoria", auditoriaEventoCoherente(t)),
    check(
      "ck_registros_grupales_origen_criterio",
      sql`(${t.origenSeleccion} = 'manual' AND ${t.loteId} IS NULL AND ${t.potreroId} IS NULL AND ${t.grupoId} IS NULL) OR (${t.origenSeleccion} = 'lote' AND ${t.loteId} IS NOT NULL AND ${t.potreroId} IS NULL AND ${t.grupoId} IS NULL) OR (${t.origenSeleccion} = 'potrero' AND ${t.loteId} IS NULL AND ${t.potreroId} IS NOT NULL AND ${t.grupoId} IS NULL) OR (${t.origenSeleccion} = 'grupo' AND ${t.loteId} IS NULL AND ${t.potreroId} IS NULL AND ${t.grupoId} IS NOT NULL)`,
    ),
  ],
)
