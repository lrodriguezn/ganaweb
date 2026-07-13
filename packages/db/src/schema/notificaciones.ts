import { index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core"
import { fincas } from "./fincas.js"
import { usuarios } from "./auth.js"

export const notificaciones = pgTable(
  "notificaciones",
  {
    id: text("id").primaryKey(),
    fincaId: text("finca_id").notNull().references(() => fincas.id),
    usuarioId: text("usuario_id").references(() => usuarios.id),
    tipo: varchar("tipo", { length: 50 }).notNull(),
    titulo: varchar("titulo", { length: 200 }).notNull(),
    mensaje: text("mensaje").notNull(),
    entidadTipo: varchar("entidad_tipo", { length: 50 }),
    entidadId: text("entidad_id"),
    leida: integer("leida").default(0),
    fechaEvento: integer("fecha_evento"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    activo: integer("activo").default(1).notNull(),
  },
  (t) => [
    index("idx_notificaciones_finca_activo").on(t.fincaId, t.activo),
    index("idx_notificaciones_finca_leida").on(t.fincaId, t.leida),
  ],
)

export const notificacionesPreferencias = pgTable(
  "notificaciones_preferencias",
  {
    id: text("id").primaryKey(),
    usuarioId: text("usuario_id").notNull().references(() => usuarios.id),
    tipo: varchar("tipo", { length: 50 }).notNull(),
    canalInapp: integer("canal_inapp").default(1),
    canalEmail: integer("canal_email").default(1),
    canalPush: integer("canal_push").default(0),
    diasAnticipacion: integer("dias_anticipacion").default(7),
    activo: integer("activo").default(1).notNull(),
  },
  (t) => [uniqueIndex("uq_notificaciones_preferencias").on(t.usuarioId, t.tipo)],
)

export const notificacionesPushTokens = pgTable(
  "notificaciones_push_tokens",
  {
    id: text("id").primaryKey(),
    usuarioId: text("usuario_id").notNull().references(() => usuarios.id),
    token: varchar("token", { length: 500 }).notNull(),
    plataforma: varchar("plataforma", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    activo: integer("activo").default(1).notNull(),
  },
  (t) => [uniqueIndex("uq_notificaciones_push_tokens").on(t.usuarioId, t.token)],
)
