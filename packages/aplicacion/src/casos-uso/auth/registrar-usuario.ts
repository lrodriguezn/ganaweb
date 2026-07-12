import type {
  AuthUseCaseDeps,
  RegistroUsuarioInput,
  RegistroUsuarioResult,
} from "../../puertos/auth-repository-port.js"

export function registrarUsuario(deps: AuthUseCaseDeps) {
  return async (input: RegistroUsuarioInput): Promise<RegistroUsuarioResult> => {
    const email = input.email.trim().toLowerCase()
    const existente = await deps.repo.buscarUsuarioPorIdentidad(email)
    if (existente) return { tipo: "duplicado" }

    const contrasenaHash = await deps.passwordHasher.hash(input.password)
    const creado = await deps.repo.crearUsuarioPendiente({
      nombre: input.nombre.trim(),
      email,
      contrasenaHash,
      fincaCodigo: input.fincaCodigo?.trim() || null,
    })

    return { tipo: "pendiente", usuarioId: creado.usuarioId, fincaId: creado.fincaId }
  }
}
