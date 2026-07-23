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
  ArchivoAnimalPort,
  ColaBinariosPort,
  ImagenAnimalDto,
} from "./puertos/animal-media-port.js"
export type { TimelineAnimalPort, TimelineItemAnimalDto } from "./puertos/animal-timeline-port.js"
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
export type * from "./puertos/auth-repository-port.js"
export type { DecisionAutorizacion, PermisoUsuario, SesionAutorizada } from "@ganaweb/dominio"
