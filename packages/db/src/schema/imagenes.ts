import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core"
import { usuarios } from "./auth.js"
import { fincas } from "./fincas.js"

export const imagenes = pgTable("imagenes", {
  id: text("id").primaryKey(),
  fincaId: text("finca_id")
    .notNull()
    .references(() => fincas.id),
  ruta: text("ruta").notNull(),
  nombreOriginal: varchar("nombre_original", { length: 255 }),
  mimeType: varchar("mime_type", { length: 50 }),
  tamanoBytes: integer("tamano_bytes"),
  descripcion: text("descripcion"),
  activo: integer("activo").default(1).notNull(),
  usuarioCreadoPor: text("usuario_creado_por").references(() => usuarios.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})
