import { randomUUID } from "node:crypto"
import type {
  AnimalRegistro,
  AnimalRepositoryPort,
  AnimalUseCaseDeps,
  CalidadOption,
  CatalogoAnimalMaestroPort,
  CatalogoFincaPort,
  CatalogoGlobalPort,
  CatalogoPadresPort,
  ColorOption,
  GrupoOption,
  LoteOption,
  LugarCompraOption,
  PotreroOption,
  RazaOption,
  SectorOption,
  SesionAnimal,
  SesionAutorizada,
} from "@ganaweb/aplicacion"
import {
  actualizarAnimal,
  crearAnimal,
  eliminarAnimal,
  listarCatalogoCalidad,
  listarCatalogoColor,
  listarCatalogoRaza,
  listarCatalogoSexo,
  listarGruposPorFinca,
  listarLotesPorFinca,
  listarLugaresCompraPorFinca,
  listarPotrerosPorFinca,
  listarSectoresPorFinca,
  obtenerFichaAnimal,
  reactivarAnimal,
  validarImagenesAnimalMutation,
} from "@ganaweb/aplicacion"
import { createAnimalUseCaseDeps } from "@ganaweb/db/animal-infrastructure"
import { DrizzleCatalogoAnimalMaestroAdapter } from "@ganaweb/db/catalogo-animal-maestro-infrastructure"
import { DrizzleCatalogoFincaAdapter } from "@ganaweb/db/catalogo-finca-infrastructure"
import { DrizzleCatalogoGlobalAdapter } from "@ganaweb/db/catalogo-global-infrastructure"
import { DrizzleCatalogoPadresAdapter } from "@ganaweb/db/catalogo-padres-infrastructure"
import { db } from "@ganaweb/db/client"
import type { AnimalListItem, AnimalTimelineItem } from "@ganaweb/ui"
import { createServerFn } from "@tanstack/react-start"
import {
  createAnimalE2eCatalogoFincaPort,
  createAnimalE2eCatalogoMaestroPort,
  createAnimalE2eCatalogoPadresPort,
  createAnimalE2eCatalogoPort,
  createAnimalE2eDeps,
  getAnimalE2eSession,
  isAnimalE2eEnabled,
} from "./e2e-animals-fixture.server.js"

type AnimalPermission = "ver" | "crear" | "editar" | "inactivar" | "eliminar"

export type AnimalRouteDenial =
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | { readonly tipo: "permiso_denegado"; readonly permiso: `animales:${AnimalPermission}` }

export interface AnimalRoutePermissions {
  readonly canView: boolean
  readonly canCreate: boolean
  readonly canEdit: boolean
  readonly canInactivate: boolean
  readonly canDelete: boolean
}

export interface AnimalRouteViewModel {
  readonly animales: readonly AnimalListItem[]
  readonly permissions: AnimalRoutePermissions
}

interface AnimalListFilters {
  readonly search?: string
  readonly filters?: {
    readonly salud?: string
    readonly potreroId?: string
    readonly loteId?: string
    readonly categoriaReproductiva?: string
  }
  readonly includeInactive?: boolean
  readonly includeSoldDead?: boolean
}

interface AnimalActionHarnessDeps {
  readonly deps: AnimalUseCaseDeps
  readonly getSession: () => Promise<SesionAutorizada | null>
  /**
   * Catalog used to revalidate a string `sexoKey` submission on the
   * `create` arm. The runtime harness always provides one; the
   * option is omitted at the action-harness level so focused unit
   * tests that pass a typed numeric `sexoKey` can construct the
   * harness without mocking the catalog.
   */
  readonly catalogoSexo?: CatalogoGlobalPort
}

interface AnimalRuntimeHarnessOptions {
  readonly depsFactory?: AnimalRuntimeDepsFactory | null
  readonly getSession?: () => Promise<SesionAutorizada | null>
  readonly catalogoSexo?: CatalogoGlobalPort
  readonly catalogPorts?: AnimalCatalogPorts
}

type AnimalListRepository = AnimalRepositoryPort & {
  readonly listarPorFinca?: (fincaId: string) => Promise<readonly AnimalRegistro[]>
}

export interface CreateAnimalWebInput {
  readonly fincaId: string
  readonly datos: {
    readonly codigo: string
    readonly nombre: string
    readonly sexoKey: string | 0 | 1 | 2 | null
    readonly potreroId?: string
    readonly sectorId?: string
    readonly loteId?: string
    readonly grupoId?: string
    /**
     * v1.3 (PR 2b) — extended fields. The web contract mirrors the fields
     * the form (PR 2a) emits and the dominio's `validarCreacionAnimal`
     * accepts (color, raza, tipoIngreso, fechaNacimiento, fechaCompra,
     * madreId, padreId). The harness's `pickCreateAnimalDatos` forwards
     * the subset the use case can type-check; the rest are kept in the web
     * contract for future PRs and for the form-to-datos symmetry the test
     * exercises.
     */
    readonly origen?: "nacido_en_finca" | "comprado"
    readonly fechaNacimiento?: string
    readonly fechaCompra?: string
    readonly razaId?: string
    readonly colorId?: string
    readonly calidadId?: string
    readonly lugarCompraId?: string
    readonly madreId?: string
    readonly padreId?: string
    readonly precioCompra?: number
    readonly pesoCompra?: number
    readonly comentarios?: string
    readonly codigoArete?: string
    readonly codigoRfid?: string
    readonly tipoExplotacionId?: string
    readonly tatuado?: boolean
    readonly herrado?: boolean
    readonly descornado?: boolean
    readonly esDeMonta?: boolean
    readonly numeroPezones?: number
  }
  readonly imagenes?: readonly {
    readonly id: string
    readonly mimeType: string
    readonly bytes: number
  }[]
}

export interface UpdateAnimalWebInput {
  readonly fincaId: string
  readonly animalId: string
  readonly cambios: {
    readonly codigo?: string
    readonly nombre?: string
    readonly sexoKey?: string | 0 | 1 | 2
    readonly versionLeida: number
    /**
     * v1.3 (PR 2b) — extended edit fields. The form emits the same 11 keys
     * as the create form. The dominio's `actualizarAnimal` use case
     * currently only consumes `codigo` and `versionLeida`; the remaining 9
     * fields are kept in the web contract so the form-to-datos symmetry
     * the v1.3 spec mandates is honest at the route boundary, and future
     * PRs can extend the dominio without re-shaping the route. The
     * harness's `pickUpdateAnimalCambios` drops them at the boundary.
     */
    readonly origen?: "nacido_en_finca" | "comprado"
    readonly fechaNacimiento?: string
    readonly fechaCompra?: string
    readonly razaId?: string
    readonly colorId?: string
    readonly calidadId?: string
    readonly lugarCompraId?: string
    readonly madreId?: string
    readonly padreId?: string
    readonly precioCompra?: number
    readonly pesoCompra?: number
    readonly comentarios?: string
    readonly codigoArete?: string
    readonly codigoRfid?: string
    readonly tipoExplotacionId?: string
    readonly tatuado?: boolean
    readonly herrado?: boolean
    readonly descornado?: boolean
    readonly esDeMonta?: boolean
    readonly numeroPezones?: number
  }
}

interface AnimalIdWebInput {
  readonly fincaId: string
  readonly animalId: string
}

interface DeleteAnimalWebInput extends AnimalIdWebInput {
  readonly online: boolean
}

interface ReactivateAnimalWebInput extends AnimalIdWebInput {
  readonly codigo: string
}

interface AttachAnimalImageWebInput extends AnimalIdWebInput {
  readonly imagen: {
    readonly id: string
    readonly mimeType: string
    readonly bytes: number
  }
}

export type AnimalRuntimeDepsFactory = () => AnimalUseCaseDeps

let animalRuntimeDepsFactory: AnimalRuntimeDepsFactory | null = () => createAnimalUseCaseDeps(db)

export function configureAnimalRuntimeDeps(factory: AnimalRuntimeDepsFactory | null) {
  animalRuntimeDepsFactory = factory
}

function getConfiguredAnimalDeps(factory: AnimalRuntimeDepsFactory | null): AnimalUseCaseDeps {
  if (isAnimalE2eEnabled()) return createAnimalE2eDeps()
  if (!factory) {
    throw new Error(
      "Animal persistence adapters are not configured for apps/web. Register real AnimalUseCaseDeps with configureAnimalRuntimeDeps; demo harnesses are test-only.",
    )
  }
  return factory()
}

export type AnimalSexoCatalog =
  | {
      readonly tipo: "disponible"
      readonly options: readonly { readonly label: string; readonly value: string }[]
    }
  | { readonly tipo: "no_disponible" }

export async function loadAnimalSexoCatalog(port: CatalogoGlobalPort): Promise<AnimalSexoCatalog> {
  try {
    const options = await listarCatalogoSexo(port)
    return {
      tipo: "disponible",
      options: options.map(({ label, value }) => ({ label, value: String(value) })),
    }
  } catch {
    return { tipo: "no_disponible" }
  }
}

export async function validateSubmittedSexoKey(value: unknown, port: CatalogoGlobalPort) {
  if (value !== "0" && value !== "1" && value !== "2") return null
  const catalog = await loadAnimalSexoCatalog(port)
  return catalog.tipo === "disponible" && catalog.options.some((option) => option.value === value)
    ? (Number(value) as 0 | 1 | 2)
    : null
}

/**
 * PR-5: Composite catalog loader. Composes all 9 catalogs (sexo + 3 maestro +
 * 5 finca-scoped) via Promise.allSettled for graceful degradation. Each catalog
 * failure is isolated — one DB error doesn't crash the whole loader.
 */
export interface AnimalCatalogSelectOption {
  readonly value: string
  readonly label: string
  readonly meta?: { readonly hex?: string }
  readonly codigo?: string
  readonly nombre?: string
}

export interface AnimalCatalogResult {
  readonly tipo: "disponible" | "no_disponible"
  readonly options: readonly AnimalCatalogSelectOption[]
}

export interface AnimalCatalogs {
  readonly sexo: AnimalCatalogResult
  readonly raza: AnimalCatalogResult
  readonly color: AnimalCatalogResult
  readonly calidad: AnimalCatalogResult
  readonly potrero: AnimalCatalogResult
  readonly sector: AnimalCatalogResult
  readonly lote: AnimalCatalogResult
  readonly grupo: AnimalCatalogResult
  readonly lugarCompra: AnimalCatalogResult
  readonly madre: AnimalCatalogResult
  readonly padre: AnimalCatalogResult
}

export interface AnimalCatalogPorts {
  readonly catalogoGlobal: CatalogoGlobalPort
  readonly catalogoAnimalMaestro: CatalogoAnimalMaestroPort<
    "raza" | "color" | "calidad",
    RazaOption | ColorOption | CalidadOption
  >
  readonly catalogoFinca: CatalogoFincaPort<
    "potrero" | "sector" | "lote" | "grupo" | "lugarCompra",
    PotreroOption | SectorOption | LoteOption | GrupoOption | LugarCompraOption
  >
  readonly catalogoPadres: CatalogoPadresPort
}

const NO_DISPONIBLE_CATALOG: AnimalCatalogResult = {
  tipo: "no_disponible",
  options: [],
}

function toSelectOptions(
  options: readonly { id: string; nombre: string }[],
): AnimalCatalogSelectOption[] {
  return options.map((option) => ({ value: option.id, label: option.nombre }))
}

export async function loadAnimalCatalogs(
  fincaId: string,
  ports: AnimalCatalogPorts,
  session?: SesionAutorizada | null,
  excludedIds: readonly string[] = [],
): Promise<AnimalCatalogs> {
  const resolvedSession = session ?? (await getAuthorizedSession())
  const denied = denyAnimalRouteAccess(resolvedSession, fincaId, "ver")
  if (denied) {
    return {
      sexo: NO_DISPONIBLE_CATALOG,
      raza: NO_DISPONIBLE_CATALOG,
      color: NO_DISPONIBLE_CATALOG,
      calidad: NO_DISPONIBLE_CATALOG,
      potrero: NO_DISPONIBLE_CATALOG,
      sector: NO_DISPONIBLE_CATALOG,
      lote: NO_DISPONIBLE_CATALOG,
      grupo: NO_DISPONIBLE_CATALOG,
      lugarCompra: NO_DISPONIBLE_CATALOG,
      madre: NO_DISPONIBLE_CATALOG,
      padre: NO_DISPONIBLE_CATALOG,
    }
  }

  const [
    sexoSettled,
    razaSettled,
    colorSettled,
    calidadSettled,
    potreroSettled,
    sectorSettled,
    loteSettled,
    grupoSettled,
    lugarCompraSettled,
    madreSettled,
    padreSettled,
  ] = await Promise.allSettled([
    loadAnimalSexoCatalog(ports.catalogoGlobal),
    listarCatalogoRaza(
      ports.catalogoAnimalMaestro as CatalogoAnimalMaestroPort<"raza", RazaOption>,
    ),
    listarCatalogoColor(
      ports.catalogoAnimalMaestro as CatalogoAnimalMaestroPort<"color", ColorOption>,
    ),
    listarCatalogoCalidad(
      ports.catalogoAnimalMaestro as CatalogoAnimalMaestroPort<"calidad", CalidadOption>,
    ),
    listarPotrerosPorFinca(
      fincaId,
      ports.catalogoFinca as CatalogoFincaPort<"potrero", PotreroOption>,
    ),
    listarSectoresPorFinca(
      fincaId,
      ports.catalogoFinca as CatalogoFincaPort<"sector", SectorOption>,
    ),
    listarLotesPorFinca(fincaId, ports.catalogoFinca as CatalogoFincaPort<"lote", LoteOption>),
    listarGruposPorFinca(fincaId, ports.catalogoFinca as CatalogoFincaPort<"grupo", GrupoOption>),
    listarLugaresCompraPorFinca(
      fincaId,
      ports.catalogoFinca as CatalogoFincaPort<"lugarCompra", LugarCompraOption>,
    ),
    ports.catalogoPadres.listarMadres(fincaId, excludedIds),
    ports.catalogoPadres.listarPadres(fincaId, excludedIds),
  ])

  return {
    sexo: mapSexoSettled(sexoSettled),
    raza: mapUcSettled(razaSettled),
    color: mapColorSettled(colorSettled),
    calidad: mapUcSettled(calidadSettled),
    potrero: mapUcSettled(potreroSettled),
    sector: mapUcSettled(sectorSettled),
    lote: mapUcSettled(loteSettled),
    grupo: mapUcSettled(grupoSettled),
    lugarCompra: mapUcSettled(lugarCompraSettled),
    madre: mapComboboxSettled(madreSettled),
    padre: mapComboboxSettled(padreSettled),
  }
}

function mapSexoSettled(settled: PromiseSettledResult<AnimalSexoCatalog>): AnimalCatalogResult {
  if (settled.status === "rejected") {
    // biome-ignore lint/suspicious/noConsole: server-side catalog failure logging per design spec
    console.warn("[loadAnimalCatalogs] sexo catalog failed:", settled.reason)
    return NO_DISPONIBLE_CATALOG
  }
  const result = settled.value
  if (result.tipo === "no_disponible") return NO_DISPONIBLE_CATALOG
  return {
    tipo: "disponible",
    options: result.options.map((o) => ({ value: o.value, label: o.label })),
  }
}

function mapUcSettled(
  settled: PromiseSettledResult<{
    readonly tipo: "disponible" | "no_disponible"
    readonly options: readonly { id: string; nombre: string }[]
  }>,
): AnimalCatalogResult {
  if (settled.status === "rejected") {
    // biome-ignore lint/suspicious/noConsole: server-side catalog failure logging per design spec
    console.warn("[loadAnimalCatalogs] catalog failed:", settled.reason)
    return NO_DISPONIBLE_CATALOG
  }
  const result = settled.value
  if (result.tipo === "no_disponible") return NO_DISPONIBLE_CATALOG
  return {
    tipo: "disponible",
    options: toSelectOptions(result.options),
  }
}

function mapColorSettled(
  settled: PromiseSettledResult<{
    readonly tipo: "disponible" | "no_disponible"
    readonly options: readonly ColorOption[]
  }>,
): AnimalCatalogResult {
  if (settled.status === "rejected") {
    // biome-ignore lint/suspicious/noConsole: server-side catalog failure logging per design spec
    console.warn("[loadAnimalCatalogs] color catalog failed:", settled.reason)
    return NO_DISPONIBLE_CATALOG
  }
  const result = settled.value
  if (result.tipo === "no_disponible") return NO_DISPONIBLE_CATALOG
  return {
    tipo: "disponible",
    options: result.options.map((o) => ({
      value: o.id,
      label: o.nombre,
      meta: { hex: o.meta.hex },
    })),
  }
}

function mapComboboxSettled(
  settled: PromiseSettledResult<
    readonly { readonly id: string; readonly codigo: string; readonly nombre: string | null }[]
  >,
): AnimalCatalogResult {
  if (settled.status === "rejected") {
    // biome-ignore lint/suspicious/noConsole: server-side catalog failure logging per design spec
    console.warn("[loadAnimalCatalogs] parent catalog failed:", settled.reason)
    return NO_DISPONIBLE_CATALOG
  }
  return {
    tipo: "disponible",
    options: settled.value.map((o) => ({
      value: o.id,
      label: o.nombre ? `${o.codigo} · ${o.nombre}` : o.codigo,
      codigo: o.codigo,
      nombre: o.nombre ?? "",
    })),
  }
}

function getConfiguredAnimalSexoCatalogPort(): CatalogoGlobalPort {
  return isAnimalE2eEnabled() ? createAnimalE2eCatalogoPort() : new DrizzleCatalogoGlobalAdapter(db)
}

function getConfiguredAnimalCatalogPorts(): AnimalCatalogPorts {
  if (isAnimalE2eEnabled()) {
    return {
      catalogoGlobal: createAnimalE2eCatalogoPort(),
      catalogoAnimalMaestro: createAnimalE2eCatalogoMaestroPort(),
      catalogoFinca: createAnimalE2eCatalogoFincaPort(),
      catalogoPadres: createAnimalE2eCatalogoPadresPort(),
    }
  }
  return {
    catalogoGlobal: new DrizzleCatalogoGlobalAdapter(db),
    catalogoAnimalMaestro: new DrizzleCatalogoAnimalMaestroAdapter(db),
    catalogoFinca: new DrizzleCatalogoFincaAdapter(db),
    catalogoPadres: new DrizzleCatalogoPadresAdapter(db),
  }
}

function hasAnimalPermission(
  session: SesionAutorizada | SesionAnimal,
  action: AnimalPermission,
): boolean {
  return session.permisos.some(
    (permission) =>
      (permission.modulo === "animales" && permission.accion === action) ||
      (permission.modulo === "*" && permission.accion === "*"),
  )
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: field mapper with many optional DB columns
function pickCreateAnimalDatos(datos: CreateAnimalWebInput["datos"]): {
  codigo: string
  nombre: string
  tipoIngreso?: "nacido_en_finca" | "comprado"
  fechaNacimiento?: Date | null
  fechaCompra?: Date | null
  color?: string | null
  raza?: string | null
  madreId?: string | null
  padreId?: string | null
  calidadId?: string | null
  precioCompra?: number | null
  pesoCompra?: number | null
  comentarios?: string | null
  codigoArete?: string | null
  codigoRfid?: string | null
  tipoExplotacionId?: string | null
  tatuado?: boolean | null
  herrado?: boolean | null
  descornado?: boolean | null
  esDeMonta?: boolean | null
  numeroPezones?: number | null
} {
  return {
    codigo: datos.codigo,
    nombre: datos.nombre,
    ...(datos.origen ? { tipoIngreso: datos.origen } : {}),
    ...(datos.fechaNacimiento ? { fechaNacimiento: new Date(datos.fechaNacimiento) } : {}),
    ...(datos.fechaCompra ? { fechaCompra: new Date(datos.fechaCompra) } : {}),
    ...(datos.razaId ? { raza: datos.razaId } : {}),
    ...(datos.colorId ? { color: datos.colorId } : {}),
    ...(datos.madreId ? { madreId: datos.madreId } : {}),
    ...(datos.padreId ? { padreId: datos.padreId } : {}),
    ...(datos.calidadId ? { calidadId: datos.calidadId } : {}),
    ...(datos.precioCompra !== undefined ? { precioCompra: datos.precioCompra } : {}),
    ...(datos.pesoCompra !== undefined ? { pesoCompra: datos.pesoCompra } : {}),
    ...(datos.comentarios ? { comentarios: datos.comentarios } : {}),
    ...(datos.codigoArete ? { codigoArete: datos.codigoArete } : {}),
    ...(datos.codigoRfid ? { codigoRfid: datos.codigoRfid } : {}),
    ...(datos.tipoExplotacionId ? { tipoExplotacionId: datos.tipoExplotacionId } : {}),
    ...(datos.tatuado !== undefined ? { tatuado: datos.tatuado } : {}),
    ...(datos.herrado !== undefined ? { herrado: datos.herrado } : {}),
    ...(datos.descornado !== undefined ? { descornado: datos.descornado } : {}),
    ...(datos.esDeMonta !== undefined ? { esDeMonta: datos.esDeMonta } : {}),
    ...(datos.numeroPezones !== undefined ? { numeroPezones: datos.numeroPezones } : {}),
  }
}

/** Lower-level sexoKey revalidation: a string submission is revalidated
 *  against the catalog; a number is accepted as-is. */
async function normalizarSexoKeyParaCreacion(
  value: CreateAnimalWebInput["datos"]["sexoKey"],
  port: CatalogoGlobalPort,
): Promise<0 | 1 | 2 | null> {
  if (value === 0 || value === 1 || value === 2) return value
  if (typeof value !== "string") return null
  return validateSubmittedSexoKey(value, port)
}

/**
 * v1.3 (PR 2b): narrow the wider `UpdateAnimalWebInput.cambios` contract
 * down to the 2 fields the dominio's `actualizarAnimal` use case
 * currently consumes (`codigo` and `versionLeida`). The remaining 9
 * v1.3 fields stay in the web contract for the form-to-datos symmetry
 * the spec mandates; a future PR will extend the dominio to accept
 * them. Mirrors the create route's `pickCreateAnimalDatos` pattern.
 */

function normalizeSexoKey(value: string | 0 | 1 | 2 | null | undefined): 0 | 1 | 2 | undefined {
  if (value === undefined || value === null || value === "") return undefined
  if (typeof value === "number") return value as 0 | 1 | 2
  const parsed = Number.parseInt(value, 10)
  return parsed === 0 || parsed === 1 || parsed === 2 ? (parsed as 0 | 1 | 2) : undefined
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: field mapper with many optional DB columns
function pickUpdateAnimalCambios(cambios: UpdateAnimalWebInput["cambios"]): {
  readonly codigo?: string
  readonly nombre?: string
  readonly sexoKey?: 0 | 1 | 2
  readonly fechaNacimiento?: number | null
  readonly fechaCompra?: number | null
  readonly razaId?: string | null
  readonly colorId?: string | null
  readonly calidadAnimalId?: string | null
  readonly precioCompra?: number | null
  readonly pesoCompra?: number | null
  readonly madreId?: string | null
  readonly padreId?: string | null
  readonly comentarios?: string | null
  readonly codigoArete?: string | null
  readonly codigoRfid?: string | null
  readonly tipoExplotacionId?: string | null
  readonly tatuado?: boolean
  readonly herrado?: boolean
  readonly descornado?: boolean
  readonly esDeMonta?: boolean | null
  readonly numeroPezones?: number | null
  readonly versionLeida: number
} {
  const sexoKey = normalizeSexoKey(cambios.sexoKey)
  return {
    versionLeida: cambios.versionLeida,
    ...(cambios.codigo ? { codigo: cambios.codigo } : {}),
    ...(cambios.nombre ? { nombre: cambios.nombre } : {}),
    ...(sexoKey !== undefined ? { sexoKey } : {}),
    ...(cambios.fechaNacimiento
      ? { fechaNacimiento: Math.floor(new Date(cambios.fechaNacimiento).getTime() / 1000) }
      : {}),
    ...(cambios.fechaCompra
      ? { fechaCompra: Math.floor(new Date(cambios.fechaCompra).getTime() / 1000) }
      : {}),
    ...(cambios.razaId ? { razaId: cambios.razaId } : {}),
    ...(cambios.colorId ? { colorId: cambios.colorId } : {}),
    ...(cambios.calidadId ? { calidadAnimalId: cambios.calidadId } : {}),
    ...(cambios.precioCompra !== undefined ? { precioCompra: cambios.precioCompra } : {}),
    ...(cambios.pesoCompra !== undefined ? { pesoCompra: cambios.pesoCompra } : {}),
    ...(cambios.madreId ? { madreId: cambios.madreId } : {}),
    ...(cambios.padreId ? { padreId: cambios.padreId } : {}),
    ...(cambios.comentarios ? { comentarios: cambios.comentarios } : {}),
    ...(cambios.codigoArete ? { codigoArete: cambios.codigoArete } : {}),
    ...(cambios.codigoRfid ? { codigoRfid: cambios.codigoRfid } : {}),
    ...(cambios.tipoExplotacionId ? { tipoExplotacionId: cambios.tipoExplotacionId } : {}),
    ...(cambios.tatuado !== undefined ? { tatuado: cambios.tatuado } : {}),
    ...(cambios.herrado !== undefined ? { herrado: cambios.herrado } : {}),
    ...(cambios.descornado !== undefined ? { descornado: cambios.descornado } : {}),
    ...(cambios.esDeMonta !== undefined ? { esDeMonta: cambios.esDeMonta } : {}),
    ...(cambios.numeroPezones !== undefined ? { numeroPezones: cambios.numeroPezones } : {}),
  }
}

function hasSplitUbicacion(datos: CreateAnimalWebInput["datos"]): boolean {
  return datos.potreroId !== undefined || datos.sectorId !== undefined || datos.loteId !== undefined
}

function buildUbicacionInicial(datos: CreateAnimalWebInput["datos"]): {
  potreroId?: string
  sectorId?: string
  loteId?: string
  grupoId?: string
} {
  return {
    ...(datos.potreroId !== undefined ? { potreroId: datos.potreroId } : {}),
    ...(datos.sectorId !== undefined ? { sectorId: datos.sectorId } : {}),
    ...(datos.loteId !== undefined ? { loteId: datos.loteId } : {}),
    ...(datos.grupoId !== undefined ? { grupoId: datos.grupoId } : {}),
  }
}

export function resolveAnimalPermissions(session: SesionAutorizada): AnimalRoutePermissions {
  return {
    canView: hasAnimalPermission(session, "ver"),
    canCreate: hasAnimalPermission(session, "crear"),
    canEdit: hasAnimalPermission(session, "editar"),
    canInactivate: hasAnimalPermission(session, "inactivar"),
    canDelete: hasAnimalPermission(session, "eliminar"),
  }
}

export function denyAnimalRouteAccess(
  session: SesionAutorizada | null,
  fincaId: string,
  action: AnimalPermission,
): AnimalRouteDenial | null {
  if (!session) return { tipo: "no_autenticado" }
  if (session.fincaActivaId !== fincaId) return { tipo: "finca_no_autorizada" }
  if (!hasAnimalPermission(session, action)) {
    return { tipo: "permiso_denegado", permiso: `animales:${action}` }
  }
  return null
}

function toAnimalSession(session: SesionAutorizada): SesionAnimal {
  return {
    usuarioId: session.usuarioId,
    fincaActivaId: session.fincaActivaId,
    permisos: session.permisos,
  }
}

function toAnimalListItem(animal: AnimalRegistro): AnimalListItem {
  return {
    id: animal.id,
    codigoAnimal: animal.codigo,
    nombreAnimal: animal.nombre,
    estadoActual: animal.activo ? (animal.estadoActual ?? "activo") : "vendido",
    salud: "sano",
    sexo: animal.sexoKey === 1 ? "hembra" : animal.sexoKey === 0 ? "macho" : "pajuela",
    categoriaReproductiva: animal.sexoKey === 1 ? "novilla" : "no_aplica",
    fechaNacimiento: animal.fechaNacimiento ?? null,
    fechaCompra: animal.fechaCompra ?? null,
    codigoRfid: animal.codigoRfid ?? null,
    tipoExplotacionId: animal.tipoExplotacionId ?? null,
    tatuado: animal.tatuado ?? null,
    herrado: animal.herrado ?? null,
    descornado: animal.descornado ?? null,
    esDeMonta: animal.esDeMonta ?? null,
    numeroPezones: animal.numeroPezones ?? null,
  }
}

function animalMatchesSearch(animal: AnimalRegistro, search?: string): boolean {
  const query = search?.trim().toLowerCase()
  if (!query) return true
  return [animal.codigo, animal.nombre].some((value) => value.toLowerCase().includes(query))
}

function filterAnimalList(
  animals: readonly AnimalRegistro[],
  options: AnimalListFilters,
): readonly AnimalRegistro[] {
  return animals
    .filter((animal) => options.includeInactive || animal.activo)
    .filter(
      (animal) =>
        options.includeSoldDead ||
        animal.estadoActual === undefined ||
        animal.estadoActual === "activo",
    )
    .filter((animal) => animalMatchesSearch(animal, options.search))
    .filter((animal) =>
      options.filters?.salud === undefined ? true : animal.salud === options.filters.salud,
    )
    .filter((animal) =>
      options.filters?.potreroId === undefined
        ? true
        : animal.potreroId === options.filters.potreroId,
    )
    .filter((animal) =>
      options.filters?.loteId === undefined ? true : animal.loteId === options.filters.loteId,
    )
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "es-CO"))
}

function toTimelineItem(item: {
  readonly id: string
  readonly fecha?: string
  readonly titulo?: string
}): AnimalTimelineItem {
  return {
    id: item.id,
    dominio: "manejo",
    tipo: "reubicacion",
    fecha: item.fecha ?? new Date(0).toISOString(),
    titulo: item.titulo ?? "Evento del animal",
  }
}

export function buildAnimalRouteViewModel(input: {
  readonly sesion: SesionAutorizada
  readonly animales: readonly AnimalListItem[]
}): AnimalRouteViewModel {
  return {
    animales: input.animales,
    permissions: resolveAnimalPermissions(input.sesion),
  }
}

export function createAnimalActionHarness({
  deps,
  getSession,
  catalogoSexo,
}: AnimalActionHarnessDeps) {
  return {
    async list(input: { readonly fincaId: string } & AnimalListFilters) {
      const session = await getSession()
      if (!session) return { tipo: "no_autenticado" as const }
      const denied = denyAnimalRouteAccess(session, input.fincaId, "ver")
      if (denied) return denied

      const listed = filterAnimalList(
        await listAnimalsForFinca(deps.animales, input.fincaId),
        input,
      )
      return {
        tipo: "lista" as const,
        ...buildAnimalRouteViewModel({ sesion: session, animales: listed.map(toAnimalListItem) }),
      }
    },

    async ficha(input: AnimalIdWebInput & { readonly cursorTimeline?: string }) {
      const session = await getSession()
      if (!session) return { tipo: "no_autenticado" as const }
      const denied = denyAnimalRouteAccess(session, input.fincaId, "ver")
      if (denied) return denied

      const result = await obtenerFichaAnimal(deps)({
        sesion: toAnimalSession(session),
        animalId: input.animalId,
        ...(input.cursorTimeline ? { cursorTimeline: input.cursorTimeline } : {}),
      })
      if (result.tipo !== "ficha") return result
      return {
        tipo: "ficha" as const,
        animal: toAnimalListItem(result.animal),
        imagenes: result.imagenes,
        genealogia: result.genealogia,
        estadoBanner: result.estadoBanner,
        timeline: {
          items: result.timeline.items.map(toTimelineItem),
          ...(result.timeline.nextCursor ? { nextCursor: result.timeline.nextCursor } : {}),
        },
        permissions: resolveAnimalPermissions(session),
      }
    },

    async create(input: CreateAnimalWebInput) {
      const session = await getSession()
      if (!session) return { tipo: "no_autenticado" as const }
      const denied = denyAnimalRouteAccess(session, input.fincaId, "crear")
      if (denied) return denied

      let sexoKey: 0 | 1 | 2
      if (catalogoSexo) {
        const validated = await normalizarSexoKeyParaCreacion(input.datos.sexoKey, catalogoSexo)
        if (validated === null) {
          return {
            tipo: "validacion" as const,
            errores: [{ campo: "sexo_key", detalle: "El sexo no está disponible." }],
          }
        }
        sexoKey = validated
      } else if (
        input.datos.sexoKey === 0 ||
        input.datos.sexoKey === 1 ||
        input.datos.sexoKey === 2
      ) {
        sexoKey = input.datos.sexoKey
      } else {
        return {
          tipo: "validacion" as const,
          errores: [{ campo: "sexo_key", detalle: "El sexo no está disponible." }],
        }
      }

      return crearAnimal(deps)({
        sesion: toAnimalSession(session),
        datos: { ...pickCreateAnimalDatos(input.datos), sexoKey },
        ...(hasSplitUbicacion(input.datos)
          ? { ubicacionInicial: buildUbicacionInicial(input.datos) }
          : {}),
        ...(input.imagenes ? { imagenes: input.imagenes } : {}),
      })
    },

    async update(input: UpdateAnimalWebInput) {
      const session = await getSession()
      if (!session) return { tipo: "no_autenticado" as const }
      const denied = denyAnimalRouteAccess(session, input.fincaId, "editar")
      if (denied) return denied

      const ownsAnimal = await deps.animales.obtenerPorIdYFinca?.(input.animalId, input.fincaId)
      if (!ownsAnimal) return { tipo: "animal_no_encontrado" as const }

      return actualizarAnimal(deps)({
        sesion: toAnimalSession(session),
        animalId: input.animalId,
        cambios: pickUpdateAnimalCambios(input.cambios),
      })
    },

    async delete(input: DeleteAnimalWebInput) {
      const session = await getSession()
      if (!session) return { tipo: "no_autenticado" as const }
      if (session.fincaActivaId !== input.fincaId) return { tipo: "finca_no_autorizada" as const }
      if (!hasAnimalPermission(session, "inactivar") && !hasAnimalPermission(session, "eliminar")) {
        return { tipo: "permiso_denegado" as const, permiso: "animales:inactivar" as const }
      }

      const ownsAnimal = await deps.animales.obtenerPorIdYFinca?.(input.animalId, input.fincaId)
      if (!ownsAnimal) return { tipo: "animal_no_encontrado" as const }

      return eliminarAnimal(deps)({
        sesion: toAnimalSession(session),
        animalId: input.animalId,
        online: input.online,
      })
    },

    async reactivate(input: ReactivateAnimalWebInput) {
      const session = await getSession()
      if (!session) return { tipo: "no_autenticado" as const }
      const denied = denyAnimalRouteAccess(session, input.fincaId, "inactivar")
      if (denied) return denied

      const ownsAnimal = await deps.animales.obtenerPorIdYFinca?.(input.animalId, input.fincaId)
      if (!ownsAnimal) return { tipo: "animal_no_encontrado" as const }

      return reactivarAnimal(deps)({
        sesion: toAnimalSession(session),
        animalId: input.animalId,
        codigo: input.codigo,
      })
    },

    async attachImage(input: AttachAnimalImageWebInput) {
      const session = await getSession()
      if (!session) return { tipo: "no_autenticado" as const }
      const denied = denyAnimalRouteAccess(session, input.fincaId, "editar")
      if (denied) return denied

      const ownsAnimal = await deps.animales.obtenerPorIdYFinca?.(input.animalId, input.fincaId)
      if (!ownsAnimal) return { tipo: "animal_no_encontrado" as const }

      const existingImages = await deps.archivos.listarImagenes(input.animalId, input.fincaId)
      const validacionImagen = validarImagenesAnimalMutation([input.imagen], existingImages.length)
      if (!validacionImagen.valido) {
        return { tipo: "validacion" as const, errores: validacionImagen.errores }
      }
      const imagenId = `imagen-${randomUUID()}`
      await deps.transacciones.run(async () => {
        await deps.archivos.vincularImagenPendiente?.({
          id: imagenId,
          fincaId: input.fincaId,
          animalId: input.animalId,
          blobId: input.imagen.id,
          mimeType: input.imagen.mimeType,
          bytes: input.imagen.bytes,
          esPrincipal: existingImages.length === 0,
          estadoSubida: "pendiente",
        })
        await deps.outbox.append({
          id: `outbox-${randomUUID()}`,
          fincaId: input.fincaId,
          tablaDestino: "animales_imagenes",
          operacion: "INSERT",
          payload: {
            animalId: input.animalId,
            imagenId,
            blobId: input.imagen.id,
            estadoSubida: "pendiente",
          },
          createdAt: new Date().toISOString(),
        })
        await deps.colaBinarios.encolar({
          id: `binario-${randomUUID()}`,
          fincaId: input.fincaId,
          animalId: input.animalId,
          blobId: input.imagen.id,
          mimeType: input.imagen.mimeType,
          bytes: input.imagen.bytes,
        })
      })

      return {
        tipo: "imagen_vinculada" as const,
        imagen: { id: imagenId, blobId: input.imagen.id, estadoSubida: "pendiente" as const },
      }
    },
  }
}

async function listAnimalsForFinca(
  repo: AnimalRepositoryPort,
  fincaId: string,
): Promise<readonly AnimalRegistro[]> {
  const listableRepo = repo as AnimalListRepository
  if (listableRepo.listarPorFinca) {
    return listableRepo.listarPorFinca(fincaId)
  }
  const knownDemo = await Promise.all([
    repo.obtenerPorIdYFinca?.("animal-1", fincaId),
    repo.obtenerPorIdYFinca?.("animal-2", fincaId),
  ])
  return knownDemo.filter((animal): animal is AnimalRegistro => Boolean(animal))
}

async function getAuthorizedSession(): Promise<SesionAutorizada | null> {
  if (isAnimalE2eEnabled()) return getAnimalE2eSession()

  const { getAuthDeps } = await import("./auth-deps.server.js")
  const { readSessionToken } = await import("./session-cookie.server.js")
  const { obtenerSesionActual } = await import("@ganaweb/aplicacion")
  const decision = await obtenerSesionActual(getAuthDeps())(readSessionToken())
  return decision.tipo === "autorizado" ? decision.sesion : null
}

export function createAnimalRuntimeHarness({
  depsFactory = animalRuntimeDepsFactory,
  getSession = getAuthorizedSession,
  catalogoSexo = getConfiguredAnimalSexoCatalogPort(),
  catalogPorts = getConfiguredAnimalCatalogPorts(),
}: AnimalRuntimeHarnessOptions = {}) {
  const runWithHarness = async <Result>(
    work: (harness: ReturnType<typeof createAnimalActionHarness>) => Promise<Result>,
  ) =>
    work(
      createAnimalActionHarness({
        deps: getConfiguredAnimalDeps(depsFactory),
        getSession,
        catalogoSexo,
      }),
    )

  return {
    list: (input: { readonly fincaId: string } & AnimalListFilters) =>
      runWithHarness((harness) => harness.list(input)),
    ficha: (input: AnimalIdWebInput & { readonly cursorTimeline?: string }) =>
      runWithHarness((harness) => harness.ficha(input)),
    sexoCatalog: () => loadAnimalSexoCatalog(catalogoSexo),
    allCatalogs: (fincaId: string, excludedIds: readonly string[] = []) =>
      loadAnimalCatalogs(fincaId, catalogPorts, undefined, excludedIds),
    create: (input: CreateAnimalWebInput) => runWithHarness((harness) => harness.create(input)),
    update: (input: UpdateAnimalWebInput) => runWithHarness((harness) => harness.update(input)),
    delete: (input: DeleteAnimalWebInput) => runWithHarness((harness) => harness.delete(input)),
    reactivate: (input: ReactivateAnimalWebInput) =>
      runWithHarness((harness) => harness.reactivate(input)),
    attachImage: (input: AttachAnimalImageWebInput) =>
      runWithHarness((harness) => harness.attachImage(input)),
  }
}

function getRuntimeHarness() {
  return createAnimalRuntimeHarness()
}

export const listAnimalsAction = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string } & AnimalListFilters) => data)
  .handler(({ data }) => getRuntimeHarness().list(data))

export const getAnimalFichaAction = createServerFn({ method: "GET" })
  .validator((data: AnimalIdWebInput & { cursorTimeline?: string }) => data)
  .handler(({ data }) => getRuntimeHarness().ficha(data))

export const createAnimalAction = createServerFn({ method: "POST" })
  .validator((data: CreateAnimalWebInput) => data)
  .handler(async ({ data }) => (await getRuntimeHarness().create(data)) as never)

export const updateAnimalAction = createServerFn({ method: "POST" })
  .validator((data: UpdateAnimalWebInput) => data)
  .handler(({ data }) => getRuntimeHarness().update(data))

export const deleteAnimalAction = createServerFn({ method: "POST" })
  .validator((data: DeleteAnimalWebInput) => data)
  .handler(({ data }) => getRuntimeHarness().delete(data))

export const reactivateAnimalAction = createServerFn({ method: "POST" })
  .validator((data: ReactivateAnimalWebInput) => data)
  .handler(({ data }) => getRuntimeHarness().reactivate(data))

export const attachAnimalImageAction = createServerFn({ method: "POST" })
  .validator((data: AttachAnimalImageWebInput) => data)
  .handler(({ data }) => getRuntimeHarness().attachImage(data))
