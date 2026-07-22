import type {
  AuthRepositoryPort,
  CrearSesionInput,
  CrearSesionResult,
  CrearUsuarioPendienteInput,
  CrearUsuarioPendienteResult,
  CredencialesUsuario,
  DecisionAutorizacion,
  GuardarIntentoLoginInput,
  PermisoUsuario,
  SesionPersistida,
  UsuarioIdentidad,
  UsuarioPendiente,
} from "@ganaweb/aplicacion"
import { and, desc, eq, gt, isNull } from "drizzle-orm"
import type { DbClient } from "./client.js"
import {
  fincas,
  rolesPermisos,
  usuarios,
  usuariosContrasena,
  usuariosFincas,
  usuariosLogin,
  usuariosPermisos,
  usuariosRoles,
  usuariosRolesAsignacion,
  usuariosSesiones,
} from "./schema/index.js"

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

export class DrizzleAuthRepository implements AuthRepositoryPort {
  constructor(private readonly db: DbClient) {}

  async buscarUsuarioPorIdentidad(email: string): Promise<UsuarioIdentidad | null> {
    const [usuario] = await this.db
      .select({ id: usuarios.id, email: usuarios.email })
      .from(usuarios)
      .where(eq(usuarios.email, email.toLowerCase()))
      .limit(1)
    return usuario ?? null
  }

  async crearUsuarioPendiente(
    input: CrearUsuarioPendienteInput,
  ): Promise<CrearUsuarioPendienteResult> {
    return this.db.transaction(async (tx) => {
      const usuarioId = newId("usuario")
      await tx
        .insert(usuarios)
        .values({ id: usuarioId, nombre: input.nombre, email: input.email.toLowerCase() })
      await tx.insert(usuariosContrasena).values({
        id: newId("usuario-contrasena"),
        usuarioId,
        contrasenaHash: input.contrasenaHash,
      })

      let fincaId: string | null = null
      if (input.fincaCodigo) {
        const [finca] = await tx
          .select({ id: fincas.id })
          .from(fincas)
          .where(eq(fincas.codigo, input.fincaCodigo))
          .limit(1)
        fincaId = finca?.id ?? null
        if (fincaId) {
          await tx.insert(usuariosFincas).values({
            id: newId("usuario-finca"),
            usuarioId,
            fincaId,
            activo: 0,
          })
        }
      }

      return { usuarioId, fincaId }
    })
  }

  async obtenerCredencialesPorEmail(email: string): Promise<CredencialesUsuario | null> {
    const [row] = await this.db
      .select({
        usuarioId: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
        activo: usuarios.activo,
        contrasenaHash: usuariosContrasena.contrasenaHash,
      })
      .from(usuarios)
      .innerJoin(usuariosContrasena, eq(usuariosContrasena.usuarioId, usuarios.id))
      .where(and(eq(usuarios.email, email.toLowerCase()), eq(usuariosContrasena.activo, 1)))
      .limit(1)

    return row ? { ...row, activo: row.activo === 1 } : null
  }

  async guardarIntentoLogin(input: GuardarIntentoLoginInput): Promise<void> {
    await this.db.insert(usuariosLogin).values({
      id: newId("login"),
      usuarioId: input.usuarioId,
      exitoso: input.exitoso ? 1 : 0,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    })
  }

  async crearSesion(input: CrearSesionInput): Promise<CrearSesionResult> {
    const id = newId("sesion")
    await this.db.insert(usuariosSesiones).values({
      id,
      usuarioId: input.usuarioId,
      refreshTokenHash: input.refreshTokenHash,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      fechaExpiracion: input.fechaExpiracion,
    })
    return { id, fechaExpiracion: input.fechaExpiracion }
  }

  async obtenerSesionPorTokenHash(refreshTokenHash: string): Promise<SesionPersistida | null> {
    const [row] = await this.db
      .select({ usuarioId: usuariosSesiones.usuarioId, sesionId: usuariosSesiones.id })
      .from(usuariosSesiones)
      .where(
        and(
          eq(usuariosSesiones.refreshTokenHash, refreshTokenHash),
          isNull(usuariosSesiones.revocadaEn),
          gt(usuariosSesiones.fechaExpiracion, new Date()),
        ),
      )
      .limit(1)
    return row ?? null
  }

  async revocarSesion(sesionId: string): Promise<void> {
    await this.db
      .update(usuariosSesiones)
      .set({ revocadaEn: new Date() })
      .where(eq(usuariosSesiones.id, sesionId))
  }

  async obtenerAutorizacionUsuario(
    usuarioId: string,
    fincaId?: string | null,
  ): Promise<DecisionAutorizacion> {
    const [usuario] = await this.db
      .select({ id: usuarios.id, nombre: usuarios.nombre, email: usuarios.email })
      .from(usuarios)
      .where(and(eq(usuarios.id, usuarioId), eq(usuarios.activo, 1)))
      .limit(1)
    if (!usuario) return { tipo: "no_autenticado" }

    const memberships = await this.db
      .select({
        fincaId: usuariosFincas.fincaId,
        fincaNombre: fincas.nombre,
        activo: usuariosFincas.activo,
      })
      .from(usuariosFincas)
      .innerJoin(fincas, eq(fincas.id, usuariosFincas.fincaId))
      .where(eq(usuariosFincas.usuarioId, usuarioId))
      .orderBy(desc(usuariosFincas.activo), desc(usuariosFincas.createdAt))

    const activeMembership = memberships.find(
      (membership) => membership.activo === 1 && (!fincaId || membership.fincaId === fincaId),
    )
    if (!activeMembership) {
      return {
        tipo: "pendiente",
        usuarioId: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
      }
    }

    const roleRows = await this.db
      .select({
        rol: usuariosRoles.nombre,
        modulo: usuariosPermisos.modulo,
        accion: usuariosPermisos.accion,
      })
      .from(usuariosRolesAsignacion)
      .innerJoin(usuariosRoles, eq(usuariosRoles.id, usuariosRolesAsignacion.rolId))
      .innerJoin(rolesPermisos, eq(rolesPermisos.rolId, usuariosRoles.id))
      .innerJoin(usuariosPermisos, eq(usuariosPermisos.id, rolesPermisos.permisoId))
      .where(
        and(
          eq(usuariosRolesAsignacion.usuarioId, usuarioId),
          eq(usuariosRolesAsignacion.fincaId, activeMembership.fincaId),
          eq(usuariosRolesAsignacion.activo, 1),
          eq(usuariosRoles.activo, 1),
          eq(rolesPermisos.activo, 1),
          eq(usuariosPermisos.activo, 1),
        ),
      )

    const permisos: PermisoUsuario[] = roleRows.map((row) => ({
      modulo: row.modulo,
      accion: row.accion,
    }))
    return {
      tipo: "autorizado",
      sesion: {
        usuarioId: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        fincaActivaId: activeMembership.fincaId,
        fincaActivaNombre: activeMembership.fincaNombre,
        rol: roleRows[0]?.rol ?? "Autorizado",
        permisos,
      },
    }
  }

  async autorizarUsuarioFinca(input: {
    usuarioId: string
    fincaId: string
    actorUsuarioId: string
  }): Promise<void> {
    await this.db
      .update(usuariosFincas)
      .set({ activo: 1 })
      .where(
        and(
          eq(usuariosFincas.usuarioId, input.usuarioId),
          eq(usuariosFincas.fincaId, input.fincaId),
        ),
      )
  }

  async listarUsuariosPendientes(fincaId: string): Promise<readonly UsuarioPendiente[]> {
    return this.db
      .select({
        usuarioId: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
        fincaId: usuariosFincas.fincaId,
        fincaNombre: fincas.nombre,
      })
      .from(usuariosFincas)
      .innerJoin(usuarios, eq(usuarios.id, usuariosFincas.usuarioId))
      .innerJoin(fincas, eq(fincas.id, usuariosFincas.fincaId))
      .where(
        and(
          eq(usuariosFincas.fincaId, fincaId),
          eq(usuariosFincas.activo, 0),
          eq(usuarios.activo, 1),
        ),
      )
  }
}
