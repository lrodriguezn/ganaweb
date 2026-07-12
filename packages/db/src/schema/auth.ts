import { index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core"
import { fincas } from "./fincas.js"

export const usuarios = pgTable(
  "usuarios",
  {
    id: text("id").primaryKey(),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    email: varchar("email", { length: 100 }).notNull(),
    emailVerificado: integer("email_verificado").default(0).notNull(),
    intentosFallidos: integer("intentos_fallidos").default(0).notNull(),
    bloqueadoHasta: timestamp("bloqueado_hasta", { withTimezone: true }),
    activo: integer("activo").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("usuarios_email_unique").on(table.email)],
)

export const usuariosContrasena = pgTable(
  "usuarios_contrasena",
  {
    id: text("id").primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    contrasenaHash: text("contrasena_hash").notNull(),
    activo: integer("activo").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("usuarios_contrasena_usuario_id_unique").on(table.usuarioId)],
)

export const usuariosLogin = pgTable(
  "usuarios_login",
  {
    id: text("id").primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    exitoso: integer("exitoso").default(0),
    ip: varchar("ip", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_usuarios_login_usuario").on(table.usuarioId, table.createdAt)],
)

export const usuariosSesiones = pgTable(
  "usuarios_sesiones",
  {
    id: text("id").primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    refreshTokenHash: text("refresh_token_hash").notNull(),
    dispositivoId: varchar("dispositivo_id", { length: 100 }),
    ip: varchar("ip", { length: 45 }),
    userAgent: text("user_agent"),
    fechaExpiracion: timestamp("fecha_expiracion", { withTimezone: true }).notNull(),
    revocadaEn: timestamp("revocada_en", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_sesiones_token").on(table.refreshTokenHash),
    index("idx_sesiones_usuario").on(table.usuarioId, table.revocadaEn),
  ],
)

export const usuariosRoles = pgTable("usuarios_roles", {
  id: text("id").primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull(),
  descripcion: text("descripcion"),
  esSistema: integer("es_sistema").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  activo: integer("activo").default(1).notNull(),
})

export const usuariosPermisos = pgTable(
  "usuarios_permisos",
  {
    id: text("id").primaryKey(),
    modulo: varchar("modulo", { length: 50 }).notNull(),
    accion: varchar("accion", { length: 50 }).notNull(),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    activo: integer("activo").default(1).notNull(),
  },
  (table) => [uniqueIndex("uq_usuarios_permisos").on(table.modulo, table.accion)],
)

export const rolesPermisos = pgTable(
  "roles_permisos",
  {
    id: text("id").primaryKey(),
    rolId: text("rol_id")
      .notNull()
      .references(() => usuariosRoles.id),
    permisoId: text("permiso_id")
      .notNull()
      .references(() => usuariosPermisos.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    activo: integer("activo").default(1).notNull(),
  },
  (table) => [uniqueIndex("uq_roles_permisos").on(table.rolId, table.permisoId)],
)

export const usuariosFincas = pgTable(
  "usuarios_fincas",
  {
    id: text("id").primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    fincaId: text("finca_id")
      .notNull()
      .references(() => fincas.id),
    activo: integer("activo").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("uq_usuarios_fincas").on(table.usuarioId, table.fincaId)],
)

export const usuariosRolesAsignacion = pgTable(
  "usuarios_roles_asignacion",
  {
    id: text("id").primaryKey(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    rolId: text("rol_id")
      .notNull()
      .references(() => usuariosRoles.id),
    fincaId: text("finca_id").references(() => fincas.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    activo: integer("activo").default(1).notNull(),
  },
  (table) => [uniqueIndex("uq_usuarios_roles").on(table.usuarioId, table.rolId, table.fincaId)],
)

export type UsuarioDb = typeof usuarios.$inferSelect
export type NuevoUsuarioDb = typeof usuarios.$inferInsert
export type UsuarioSesionDb = typeof usuariosSesiones.$inferSelect
export type NuevaUsuarioSesionDb = typeof usuariosSesiones.$inferInsert
