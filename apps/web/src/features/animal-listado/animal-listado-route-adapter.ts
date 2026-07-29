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
 * the canonical registry, formats null-safe cells, and sanitizes a 400
 * (LA-040–043). `Lugar compra` is not a column and must never render.
 */
import {
  ANIMAL_LIST_COLUMNS,
  type AnimalListColumnId,
  type AnimalListResponseKey,
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

export type AnimalListadoDesktopModel = Readonly<{
  columns: readonly AnimalListadoColumn[] // 29 visible by default; 36 recognized
  rows: readonly AnimalListadoRowDto[]
  total: number
  totalSinFiltro: number
  permissions: AnimalListadoVisualPermissions
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
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one bounded display branch per column of the 36-field transport contract.
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

function reiniciaPagina(campo: string): boolean {
  return CAMPOS_CON_REINICIO_DE_PAGINA.has(campo) || campo.startsWith("f.")
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
  if (campo !== null && sanitizedQuery.has(campo)) {
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
