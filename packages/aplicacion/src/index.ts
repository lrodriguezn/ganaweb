/**
 * `@ganaweb/aplicacion` — surface pública.
 *
 * Capa de aplicación. Contiene los puertos (interfaces) que los casos
 * de uso consumirán, y los DTOs / tipos de entrada y salida. NO
 * contiene implementaciones de casos de uso todavía — eso llega en
 * PRs posteriores por capacidad (sync, eventos, reportes).
 *
 * Reglas de capa:
 *   - `aplicacion → dominio` (para entidades canónicas: `AnimalResumen`).
 *   - `aplicacion → sync` (para la forma de outbox compatible con push).
 *   - `aplicacion ⊄ db` (regla `aplicacion-to-db` del dep-cruiser).
 *
 * T-003: nombres de dominio en español.
 *   - `AnimalRepositoryPort` (interfaz en inglés — convención de
 *     "Port" / "Repository" del DDD estilo Eric Evans).
 *   - Métodos y DTOs en español: `buscarPorCodigoYFinca`, `guardar`,
 *     `ahora`, `append`, `EventoOutbox`.
 */

export type {
  AnimalRegistro,
  AnimalRepositoryPort,
  AnimalResumen,
  AnimalUpdateCambios,
} from "./puertos/animal-repository-port.js"
export type { ErrorValidacionAnimal } from "./casos-uso/animales/index.js"
export type { AnimalReferenceCheckerPort } from "./puertos/animal-reference-checker-port.js"
export type {
  AnimalFichaResumenPort,
  CondicionCorporalFicha,
  FichaAnimalResumen,
  FichaResumenBruto,
} from "./puertos/animal-ficha-resumen-port.js"
export type {
  BenchmarkAnimalListadoReadRequest,
  AnimalListadoFilterGrammar,
  AnimalListadoIdLabel,
  AnimalListadoKeyLabel,
  AnimalListadoReadFilter,
  AnimalListadoReadPort,
  AnimalListadoReadRequest,
  AnimalListadoReadResult,
  AnimalListadoRow,
} from "./puertos/animal-listado-port.js"
export { createBenchmarkAnimalListadoRequest } from "./puertos/animal-listado-port.js"
export type {
  AnimalMobileFilterKey,
  AnimalMobileIdLabel,
  AnimalMobileKeyLabel,
  AnimalMobileListReadFilter,
  AnimalMobileListReadPort,
  AnimalMobileListReadRequest,
  AnimalMobileListReadResult,
  AnimalMobileMadre,
  AnimalMobileRow,
} from "./puertos/animal-mobile-list-read-port.js"
export type {
  AnimalExportacionReadPort,
  AnimalExportacionRequest,
} from "./puertos/animal-exportacion-port.js"
export { AnimalExportacionOverflowError } from "./puertos/animal-exportacion-port.js"
export type {
  AnimalListadoPreferencias,
  AnimalListadoPreferenciasPort,
} from "./puertos/animal-listado-preferencias-port.js"
export type {
  ArchivoAnimalPort,
  ColaBinariosPort,
  ImagenAnimalDto,
} from "./puertos/animal-media-port.js"
export type {
  DominioEventoAnimal,
  TimelineAnimalPort,
  TimelineItemAnimalDto,
} from "./puertos/animal-timeline-port.js"
export type { RelojDelSistemaPort } from "./puertos/reloj-del-sistema-port.js"
export type { OutboxPort, EventoOutbox, EntradaOutbox } from "./puertos/outbox-port.js"
export type { TransaccionPort } from "./puertos/transaccion-port.js"
export type { CatalogoGlobalPort, CatalogoRaw } from "./puertos/catalogo-global-port.js"
export type {
  CatalogoAnimalMaestroPort,
  CatalogoMaestroOption,
  CalidadOption,
  ColorOption,
  RazaOption,
  TablaMaestro,
  TipoExplotacionOption,
} from "./puertos/catalogo-animal-maestro-port.js"
export type {
  CatalogoFincaOption,
  CatalogoFincaPort,
  GrupoOption,
  HierroOption,
  LoteOption,
  LugarCompraOption,
  PotreroOption,
  PropietarioOption,
  SectorOption,
  TablaFinca,
} from "./puertos/catalogo-finca-port.js"
export type {
  CatalogoPadresPort,
  ParentComboboxOption,
} from "./puertos/catalogo-padres-port.js"
export type {
  DatosMaestroNormalizados,
  FamiliaMaestro,
  FincaEscrituraPort,
  MaestroEscrituraPort,
  RegistroMaestroScope,
} from "./puertos/maestro-escritura-port.js"
// Issue #150 (CM-026/CM-039): la especificación data-driven de las familias
// (campos, requeridos, tipos) la necesita la web para renderizar el formulario
// genérico. apps/web no puede importar dominio (dependency-cruiser), así que
// se re-exporta aquí (aplicacion → dominio es una capa permitida).
export { ESPECIFICACIONES_MAESTROS } from "@ganaweb/dominio"
// Issue #209 (KPI-10/T-001): fallback documentado del umbral de stock bajo,
// usado sólo cuando la finca no tiene el parámetro en config_parametros_finca.
export { STOCK_MINIMO_DOSIS_DEFAULT } from "@ganaweb/dominio"
// Issue #212 (SAN-052/KPI-09): la agrupación por semana natural del panel es
// una regla pura del dominio; apps/web no importa dominio (dependency-cruiser,
// regla web-to-dominio-direct), así que se re-exporta aquí.
export { agruparRefuerzosPorSemana } from "@ganaweb/dominio"
export type {
  EspecificacionCampoMaestro,
  EspecificacionFamiliaMaestro,
  PeriodosRefuerzosSanidad,
  RefuerzoPendienteAgrupado,
  TipoCampoMaestro,
  ValorCampoMaestro,
} from "@ganaweb/dominio"
export type { DatosBasicosFinca, FincaLecturaPort } from "./puertos/finca-lectura-port.js"
export type {
  CatalogoProductoSanitarioPort,
  FilaProductoSanitarioListado,
  ProductoSanitarioValidado,
} from "./puertos/catalogo-producto-sanitario-port.js"
export type {
  AnimalEventoSanidadReferencia,
  AplicacionPreviaSanidad,
  AplicacionSanitariaNueva,
  EntradaAlmacenListada,
  EntradaAlmacenNueva,
  EntradaAlmacenSanidad,
  ProductoSanitarioReferencia,
  RegistroGrupalTratamientoNuevo,
  SanidadEscrituraPort,
  SanidadLecturaPort,
} from "./puertos/sanidad-port.js"
export type {
  ContadoresEventosFinca,
  EventosFincaPagina,
  EventosFincaReadPort,
  EventosFincaReadRequest,
  FeedFincaItem,
  HistorialFincaItem,
} from "./puertos/eventos-finca-read-port.js"
export type {
  AlertaStockPanel,
  FilaHistorialSanidad,
  FiltrosHistorialSanidad,
  HistorialSanidadPagina,
  ObjetivoAplicacionSanidad,
  PanelSanidadMetricas,
  RefuerzoPendienteFila,
  SanidadPanelLecturaPort,
  UltimaAplicacionPanel,
} from "./puertos/sanidad-panel-port.js"
export type {
  ConteoCatalogoGlobalClave,
  ConteoFamiliaClave,
  ConteosMaestrosPort,
  ConteosMaestrosResultado,
} from "./puertos/conteos-maestros-port.js"
export type {
  MaestroFila,
  MaestroListadoOpciones,
  MaestroListadoPort,
  MaestroListadoResultado,
} from "./puertos/maestro-listado-port.js"
export type {
  CatalogoGlobalConfiguracion,
  CatalogoGlobalConfiguracionPort,
  FilaCatalogoGlobalConfiguracion,
} from "./puertos/catalogo-global-configuracion-port.js"
export * from "./casos-uso/animales/index.js"
export * from "./casos-uso/auth/index.js"
export * from "./casos-uso/listar-catalogo-sexo.js"
export * from "./casos-uso/listar-catalogo-raza.js"
export * from "./casos-uso/listar-catalogo-color.js"
export * from "./casos-uso/listar-catalogo-calidad.js"
export * from "./casos-uso/listar-catalogo-tipo-explotacion.js"
export * from "./casos-uso/listar-potreros-por-finca.js"
export * from "./casos-uso/listar-sectores-por-finca.js"
export * from "./casos-uso/listar-lotes-por-finca.js"
export * from "./casos-uso/listar-grupos-por-finca.js"
export * from "./casos-uso/listar-lugares-compra-por-finca.js"
export * from "./casos-uso/listar-hierros-por-finca.js"
export * from "./casos-uso/listar-propietarios-por-finca.js"
export * from "./casos-uso/maestros/index.js"
export * from "./casos-uso/sanidad/index.js"
export * from "./casos-uso/eventos/autorizar-operacion-evento.js"
export * from "./casos-uso/eventos/index.js"
export { PAGE_SIZE_FEED_FINCA, PAGE_SIZE_HISTORIAL_FINCA } from "@ganaweb/dominio"
export type { CategoriaFiltroFinca, DominioEvento, PermisoVerDominio } from "@ganaweb/dominio"
export type * from "./puertos/auth-repository-port.js"
export type {
  DecisionAutorizacion,
  FincaUsuarioResumen,
  PermisoUsuario,
  SesionAutorizada,
} from "@ganaweb/dominio"
