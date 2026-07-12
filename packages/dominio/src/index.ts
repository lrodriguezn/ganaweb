/**
 * Public API of `@ganaweb/dominio`.
 *
 * Sólo se re-exportan entidades y reglas de negocio. Los detalles de
 * implementación (puertos, validaciones internas) NO se exponen para
 * mantener el dominio como una superficie estable y mínima.
 */

export type {
  AnimalResumen,
  EstadoAnimal,
  Salud,
  Sexo,
} from "./animal.js"
export type { ReferenciaAnimal, ResultadoValidacion } from "./rn-001.js"
export { validarCodigoUnicoPorFinca } from "./rn-001.js"
export type {
  DecisionAutorizacion,
  EstadoAutorizacion,
  FincaUsuarioResumen,
  PermisoUsuario,
  SesionAutorizada,
  Usuario,
} from "./usuario.js"
