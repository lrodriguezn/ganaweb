import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { fincas } from "./fincas.js"
import { lotes, potreros } from "./maestros.js"
import { usuarios } from "./auth.js"

export const registrosGrupales = pgTable(
  "registros_grupales",
  {
    id: text("id").primaryKey(),
    fincaId: text("finca_id").notNull().references(() => fincas.id),
    tipoEvento: text("tipo_evento").notNull(),
    descripcion: text("descripcion"),
    loteId: text("lote_id").references(() => lotes.id),
    potreroId: text("potrero_id").references(() => potreros.id),
    totalAnimales: integer("total_animales").notNull(),
    fecha: timestamp("fecha", { withTimezone: true }).defaultNow().notNull(),
    anuladoEn: timestamp("anulado_en", { withTimezone: true }),
    usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_reg_grupales_finca").on(t.fincaId, t.fecha)],
)
