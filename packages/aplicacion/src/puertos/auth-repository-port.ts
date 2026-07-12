import type { DecisionAutorizacion, SesionAutorizada } from "@ganaweb/dominio"

export type RegistroUsuarioInput = Readonly<{
  nombre: string
  email: string
  password: string
  fincaCodigo?: string | null
}>

export type RegistroUsuarioResult =
  | Readonly<{ tipo: "pendiente"; usuarioId: string; fincaId: string | null }>
  | Readonly<{ tipo: "duplicado" }>

export type LoginInput = Readonly<{
  email: string
  password: string
  ip?: string | null
  userAgent?: string | null
}>

export type LoginResult =
  | Readonly<{ tipo: "credenciales_invalidas" }>
  | Readonly<{
      tipo: "pendiente"
      token: string
      sesionId: string
      usuarioId: string
      nombre: string
      email: string
    }>
  | Readonly<{ tipo: "autorizado"; token: string; sesionId: string; sesion: SesionAutorizada }>

export type CredencialesUsuario = Readonly<{
  usuarioId: string
  nombre: string
  email: string
  contrasenaHash: string
  activo: boolean
}>

export type UsuarioIdentidad = Readonly<{ id: string; email: string }>

export type CrearUsuarioPendienteInput = Readonly<{
  nombre: string
  email: string
  contrasenaHash: string
  fincaCodigo?: string | null
}>

export type CrearUsuarioPendienteResult = Readonly<{ usuarioId: string; fincaId: string | null }>

export type GuardarIntentoLoginInput = Readonly<{
  usuarioId: string
  exitoso: boolean
  ip?: string | null
  userAgent?: string | null
}>

export type CrearSesionInput = Readonly<{
  usuarioId: string
  refreshTokenHash: string
  ip?: string | null
  userAgent?: string | null
  fechaExpiracion: Date
}>

export type CrearSesionResult = Readonly<{ id: string; fechaExpiracion: Date }>

export type SesionPersistida = Readonly<{ usuarioId: string; sesionId: string }>

export type UsuarioPendiente = Readonly<{
  usuarioId: string
  nombre: string
  email: string
  fincaId: string | null
  fincaNombre: string | null
}>

export interface AuthRepositoryPort {
  buscarUsuarioPorIdentidad(email: string): Promise<UsuarioIdentidad | null>
  crearUsuarioPendiente(input: CrearUsuarioPendienteInput): Promise<CrearUsuarioPendienteResult>
  obtenerCredencialesPorEmail(email: string): Promise<CredencialesUsuario | null>
  guardarIntentoLogin(input: GuardarIntentoLoginInput): Promise<void>
  crearSesion(input: CrearSesionInput): Promise<CrearSesionResult>
  obtenerSesionPorTokenHash(refreshTokenHash: string): Promise<SesionPersistida | null>
  revocarSesion(sesionId: string): Promise<void>
  obtenerAutorizacionUsuario(
    usuarioId: string,
    fincaId?: string | null,
  ): Promise<DecisionAutorizacion>
  autorizarUsuarioFinca(input: {
    usuarioId: string
    fincaId: string
    actorUsuarioId: string
  }): Promise<void>
  listarUsuariosPendientes(fincaId: string): Promise<readonly UsuarioPendiente[]>
}

export interface PasswordHasherPort {
  hash(password: string): Promise<string>
  verify(hash: string, password: string): Promise<boolean>
}

export interface SessionTokenPort {
  crearToken(): string
  hashToken(token: string): string
}

export type AuthUseCaseDeps = Readonly<{
  repo: AuthRepositoryPort
  passwordHasher: PasswordHasherPort
  tokens: SessionTokenPort
  now?: () => Date
}>
