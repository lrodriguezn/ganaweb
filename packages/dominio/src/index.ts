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
export type {
  DatosMaestroNormalizados,
  ErrorValidacionMaestro,
  EspecificacionCampoMaestro,
  EspecificacionFamiliaMaestro,
  FamiliaMaestro,
  ResultadoValidacionMaestro,
  TipoCampoMaestro,
  ValorCampoMaestro,
} from "./maestros.js"
export {
  ESPECIFICACIONES_MAESTROS,
  validarDatosFinca,
  validarDatosMaestro,
  validarNombreUnicoMaestro,
} from "./maestros.js"
export type {
  PalpacionEventoFicha,
  PartoEventoFicha,
  PesajeFicha,
  ResumenReproductivoFicha,
  ServicioEventoFicha,
} from "./animal-ficha.js"
export { calcularEdadMeses, calcularGdp, derivarResumenReproductivo } from "./animal-ficha.js"
export type { ReferenciaAnimal, ResultadoValidacion } from "./rn-001.js"
export { validarCodigoUnicoPorFinca } from "./rn-001.js"
export type {
  AplicacionPreviaSanidad,
  AplicacionSanitariaNueva,
  AplicacionTratamientoSanidad,
  CapturaEntradaAlmacen,
  ErrorValidacionSanidad,
  EstadoAnimalEventoSanidad,
  EstadoStockSanidad,
  PeriodosRefuerzosSanidad,
  RefuerzoPendienteAgrupado,
  RefuerzoPendienteFila,
  TipoTratamientoSanidad,
} from "./sanidad.js"
export {
  TIPOS_TRATAMIENTO_SANIDAD,
  VENTANA_REFUERZOS_DIAS,
  VENTANA_TRATAMIENTO_DIAS,
  agruparRefuerzosPorSemana,
  calcularStockDisponible,
  construirAplicacionesSanitarias,
  contarAnimalesEnTratamiento,
  esAlertaReconciliacionStock,
  esFechaIso,
  esRefuerzoPendienteSanidad,
  estadoStockSanidad,
  evaluarAnimalEnFinca,
  finSemanaIso,
  inicioSemanaIso,
  planificarRegistroGrupal,
  propositoProductoSanitario,
  refuerzosAutoCompletados,
  sumarDiasAFechaIso,
  validarAnulacionRegistroGrupal,
  validarCabeceraRegistroGrupal,
  validarCantidadAnimalesSanidad,
  validarEntradaAlmacen,
  validarFechaEventoSanidad,
  validarTipoTratamiento,
} from "./sanidad.js"
export type {
  DatosProductoSanitarioEntrada,
  ProductoSanitarioValidado,
  ResultadoValidacionProductoSanitario,
} from "./producto-sanitario.js"
export {
  STOCK_MINIMO_DOSIS_DEFAULT,
  datosProductoSanitarioDesdeRecord,
  validarCodigoUnicoProductoSanitario,
  validarDatosProductoSanitario,
} from "./producto-sanitario.js"
export type {
  DecisionAutorizacion,
  EstadoAutorizacion,
  FincaUsuarioResumen,
  PermisoUsuario,
  SesionAutorizada,
  Usuario,
} from "./usuario.js"
export { AnimalExportacionOverflowError } from "./errores.js"
export type {
  AccionEvento,
  DominioEvento,
  OrigenSeleccionEvento,
} from "./eventos.js"
export {
  ORIGENES_SELECCION_EVENTO,
  PERMISOS_EVENTOS_POR_DOMINIO,
  permisoEvento,
  validarAlcanceFincaEvento,
  validarAuditoriaAnulacion,
  validarCriterioSeleccionGrupal,
} from "./eventos.js"
