export type EstadoAutorizacion = "pendiente" | "autorizado" | "sin_finca"

export type PermisoUsuario = Readonly<{
  modulo: string
  accion: string
}>

export type FincaUsuarioResumen = Readonly<{
  fincaId: string
  nombre: string
  rol: string
  activo: boolean
  permisos: readonly PermisoUsuario[]
}>

export type Usuario = Readonly<{
  id: string
  nombre: string
  email: string
  activo: boolean
  fincas: readonly FincaUsuarioResumen[]
}>

export type SesionAutorizada = Readonly<{
  usuarioId: string
  nombre: string
  email: string
  fincaActivaId: string
  fincaActivaNombre: string
  rol: string
  permisos: readonly PermisoUsuario[]
  /**
   * Todas las membresías del usuario (activas y pendientes) con su rol y
   * permisos por finca (issue #144 — selector multi-finca).
   */
  fincas: readonly FincaUsuarioResumen[]
}>

export type DecisionAutorizacion =
  | Readonly<{ tipo: "no_autenticado" }>
  | Readonly<{ tipo: "pendiente"; usuarioId: string; nombre: string; email: string }>
  | Readonly<{ tipo: "autorizado"; sesion: SesionAutorizada }>
