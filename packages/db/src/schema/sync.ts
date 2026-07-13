import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { fincas } from "./fincas.js"

export const syncOutbox = pgTable("sync_outbox", {
  id: text("id").primaryKey(),
  fincaId: text("finca_id").notNull().references(() => fincas.id),
  dispositivoId: text("dispositivo_id").notNull(),
  tablaDestino: text("tabla_destino").notNull(),
  operacion: text("operacion").notNull(),
  payload: jsonb("payload").notNull(),
  aplicadoEn: timestamp("aplicado_en", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const syncTombstones = pgTable("sync_tombstones", {
  id: text("id").primaryKey(),
  fincaId: text("finca_id").notNull().references(() => fincas.id),
  tablaDestino: text("tabla_destino").notNull(),
  entidadId: text("entidad_id").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const syncColaBinaria = pgTable("sync_cola_binaria", {
  id: text("id").primaryKey(),
  fincaId: text("finca_id").notNull().references(() => fincas.id),
  entidad: text("entidad").notNull(),
  entidadId: text("entidad_id").notNull(),
  blobId: text("blob_id").notNull(),
  mimeType: text("mime_type").notNull(),
  bytes: integer("bytes").notNull(),
  estado: text("estado").default("pendiente").notNull(),
  intentos: integer("intentos").default(0).notNull(),
  ultimoError: text("ultimo_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
