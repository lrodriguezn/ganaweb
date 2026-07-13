import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { usuarios } from "./auth.js"
import { fincas } from "./fincas.js"

export const auditoriaEliminaciones = pgTable("auditoria_eliminaciones", {
  id: text("id").primaryKey(),
  fincaId: text("finca_id")
    .notNull()
    .references(() => fincas.id),
  entidad: text("entidad").default("animal").notNull(),
  entidadCodigo: text("entidad_codigo").notNull(),
  entidadResumen: text("entidad_resumen"),
  usuarioId: text("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  dispositivoId: text("dispositivo_id"),
  via: text("via").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})
