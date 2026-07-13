/**
 * Public API of `@ganaweb/dominio`.
 *
 * Sólo se re-exportan entidades y reglas de negocio. Los detalles de
 * implementación (puertos, validaciones internas) NO se exponen para
 * mantener el dominio como una superficie estable y mínima.
 */

export type {
  AnimalResumen,
  AnimalValidado,
  DatosCreacionAnimal,
  DecisionEditabilidadCodigoAnimal,
  DatosReactivacionAnimal,
  DecisionEliminarAnimal,
  ErrorValidacionAnimal,
  EstadoBannerFichaAnimal,
  EstadoAnimal,
  ImagenAnimalLink,
  ReglaAnimal,
  ResultadoAnimal,
  ResumenReferenciasAnimal,
  Salud,
  Sexo,
  SexoKey,
  TipoMimeImagenAnimal,
} from "./animal.js"
export {
  calcularDecisionEliminarAnimal,
  calcularEditabilidadCodigoAnimal,
  crearEstadoBannerFichaAnimal,
  marcarImagenPrincipal,
  seleccionarCandidatoPrincipalImagenAnimalAlDesvincular,
  validarActualizacionAnimal,
  validarCreacionAnimal,
  validarFichaTimeline,
  validarPurgadoImagenAnimal,
  validarPrincipalImagenAnimal,
  validarReactivacionAnimal,
  validarTipoArchivoImagenAnimal,
  validarLimiteImagenesAnimal,
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
