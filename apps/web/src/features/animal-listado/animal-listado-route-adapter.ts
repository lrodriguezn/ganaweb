/**
 * Typed route adapter for the #108 desktop animal list (PR 1 — foundation).
 *
 * Contract source: `apps/web/src/server/animal-list-contract.ts` (#107) and
 * the RF-ANIM-LIST v2.1 canonical matrix (36 columns, 29 visible by default,
 * 7 optional). Gate: epic #106 approved + #107 delivered before PR 1.
 *
 * Boundaries: every mapping derives from the #107 `columnId`/`responseKey`
 * registry — NEVER from the visible label. This module owns no filters,
 * search, or order controls (#109), pagination/column-selector/preferences
 * (#110), or export execution (#111); it only parses #107 responses, exposes
 * the canonical registry, formats null-safe cells, sanitizes a 400
 * (LA-040–043), and — since PR 3 — exposes the `cargarListadoDesktop`
 * transport that maps every #107 outcome onto the desktop state machine.
 * `Lugar compra` is not a column and must never render.
 *
 * Consumer (#108 PR 3): `apps/web/src/routes/_app/fincas/$fincaId/animales.tsx`
 * (`AnimalsListRouteView`) — the desktop branch only; the legacy mobile
 * branch keeps `listAnimalsAction`, and #107 itself stays untouched.
 */
import {
  ANIMAL_LIST_COLUMNS,
  type AnimalListColumnId,
  type AnimalListFilterKey,
  type AnimalListResponseKey,
  type AnimalListSortKey,
  type AnimalListadoResponseDto,
  type AnimalListadoRowDto,
  type ApiErrorDto,
  type IdLabel,
  type KeyLabel,
} from "../../server/animal-list-contract.js"

/**
 * Visual-only action flags for the desktop list (LA-RBAC-02/03). Hiding
 * actions is a presentation rule (LA-RBAC-05): these flags never authorize a
 * request. Server enforcement remains authoritative; #111 must enforce export
 * independently.
 */
export type AnimalListadoVisualPermissions = Readonly<{
  canCreate: boolean // animales:crear
  canExport: boolean // animales:ver && reportes:exportar
}>

export interface AnimalListadoColumn {
  readonly ordinal: number
  readonly id: AnimalListColumnId
  readonly responseKey: AnimalListResponseKey
  readonly label: string
  readonly visibleByDefault: boolean
}

/** Sort mirrored from the #107 response — the table's `aria-sort` source. */
export type AnimalListadoOrden = Readonly<{
  campo: string
  direccion: "asc" | "desc"
}>

export type AnimalListadoDesktopModel = Readonly<{
  columns: readonly AnimalListadoColumn[] // 29 visible by default; 36 recognized
  rows: readonly AnimalListadoRowDto[]
  total: number
  totalSinFiltro: number
  permissions: AnimalListadoVisualPermissions
  orden: AnimalListadoOrden
}>

/** Spanish labels keyed by stable `columnId` — the RF-ANIM-LIST v2.1 matrix. */
const ETIQUETAS: Record<AnimalListColumnId, string> = {
  codigo: "Código",
  nombre: "Nombre",
  sexo: "Sexo",
  raza: "Raza",
  fechaNacimiento: "Fecha nacimiento",
  edad: "Edad",
  color: "Color",
  origen: "Origen",
  codigoMadre: "Madre (Cód.)",
  nombreMadre: "Madre (Nom.)",
  codigoPadre: "Padre (Cód.)",
  nombrePadre: "Padre (Nom.)",
  propietario: "Propietario",
  hierro: "Hierro",
  numeroPezones: "No. Pezones",
  calidad: "Calidad",
  arete: "Arete",
  fechaCompra: "Fecha compra",
  precioCompra: "Precio",
  pesoCompra: "Peso compra",
  tatuado: "Tatuado",
  herrado: "Herrado",
  descornado: "Descornado",
  rfid: "RFID",
  potrero: "Potrero",
  sector: "Sector",
  lote: "Lote",
  grupo: "Grupo",
  comentarios: "Comentarios",
  salud: "Salud",
  categoriaReproductiva: "Categoría reprod.",
  estado: "Estado",
  pesoUltimo: "Peso último",
  qr: "QR",
  esDeMonta: "Es de monta",
  tipoExplotacion: "Tipo explotación",
}

const CANTIDAD_COLUMNAS_VISIBLES = 29

export const ANIMAL_LISTADO_COLUMN_REGISTRY: readonly AnimalListadoColumn[] =
  ANIMAL_LIST_COLUMNS.map(([id, responseKey], indice) => ({
    ordinal: indice + 1,
    id,
    responseKey,
    label: ETIQUETAS[id],
    visibleByDefault: indice < CANTIDAD_COLUMNAS_VISIBLES,
  }))

export const ANIMAL_LISTADO_DEFAULT_COLUMNS: readonly AnimalListadoColumn[] =
  ANIMAL_LISTADO_COLUMN_REGISTRY.filter((columna) => columna.visibleByDefault)

export type AnimalListadoFilterGrammar = (typeof ANIMAL_LIST_COLUMNS)[number][4]

export type FilterOption = Readonly<{ value: string; label: string }>

export type FilterControlModel = Readonly<{
  filterKey: AnimalListFilterKey
  grammar: AnimalListadoFilterGrammar
  label: string
  committedValue: string | null
  options: readonly FilterOption[]
}>

export type FilterCommit = Readonly<{
  filterKey: AnimalListFilterKey
  grammar: AnimalListadoFilterGrammar
  value: string | null
}>

export type QueryChip = Readonly<{
  queryKey: "q" | `f.${AnimalListFilterKey}`
  label: string
  valueLabel: string
}>

/** Read-only complete query seam for #111; it never owns navigation or fetching. */
export type FinalizedAnimalListadoQuery = Readonly<{ searchParams: string }>

type AnimalListadoColumnMetadata = (typeof ANIMAL_LIST_COLUMNS)[number]

const columnaPorFiltro = new Map<string, AnimalListadoColumnMetadata>(
  ANIMAL_LIST_COLUMNS.map((columna) => [columna[2], columna]),
)

const columnaPorId = new Map<string, AnimalListadoColumnMetadata>(
  ANIMAL_LIST_COLUMNS.map((columna) => [columna[0], columna]),
)

function consultaConPaginaInicial(consulta: URLSearchParams): URLSearchParams {
  const siguiente = new URLSearchParams(consulta)
  siguiente.delete("page")
  return siguiente
}

function valorFiltro(value: string): string {
  const separator = value.indexOf(":")
  return separator === -1 ? value : value.slice(separator + 1)
}

/**
 * Produces stable query order for replay and the #111 export seam without
 * inventing defaults; absent values keep #107's canonical defaults.
 */
export function finalizarConsultaListado(consulta: URLSearchParams): FinalizedAnimalListadoQuery {
  const canonical = new URLSearchParams()
  for (const key of ["page", "pageSize", "sort", "q"] as const) {
    const value = consulta.get(key)
    if (value !== null) canonical.set(key, value)
  }
  for (const [, , filterKey] of ANIMAL_LIST_COLUMNS) {
    const value = consulta.get(`f.${filterKey}`)
    if (value !== null) canonical.set(`f.${filterKey}`, value)
  }
  const cols = consulta.get("cols")
  if (cols !== null) canonical.set("cols", cols)
  return { searchParams: canonical.toString() }
}

/** Commits a metadata-validated stable ID/key filter and resets pagination. */
export function aplicarFiltroListado(
  consulta: URLSearchParams,
  commit: FilterCommit,
): URLSearchParams {
  const columna = columnaPorFiltro.get(commit.filterKey)
  if (columna === undefined || columna[4] !== commit.grammar) return new URLSearchParams(consulta)
  const siguiente = consultaConPaginaInicial(consulta)
  const queryKey = `f.${commit.filterKey}`
  if (commit.value === null) siguiente.delete(queryKey)
  else siguiente.set(queryKey, `${commit.grammar}:${commit.value}`)
  return siguiente
}

export function crearModelosFiltroListado(
  consulta: URLSearchParams,
  opciones: Readonly<Partial<Record<AnimalListFilterKey, readonly FilterOption[]>>>,
): readonly FilterControlModel[] {
  return ANIMAL_LIST_COLUMNS.map(([, , filterKey, , grammar]) => ({
    filterKey,
    grammar,
    label: ETIQUETAS[columnaPorFiltro.get(filterKey)?.[0] ?? "codigo"],
    committedValue: consulta.has(`f.${filterKey}`)
      ? valorFiltro(consulta.get(`f.${filterKey}`) ?? "")
      : null,
    options: opciones[filterKey] ?? [],
  }))
}

export function crearChipsListado(
  consulta: URLSearchParams,
  modelos: readonly FilterControlModel[],
): readonly QueryChip[] {
  const chips: QueryChip[] = []
  const search = consulta.get("q")
  if (search !== null) chips.push({ queryKey: "q", label: "Búsqueda", valueLabel: search })
  for (const modelo of modelos) {
    if (modelo.committedValue === null) continue
    const option = modelo.options.find((candidate) => candidate.value === modelo.committedValue)
    chips.push({
      queryKey: `f.${modelo.filterKey}`,
      label: modelo.label,
      valueLabel: option?.label ?? modelo.committedValue,
    })
  }
  return chips
}

export function eliminarChipListado(
  consulta: URLSearchParams,
  queryKey: QueryChip["queryKey"],
): URLSearchParams {
  const siguiente = consultaConPaginaInicial(consulta)
  siguiente.delete(queryKey)
  return siguiente
}

export function limpiarFiltrosListado(consulta: URLSearchParams): URLSearchParams {
  const siguiente = consultaConPaginaInicial(consulta)
  siguiente.delete("q")
  for (const [, , filterKey] of ANIMAL_LIST_COLUMNS) siguiente.delete(`f.${filterKey}`)
  return siguiente
}

export function siguienteOrdenListado(
  consulta: URLSearchParams,
  columnId: AnimalListColumnId,
): URLSearchParams {
  const columna = columnaPorId.get(columnId)
  if (columna === undefined || columna[3] === null) return new URLSearchParams(consulta)
  const siguiente = consultaConPaginaInicial(consulta)
  const sortKey = columna[3] as AnimalListSortKey
  const sortActual = siguiente.get("sort")
  if (sortActual === `${sortKey}:asc`) siguiente.set("sort", `${sortKey}:desc`)
  else if (sortActual === `${sortKey}:desc`) siguiente.delete("sort")
  else siguiente.set("sort", `${sortKey}:asc`)
  return siguiente
}

const columnaPorIdOKey = new Map<string, AnimalListadoColumn>()
for (const columna of ANIMAL_LISTADO_COLUMN_REGISTRY) {
  columnaPorIdOKey.set(columna.id, columna)
  columnaPorIdOKey.set(columna.responseKey, columna)
}

/** Recognizes all 36 columns by `columnId` or `responseKey`; null otherwise. */
export function resolverColumnaListado(idOKey: string): AnimalListadoColumn | null {
  return columnaPorIdOKey.get(idOKey) ?? null
}

/**
 * Resolves requested `cols` through the registry in canonical ordinal order.
 * Unknown identifiers are dropped; when nothing recognized remains, the
 * canonical 29 default columns apply (LA-032 fail-safe).
 */
export function resolverColumnasListado(ids: readonly string[]): readonly AnimalListadoColumn[] {
  const reconocidas = [...new Set(ids)]
    .map((id) => resolverColumnaListado(id))
    .filter((columna): columna is AnimalListadoColumn => columna !== null)
    .sort((a, b) => a.ordinal - b.ordinal)
  return reconocidas.length > 0 ? reconocidas : ANIMAL_LISTADO_DEFAULT_COLUMNS
}

function textoSimple(valor: string | null): string {
  return valor !== null && valor.trim() !== "" ? valor : "-"
}

function etiquetaId(valor: IdLabel | null): string {
  return valor ? valor.label : "Sin registrar"
}

function etiquetaKey(valor: KeyLabel | null): string {
  return valor ? valor.label : "Sin registrar"
}

function numero(valor: number | null): string {
  return valor === null ? "-" : String(valor)
}

function booleano(valor: boolean): string {
  return valor ? "Sí" : "No"
}

/**
 * Null-safe cell text for one column/row pair. Absent catalog/relation values
 * present `Sin registrar`; absent scalar values present `-`; never the `null`
 * literal nor zero for an absent value (§6.2).
 */
export function formatearCeldaListado(
  columna: AnimalListadoColumn,
  fila: AnimalListadoRowDto,
): string {
  switch (columna.id) {
    case "codigo":
      return textoSimple(fila.codigo)
    case "nombre":
      return textoSimple(fila.nombre)
    case "sexo":
      return fila.sexo.label
    case "raza":
      return etiquetaId(fila.raza)
    case "fechaNacimiento":
      return textoSimple(fila.fechaNacimiento)
    case "edad":
      return numero(fila.edadAnios)
    case "color":
      return etiquetaId(fila.color)
    case "origen":
      return etiquetaId(fila.origen)
    case "codigoMadre":
      return textoSimple(fila.codigoMadre)
    case "nombreMadre":
      return textoSimple(fila.nombreMadre)
    case "codigoPadre":
      return textoSimple(fila.codigoPadre)
    case "nombrePadre":
      return textoSimple(fila.nombrePadre)
    case "propietario":
      return etiquetaId(fila.propietario)
    case "hierro":
      return etiquetaId(fila.hierro)
    case "numeroPezones":
      return numero(fila.numeroPezones)
    case "calidad":
      return etiquetaId(fila.calidad)
    case "arete":
      return textoSimple(fila.codigoArete)
    case "fechaCompra":
      return textoSimple(fila.fechaCompra)
    case "precioCompra":
      return numero(fila.precioCompra)
    case "pesoCompra":
      return numero(fila.pesoCompraKg)
    case "tatuado":
      return booleano(fila.tatuado)
    case "herrado":
      return booleano(fila.herrado)
    case "descornado":
      return booleano(fila.descornado)
    case "rfid":
      return textoSimple(fila.codigoRfid)
    case "potrero":
      return etiquetaId(fila.potrero)
    case "sector":
      return etiquetaId(fila.sector)
    case "lote":
      return etiquetaId(fila.lote)
    case "grupo":
      return etiquetaId(fila.grupo)
    case "comentarios":
      return textoSimple(fila.comentarios)
    case "salud":
      return etiquetaKey(fila.salud)
    case "categoriaReproductiva":
      return etiquetaKey(fila.categoriaReproductiva)
    case "estado":
      return etiquetaKey(fila.estado)
    case "pesoUltimo":
      return fila.pesoUltimo === null ? "-" : `${numero(fila.pesoUltimo.pesoKg)} kg`
    case "qr":
      return textoSimple(fila.codigoQr)
    case "esDeMonta":
      return booleano(fila.esDeMonta)
    case "tipoExplotacion":
      return etiquetaId(fila.tipoExplotacion)
    default: {
      // Compile-time exhaustiveness guard: a new #107 column forces a new case.
      const nunca: never = columna.id
      return nunca
    }
  }
}

const ORDEN_POR_DEFECTO: AnimalListadoOrden = Object.freeze({ campo: "codigo", direccion: "asc" })

/** Mirrors the #107 `sort` ("campo:direccion"); malformed values fail safe. */
function resolverOrden(sort: string): AnimalListadoOrden {
  const separador = sort.indexOf(":")
  const campo = separador > 0 ? sort.slice(0, separador) : ""
  const direccion = separador > 0 ? sort.slice(separador + 1) : ""
  if (campo === "" || (direccion !== "asc" && direccion !== "desc")) return ORDEN_POR_DEFECTO
  return { campo, direccion }
}

/** Builds the desktop model from a #107 response plus visual permission flags. */
export function construirModeloListadoDesktop(
  respuesta: AnimalListadoResponseDto,
  permissions: AnimalListadoVisualPermissions,
): AnimalListadoDesktopModel {
  return {
    columns: resolverColumnasListado(respuesta.cols),
    rows: respuesta.data,
    total: respuesta.total,
    totalSinFiltro: respuesta.totalSinFiltro,
    permissions,
    orden: resolverOrden(respuesta.sort),
  }
}

/**
 * 400 handling (LA-040–043): the frontend owns the visual behavior and URL
 * sanitization. The last valid table is retained — never replaced by an error
 * state — the parameter reported invalid by `ApiErrorDto.campo` is stripped
 * from the URL, the page returns to 1 when the stripped parameter changes the
 * paginated dataset (page/pageSize/sort or any `f.*` filter), and a toast
 * announces the correction. #109 owns general filter mutation; this is only
 * the error-driven sanitization.
 */
export interface AnimalListadoToastPayload {
  readonly titulo: string
  readonly mensaje: string
  readonly requestId: string
}

export interface AnimalListadoSanitizationResult {
  /** The retained last valid model (same reference — never an error state). */
  readonly model: AnimalListadoDesktopModel
  readonly removedParams: readonly string[]
  readonly pageReset: boolean
  readonly sanitizedQuery: URLSearchParams
  readonly toast: AnimalListadoToastPayload
}

const CAMPOS_CON_REINICIO_DE_PAGINA = new Set(["page", "pageSize", "sort"])
const CAMPOS_FILTRO_VALIDOS = new Set(
  ANIMAL_LIST_COLUMNS.map(([, , filterKey]) => `f.${filterKey}`),
)

function reiniciaPagina(campo: string): boolean {
  return CAMPOS_CON_REINICIO_DE_PAGINA.has(campo) || CAMPOS_FILTRO_VALIDOS.has(campo)
}

function campoCorregible(campo: string): boolean {
  return (
    campo === "page" ||
    campo === "pageSize" ||
    campo === "sort" ||
    campo === "cols" ||
    CAMPOS_FILTRO_VALIDOS.has(campo)
  )
}

export function sanitizarListadoBadRequest(
  error: ApiErrorDto,
  ultimoModelo: AnimalListadoDesktopModel,
  consulta: URLSearchParams,
): AnimalListadoSanitizationResult {
  const sanitizedQuery = new URLSearchParams(consulta)
  const removedParams: string[] = []
  let pageReset = false

  const campo = error.campo
  if (campo !== null && campoCorregible(campo) && sanitizedQuery.has(campo)) {
    sanitizedQuery.delete(campo)
    removedParams.push(campo)
    pageReset = reiniciaPagina(campo)
    if (pageReset && campo !== "page" && sanitizedQuery.has("page")) {
      sanitizedQuery.delete("page")
      removedParams.push("page")
    }
  }

  return {
    model: ultimoModelo,
    removedParams,
    pageReset,
    sanitizedQuery,
    toast: {
      titulo: "Parámetros de la consulta corregidos",
      mensaje: error.motivo,
      requestId: error.requestId,
    },
  }
}

/**
 * Desktop branch transport (PR 3): GET `/api/fincas/{fincaId}/animales`
 * (#107 authorization) and map every outcome onto the desktop state machine.
 * The route view owns the stateful LA-040–063 behavior (retain the last valid
 * model, retry, safe return); this function is the pure transport boundary —
 * `fetch` is injectable so the interpretation is unit-testable without DOM.
 *
 * Failure policy: a parseable 400/403/500 carries the #107 `ApiErrorDto`;
 * network failures, timeout aborts, and unparseable bodies resolve
 * `error_servidor` with a `null` error — never a false 403 (LA-042) and never
 * a silent empty table.
 */
export type ResultadoListadoDesktop =
  | { readonly tipo: "listo"; readonly modelo: AnimalListadoDesktopModel }
  | { readonly tipo: "consulta_invalida"; readonly error: ApiErrorDto }
  | { readonly tipo: "sin_acceso"; readonly error: ApiErrorDto }
  | { readonly tipo: "error_servidor"; readonly error: ApiErrorDto | null }

export interface OpcionesCargaListado {
  /** Injectable transport seam (tests); defaults to the global `fetch`. */
  readonly fetchImpl?: typeof fetch
  /** Optional query appended to the #107 URL (`"?page=2"` / `"f.razaId=in:x"`). */
  readonly consulta?: string
  /** Request budget in milliseconds; aborts map to `error_servidor`. */
  readonly timeoutMs?: number
}

export const LISTADO_TIMEOUT_MS = 15_000

const ERROR_SIN_ACCESO_SIN_CUERPO: ApiErrorDto = Object.freeze({
  error: "forbidden",
  campo: null,
  motivo: "No autorizado",
  requestId: "",
})

function urlListado(fincaId: string, consulta: string): string {
  const base = `/api/fincas/${fincaId}/animales`
  if (consulta === "") return base
  return consulta.startsWith("?") ? `${base}${consulta}` : `${base}?${consulta}`
}

async function leerErrorApi(respuesta: Response): Promise<ApiErrorDto | null> {
  try {
    return (await respuesta.json()) as ApiErrorDto
  } catch {
    return null
  }
}

export async function cargarListadoDesktop(
  fincaId: string,
  permissions: AnimalListadoVisualPermissions,
  opciones: OpcionesCargaListado = {},
): Promise<ResultadoListadoDesktop> {
  const fetchImpl = opciones.fetchImpl ?? fetch
  const timeoutMs = opciones.timeoutMs ?? LISTADO_TIMEOUT_MS
  const señal =
    typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(timeoutMs) : undefined
  try {
    const respuesta = await fetchImpl(urlListado(fincaId, opciones.consulta ?? ""), {
      headers: { Accept: "application/json" },
      ...(señal ? { signal: señal } : {}),
    })
    if (respuesta.status === 200) {
      try {
        const dto = (await respuesta.json()) as AnimalListadoResponseDto
        return { tipo: "listo", modelo: construirModeloListadoDesktop(dto, permissions) }
      } catch {
        return { tipo: "error_servidor", error: null }
      }
    }
    const error = await leerErrorApi(respuesta)
    if (respuesta.status === 400 && error !== null) return { tipo: "consulta_invalida", error }
    if (respuesta.status === 403) {
      return { tipo: "sin_acceso", error: error ?? ERROR_SIN_ACCESO_SIN_CUERPO }
    }
    return { tipo: "error_servidor", error }
  } catch {
    // Network failure or timeout abort — fail without a false 403 (LA-042).
    return { tipo: "error_servidor", error: null }
  }
}

/**
 * Export download transport (PR 5): GET `/api/fincas/{fincaId}/animales/exportar`
 * (LA-070/071/072). Reuses the active listado query (filters/sort/search/cols)
 * and adds the dialog's `format`/`scope`; the artifact is received as a blob
 * and delivered through a real client download — an anchor with a `download`
 * attribute — never an inline render or a navigation away from the list.
 *
 * Boundary (Clean/Hexagonal): this client transport MUST NOT import the
 * server-only generators/handler (exceljs + pdfkit live there); it only speaks
 * HTTP. `fetch` and the download side effect are injectable so the mapping is
 * unit-testable without a DOM. Outcomes mirror `ResultadoListadoDesktop`'s
 * discriminated union, refined with the export-specific 413 and timeout states
 * (LA-076). A server timeout returns HTTP 500 whose `ApiErrorDto.error` title
 * is the timeout copy; that title is the de-facto contract that distinguishes
 * `timeout` from a generic `error_servidor`.
 */
export type AlcanceExportacionListado = "vista" | "todas"
export type FormatoExportacionListado = "xlsx" | "csv" | "pdf"

/** The dialog's confirmed selection; structurally matches the ui contract. */
export type SeleccionExportacionListado = Readonly<{
  alcance: AlcanceExportacionListado
  formato: FormatoExportacionListado
}>

export type ResultadoExportacionDesktop =
  | { readonly tipo: "exito"; readonly nombreArchivo: string }
  | { readonly tipo: "consulta_invalida"; readonly error: ApiErrorDto }
  | { readonly tipo: "sin_acceso"; readonly error: ApiErrorDto }
  | { readonly tipo: "demasiados_resultados"; readonly error: ApiErrorDto }
  | { readonly tipo: "timeout"; readonly error: ApiErrorDto | null }
  | { readonly tipo: "error_servidor"; readonly error: ApiErrorDto | null }

export interface OpcionesExportacionListado {
  /** Injectable transport seam (tests); defaults to the global `fetch`. */
  readonly fetchImpl?: typeof fetch
  /** Injectable download side effect (tests); defaults to an anchor click. */
  readonly descargaImpl?: (blob: Blob, nombreArchivo: string) => void
  /** The finalized listado query (`"pageSize=50&sort=…&q=…&f.…&cols=…"`). */
  readonly consulta?: string
}

/** Server timeout title — the contract that separates timeout from a 500. */
const TITULO_TIMEOUT_EXPORTACION = "La exportación tardó demasiado"

const ERROR_DEMASIADOS_SIN_CUERPO: ApiErrorDto = Object.freeze({
  error: "Demasiados resultados",
  campo: null,
  motivo: "Afina los filtros para reducir los animales",
  requestId: "",
})

function urlExportacion(
  fincaId: string,
  seleccion: SeleccionExportacionListado,
  consulta: string,
): string {
  const parametros = new URLSearchParams(consulta)
  parametros.set("format", seleccion.formato)
  parametros.set("scope", seleccion.alcance)
  return `/api/fincas/${fincaId}/animales/exportar?${parametros.toString()}`
}

/** Filename from `Content-Disposition`, falling back to a derived name. */
function resolverNombreArchivoExportacion(
  respuesta: Response,
  seleccion: SeleccionExportacionListado,
): string {
  const disposicion = respuesta.headers.get("Content-Disposition") ?? ""
  const coincidencia = /filename="([^"]+)"/.exec(disposicion)
  return coincidencia?.[1] ?? `animales_${seleccion.alcance}.${seleccion.formato}`
}

/** Real browser download: an anchor with `download` (no navigation/inline). */
function descargarArchivo(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement("a")
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

function esTimeoutExportacion(error: ApiErrorDto): boolean {
  return error.error === TITULO_TIMEOUT_EXPORTACION
}

export async function exportarListadoDesktop(
  fincaId: string,
  seleccion: SeleccionExportacionListado,
  opciones: OpcionesExportacionListado = {},
): Promise<ResultadoExportacionDesktop> {
  const fetchImpl = opciones.fetchImpl ?? fetch
  const descargaImpl = opciones.descargaImpl ?? descargarArchivo
  try {
    const respuesta = await fetchImpl(urlExportacion(fincaId, seleccion, opciones.consulta ?? ""), {
      headers: { Accept: "*/*" },
    })
    if (respuesta.status === 200) {
      const blob = await respuesta.blob()
      const nombreArchivo = resolverNombreArchivoExportacion(respuesta, seleccion)
      descargaImpl(blob, nombreArchivo)
      return { tipo: "exito", nombreArchivo }
    }
    const error = await leerErrorApi(respuesta)
    if (respuesta.status === 400 && error !== null) return { tipo: "consulta_invalida", error }
    if (respuesta.status === 403) {
      return { tipo: "sin_acceso", error: error ?? ERROR_SIN_ACCESO_SIN_CUERPO }
    }
    if (respuesta.status === 413) {
      return { tipo: "demasiados_resultados", error: error ?? ERROR_DEMASIADOS_SIN_CUERPO }
    }
    if (respuesta.status === 500 && error !== null && esTimeoutExportacion(error)) {
      return { tipo: "timeout", error }
    }
    return { tipo: "error_servidor", error }
  } catch {
    // Network failure or abort — fail without a false 403 and without a download.
    return { tipo: "error_servidor", error: null }
  }
}
