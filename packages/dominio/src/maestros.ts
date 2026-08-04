/**
 * Validaciones de dominio para Configuración · Maestros (Issue #147).
 *
 * Reglas del requisito RF-CONFIG-MAESTROS v1.0:
 * - CM-026: validación de campos al crear/editar un maestro (obligatorios,
 *   largos máximos, formato de email, números ≥ 0 y rechazo de HTML).
 * - CM-041: nombre único por finca entre registros activos.
 * - CM-050: edición de datos básicos de la finca.
 *
 * Diseño data-driven: los campos de cada familia se declaran en
 * `ESPECIFICACIONES_MAESTROS` y UN motor genérico los interpreta; añadir una
 * familia o un campo es añadir datos a la tabla, no escribir otro validador.
 * Los largos máximos replican el esquema Drizzle
 * (`packages/db/src/schema/maestros.ts`).
 *
 * Interpretación de CM-026 ("sin HTML"): cualquier campo de texto que
 * contenga algo parecido a una etiqueta HTML se rechaza mediante la
 * heurística `REGEX_HTML`. Es una guarda de dominio, no un parser HTML.
 *
 * Funciones puras: sin I/O, sin estado global, sin efectos secundarios —
 * testeables con fixtures en memoria (TS-003). Nombres en español (T-003).
 */

export type FamiliaMaestro =
  | "veterinarios"
  | "propietarios"
  | "potreros"
  | "sectores"
  | "lotes"
  | "grupos"
  | "hierros"
  | "diagnosticos"
  | "motivos_ventas"
  | "causas_muerte"
  | "lugares_compras"

export type ValorCampoMaestro = string | number | null

export type DatosMaestroNormalizados = Readonly<Record<string, ValorCampoMaestro>>

export interface ErrorValidacionMaestro {
  readonly campo: string
  /** ID de regla citada, p. ej. "CM-026", "CM-041" o "CM-050". */
  readonly regla: string
  /** Mensaje es-CO neutro/profesional; para mostrar, no para branching. */
  readonly detalle: string
}

export type ResultadoValidacionMaestro =
  | { readonly valido: true; readonly valores: DatosMaestroNormalizados }
  | { readonly valido: false; readonly errores: readonly ErrorValidacionMaestro[] }

export type TipoCampoMaestro = "texto" | "email" | "numero" | "entero"

export interface EspecificacionCampoMaestro {
  readonly tipo: TipoCampoMaestro
  readonly requerido: boolean
  /** Largo máximo en caracteres; sólo para campos de texto/email. */
  readonly max?: number
}

export type EspecificacionFamiliaMaestro = Readonly<Record<string, EspecificacionCampoMaestro>>

/** Compartido por grupos, hierros, motivos_ventas y causas_muerte. */
const CAMPOS_NOMBRE_DESCRIPCION: EspecificacionFamiliaMaestro = {
  nombre: { tipo: "texto", requerido: true, max: 100 },
  descripcion: { tipo: "texto", requerido: false },
}

/** Compartido por potreros y sectores (idénticos según el requisito §4). */
const CAMPOS_POTREROS_SECTORES: EspecificacionFamiliaMaestro = {
  codigo: { tipo: "texto", requerido: true, max: 20 },
  nombre: { tipo: "texto", requerido: true, max: 100 },
  area_hectareas: { tipo: "numero", requerido: false },
  tipo_pasto: { tipo: "texto", requerido: false, max: 100 },
  capacidad_maxima: { tipo: "entero", requerido: false },
  estado: { tipo: "texto", requerido: false, max: 20 },
}

/**
 * Especificación data-driven de las 11 familias de maestros: campos,
 * obligatoriedad, tipo y largo máximo (esquema Drizzle).
 */
export const ESPECIFICACIONES_MAESTROS: Readonly<
  Record<FamiliaMaestro, EspecificacionFamiliaMaestro>
> = {
  veterinarios: {
    nombre: { tipo: "texto", requerido: true, max: 100 },
    telefono: { tipo: "texto", requerido: false, max: 20 },
    email: { tipo: "email", requerido: false, max: 100 },
    direccion: { tipo: "texto", requerido: false },
    numero_registro: { tipo: "texto", requerido: false, max: 50 },
    especialidad: { tipo: "texto", requerido: false, max: 100 },
  },
  propietarios: {
    nombre: { tipo: "texto", requerido: true, max: 100 },
    tipo_documento: { tipo: "texto", requerido: false, max: 20 },
    numero_documento: { tipo: "texto", requerido: false, max: 50 },
    telefono: { tipo: "texto", requerido: false, max: 20 },
    email: { tipo: "email", requerido: false, max: 100 },
    direccion: { tipo: "texto", requerido: false },
  },
  potreros: CAMPOS_POTREROS_SECTORES,
  sectores: CAMPOS_POTREROS_SECTORES,
  lotes: {
    nombre: { tipo: "texto", requerido: true, max: 100 },
    descripcion: { tipo: "texto", requerido: false },
    tipo: { tipo: "texto", requerido: false, max: 50 },
  },
  grupos: CAMPOS_NOMBRE_DESCRIPCION,
  hierros: CAMPOS_NOMBRE_DESCRIPCION,
  diagnosticos: {
    nombre: { tipo: "texto", requerido: true, max: 100 },
    descripcion: { tipo: "texto", requerido: false },
    categoria: { tipo: "texto", requerido: false, max: 50 },
  },
  motivos_ventas: CAMPOS_NOMBRE_DESCRIPCION,
  causas_muerte: CAMPOS_NOMBRE_DESCRIPCION,
  lugares_compras: {
    nombre: { tipo: "texto", requerido: true, max: 100 },
    tipo: { tipo: "texto", requerido: false, max: 50 },
    ubicacion: { tipo: "texto", requerido: false },
    contacto: { tipo: "texto", requerido: false },
    telefono: { tipo: "texto", requerido: false, max: 20 },
  },
}

/** Especificación de la finca para edición (CM-050). */
const ESPECIFICACION_FINCA: EspecificacionFamiliaMaestro = {
  nombre: { tipo: "texto", requerido: true, max: 100 },
  departamento: { tipo: "texto", requerido: false, max: 100 },
  municipio: { tipo: "texto", requerido: false, max: 100 },
  vereda: { tipo: "texto", requerido: false, max: 100 },
  area_hectareas: { tipo: "numero", requerido: false },
  capacidad_maxima: { tipo: "entero", requerido: false },
  tipo_explotacion_id: { tipo: "texto", requerido: false },
}

/** Heurística "sin HTML" (interpretación de CM-026): algo parecido a una etiqueta. */
const REGEX_HTML = /<[a-z][\s\S]*\/?>/i

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Coerciones aceptadas de `es_inseminador` a 0|1 (sólo veterinarios). */
const COERCION_ES_INSEMINADOR: ReadonlyMap<unknown, 0 | 1> = new Map<unknown, 0 | 1>([
  [1, 1],
  ["1", 1],
  [true, 1],
  [0, 0],
  ["0", 0],
  [false, 0],
])

function error(campo: string, regla: string, detalle: string): ErrorValidacionMaestro {
  return { campo, regla, detalle }
}

/** Nombre de campo legible en mensajes: "area_hectareas" → "area hectareas". */
function nombreLegible(campo: string): string {
  return campo.replaceAll("_", " ")
}

type ResultadoCampo =
  | { readonly valor: ValorCampoMaestro }
  | { readonly error: ErrorValidacionMaestro }

function validarCampoNumerico(
  campo: string,
  legible: string,
  especificacion: EspecificacionCampoMaestro,
  bruto: unknown,
  regla: string,
): ResultadoCampo {
  let numero: number
  if (typeof bruto === "number") {
    numero = bruto
  } else if (typeof bruto === "string") {
    numero = Number(bruto.trim())
  } else {
    return { error: error(campo, regla, `El campo ${legible} debe ser un número válido.`) }
  }

  if (!Number.isFinite(numero)) {
    return { error: error(campo, regla, `El campo ${legible} debe ser un número válido.`) }
  }
  if (numero < 0) {
    return { error: error(campo, regla, `El campo ${legible} debe ser mayor o igual a 0.`) }
  }
  if (especificacion.tipo === "entero" && !Number.isInteger(numero)) {
    return { error: error(campo, regla, `El campo ${legible} debe ser un número entero.`) }
  }
  return { valor: numero }
}

/** Resultado para un campo ausente o blank: error si es requerido, null si no. */
function valorAusenteOBlank(
  campo: string,
  legible: string,
  especificacion: EspecificacionCampoMaestro,
  regla: string,
): ResultadoCampo {
  return especificacion.requerido
    ? { error: error(campo, regla, `El ${legible} es obligatorio.`) }
    : { valor: null }
}

/** Coerce la entrada de un campo de texto/email; rechaza tipos no textuales. */
function coercerATexto(
  campo: string,
  legible: string,
  bruto: unknown,
  regla: string,
): { readonly texto: string } | { readonly error: ErrorValidacionMaestro } {
  if (typeof bruto === "string") {
    return { texto: bruto.trim() }
  }
  if (typeof bruto === "number") {
    // Coerción numérica (p. ej. teléfono llegado como número desde un formulario).
    return { texto: String(bruto) }
  }
  return { error: error(campo, regla, `El campo ${legible} debe ser texto.`) }
}

function validarCampo(
  campo: string,
  especificacion: EspecificacionCampoMaestro,
  bruto: unknown,
  regla: string,
): ResultadoCampo {
  const legible = nombreLegible(campo)

  if (bruto === undefined || bruto === null) {
    return valorAusenteOBlank(campo, legible, especificacion, regla)
  }

  // String blank (vacío o sólo espacios) equivale a ausente, sea cual sea el tipo.
  if (typeof bruto === "string" && bruto.trim().length === 0) {
    return valorAusenteOBlank(campo, legible, especificacion, regla)
  }

  if (especificacion.tipo === "numero" || especificacion.tipo === "entero") {
    return validarCampoNumerico(campo, legible, especificacion, bruto, regla)
  }

  const coercion = coercerATexto(campo, legible, bruto, regla)
  if ("error" in coercion) {
    return coercion
  }
  const texto = coercion.texto

  if (REGEX_HTML.test(texto)) {
    return { error: error(campo, regla, "El texto no puede contener HTML.") }
  }
  if (especificacion.max !== undefined && texto.length > especificacion.max) {
    return {
      error: error(
        campo,
        regla,
        `El ${legible} supera el máximo de ${especificacion.max} caracteres.`,
      ),
    }
  }
  if (especificacion.tipo === "email" && !REGEX_EMAIL.test(texto)) {
    return { error: error(campo, regla, "El email no tiene un formato válido.") }
  }
  return { valor: texto }
}

function validarContraEspecificacion(
  especificacion: EspecificacionFamiliaMaestro,
  datos: Readonly<Record<string, unknown>>,
  regla: string,
): {
  readonly errores: ErrorValidacionMaestro[]
  readonly valores: Record<string, ValorCampoMaestro>
} {
  const errores: ErrorValidacionMaestro[] = []
  const valores: Record<string, ValorCampoMaestro> = {}

  // Sólo se recorren campos de la especificación: los desconocidos se ignoran.
  for (const [campo, campoEspecificacion] of Object.entries(especificacion)) {
    const resultado = validarCampo(campo, campoEspecificacion, datos[campo], regla)
    if ("error" in resultado) {
      errores.push(resultado.error)
    } else {
      valores[campo] = resultado.valor
    }
  }

  return { errores, valores }
}

/**
 * Valida y normaliza los datos de un maestro de la familia indicada (CM-026).
 *
 * Comportamiento:
 * - Requerido ausente/`null`/blank → error CM-026 "… es obligatorio.".
 * - Strings con trim; opcional vacío/blank → `null` (nunca string vacío).
 * - Largo máximo según `ESPECIFICACIONES_MAESTROS` (esquema Drizzle).
 * - `email` (si se ingresa): formato básico obligatorio.
 * - `area_hectareas`: número ≥ 0 con decimales; `capacidad_maxima`: entero
 *   ≥ 0. Aceptan number o string numérico y normalizan a number.
 * - Sin HTML (interpretación de CM-026): texto con algo parecido a una
 *   etiqueta HTML (`REGEX_HTML`) se rechaza.
 * - Campos de texto aceptan string (o number, coercido); otro tipo → error.
 * - `es_inseminador` SOLO en "veterinarios": si viene presente debe coercer
 *   a 0|1 (0, 1, "0", "1", true, false) y se normaliza a number; cualquier
 *   otro valor presente (incluido `null`) es error. Ausente → no aparece en
 *   `valores` (lo decide el caso de uso).
 * - Campos desconocidos (fuera de la especificación) se ignoran.
 *
 * @returns `{ valido: true, valores }` con SOLO campos de la especificación
 *          normalizados, o `{ valido: false, errores }` con todos los errores.
 */
export function validarDatosMaestro(
  familia: FamiliaMaestro,
  datos: Readonly<Record<string, unknown>>,
): ResultadoValidacionMaestro {
  const { errores, valores } = validarContraEspecificacion(
    ESPECIFICACIONES_MAESTROS[familia],
    datos,
    "CM-026",
  )

  if (familia === "veterinarios" && datos.es_inseminador !== undefined) {
    const esInseminador = COERCION_ES_INSEMINADOR.get(datos.es_inseminador)
    if (esInseminador === undefined) {
      errores.push(error("es_inseminador", "CM-026", "El campo es_inseminador debe ser 0 o 1."))
    } else {
      valores.es_inseminador = esInseminador
    }
  }

  return errores.length > 0 ? { valido: false, errores } : { valido: true, valores }
}

/**
 * Valida la unicidad del nombre de un maestro (CM-041 / R-D1).
 *
 * La comparación ignora mayúsculas y espacios sobrantes
 * (`trim().toLowerCase()`). `nombresActivos` debe contener SÓLO registros
 * activos: los inactivos no reservan nombre y quien llama aplica el filtro.
 * En edición, `idPropio` excluye el registro que se está editando.
 *
 * Nombre vacío/blank se rechaza como guarda de entrada (CM-026), con un
 * detalle distinto al de duplicado.
 *
 * @returns `{ valido: true }` o `{ valido: false, error }` citando CM-041
 *          (duplicado) o CM-026 (nombre vacío).
 */
export function validarNombreUnicoMaestro(
  nombre: string,
  nombresActivos: ReadonlyArray<{ readonly id: string; readonly nombre: string }>,
  idPropio?: string,
): { readonly valido: true } | { readonly valido: false; readonly error: ErrorValidacionMaestro } {
  const normalizado = nombre.trim().toLowerCase()
  if (normalizado.length === 0) {
    return {
      valido: false,
      error: error("nombre", "CM-026", "El nombre es obligatorio."),
    }
  }

  const duplicado = nombresActivos.some(
    (registro) => registro.id !== idPropio && registro.nombre.trim().toLowerCase() === normalizado,
  )
  if (duplicado) {
    return {
      valido: false,
      error: error("nombre", "CM-041", "Ya existe un registro con ese nombre."),
    }
  }
  return { valido: true }
}

/**
 * Valida y normaliza los datos básicos de la finca para edición (CM-050).
 *
 * Aplica el mismo motor que los maestros (trim, blank → `null`, sin HTML,
 * largos máximos, números ≥ 0): `nombre` obligatorio ≤ 100; departamento,
 * municipio y vereda ≤ 100; `area_hectareas` número con decimales;
 * `capacidad_maxima` entero; `tipo_explotacion_id` opcional (blank → `null`).
 * Los errores citan la regla "CM-050".
 */
export function validarDatosFinca(
  datos: Readonly<Record<string, unknown>>,
): ResultadoValidacionMaestro {
  const { errores, valores } = validarContraEspecificacion(ESPECIFICACION_FINCA, datos, "CM-050")
  return errores.length > 0 ? { valido: false, errores } : { valido: true, valores }
}
