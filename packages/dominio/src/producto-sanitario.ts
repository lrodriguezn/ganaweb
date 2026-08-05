/**
 * Dominio del catálogo de productos sanitarios (Issue #209, RF-SANIDAD v0.2 §6).
 *
 * Reglas implementadas:
 * - SAN-020: validación de los campos del catálogo estilo CM-026 — trim,
 *   requeridos (`codigo`, `descripcion`), sin HTML, errores con forma
 *   `{ campo, detalle }` (la forma de error del módulo, definida en
 *   `sanidad.ts`).
 * - §3 del requisito / §13.13: el enum `tipo_tratamiento` se revalida con
 *   `validarTipoTratamiento` (el CHECK vive sólo en schema_v3; Drizzle
 *   declara texto plano, así que el dominio es dueño de la validación).
 * - SAN-023 / CM-041: duplicado de `codigo` entre registros ACTIVOS de la
 *   misma finca, case-insensitive → error de campo `codigo`.
 * - KPI-10 / T-001: `STOCK_MINIMO_DOSIS_DEFAULT` es SOLO el fallback
 *   documentado para fincas sin el parámetro `stock_minimo_dosis` en
 *   `config_parametros_finca`; el umbral efectivo se lee en runtime vía
 *   puerto y nunca se hardcodea en la cadena de consulta.
 *
 * El esquema v3 manda (IA-002):
 * - `codigo`, `descripcion`, `comentarios` son TEXT sin límite de longitud;
 *   no se inventan máximos.
 * - `ml_mg_por_dosis` NUMERIC(10,2) y `precio_dosis` NUMERIC(14,2) acotan
 *   los rangos numéricos (precisión del esquema).
 * - `tipo_tratamiento` NOT NULL DEFAULT 'no_reproductivo' — ausente en la
 *   entrada toma el default del esquema.
 * - `productos_sanitarios` NO tiene `usuario_creado_por`: PE-006 se
 *   interpreta para eventos (aplicaciones/entradas), no para el catálogo.
 *
 * Funciones puras: sin I/O, sin estado global (TS-003). Nombres en español
 * (T-003).
 */

import {
  type ErrorValidacionSanidad,
  type TipoTratamientoSanidad,
  validarTipoTratamiento,
} from "./sanidad.js"

export type { ErrorValidacionSanidad }

/**
 * KPI-10 / T-001: fallback del umbral de stock bajo.
 *
 * Valor replicado del seed de `config_parametros_finca`
 * (`stock_minimo_dosis` = '20'). Se usa ÚNICAMENTE cuando la finca no tiene
 * el parámetro; si el parámetro existe, el adaptador lo devuelve y este
 * default no participa.
 */
export const STOCK_MINIMO_DOSIS_DEFAULT = 20

/** Precisión del esquema v3: NUMERIC(10,2) → 8 dígitos enteros. */
const MAX_ML_MG_POR_DOSIS = 99999999.99
/** Precisión del esquema v3: NUMERIC(14,2) → 12 dígitos enteros. */
const MAX_PRECIO_DOSIS = 999999999999.99

/** Heurística "sin HTML" (interpretación CM-026): algo parecido a una etiqueta. */
const REGEX_HTML = /<[a-z][\s\S]*\/?>/i

/** Entrada cruda del formulario/server function: todo llega como `unknown`. */
export type DatosProductoSanitarioEntrada = {
  readonly codigo: unknown
  readonly descripcion: unknown
  readonly mlMgPorDosis?: unknown
  readonly tipoTratamiento?: unknown
  readonly precioDosis?: unknown
  readonly comentarios?: unknown
}

/** Valores normalizados tras validación válida — listos para persistir. */
export type ProductoSanitarioValidado = {
  readonly codigo: string
  readonly descripcion: string
  readonly mlMgPorDosis: number | null
  readonly tipoTratamiento: TipoTratamientoSanidad
  readonly precioDosis: number | null
  readonly comentarios: string | null
}

export type ResultadoValidacionProductoSanitario =
  | { readonly valido: true; readonly valores: ProductoSanitarioValidado }
  | { readonly valido: false; readonly errores: readonly ErrorValidacionSanidad[] }

function error(campo: string, detalle: string): ErrorValidacionSanidad {
  return { campo, detalle }
}

function aTextoRecortado(valor: unknown): string | null {
  if (typeof valor !== "string") return null
  const recortado = valor.trim()
  return recortado.length > 0 ? recortado : null
}

/**
 * Coerción numérica de formulario: acepta `number` finito o `string`
 * numérico (recortado). Devuelve null para ausente/blank — los numéricos
 * del catálogo son opcionales (SAN-020).
 */
function aNumeroOpcional(
  valor: unknown,
): { readonly ok: true; readonly numero: number | null } | { readonly ok: false } {
  if (valor === null || valor === undefined) return { ok: true, numero: null }
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? { ok: true, numero: valor } : { ok: false }
  }
  if (typeof valor === "string") {
    const recortado = valor.trim()
    if (recortado.length === 0) return { ok: true, numero: null }
    const numero = Number(recortado)
    return Number.isFinite(numero) ? { ok: true, numero } : { ok: false }
  }
  return { ok: false }
}

function validarTextoRequerido(
  valor: unknown,
  campo: string,
  nombreLegible: string,
  errores: ErrorValidacionSanidad[],
): string | null {
  const texto = aTextoRecortado(valor)
  if (texto === null) {
    errores.push(error(campo, `El campo ${nombreLegible} es obligatorio.`))
    return null
  }
  if (REGEX_HTML.test(texto)) {
    errores.push(error(campo, `El campo ${nombreLegible} no puede contener HTML.`))
    return null
  }
  return texto
}

function validarNumeroOpcional(
  valor: unknown,
  campo: string,
  nombreLegible: string,
  maximo: number,
  errores: ErrorValidacionSanidad[],
): number | null {
  if (valor === null || valor === undefined) return null
  const coercion = aNumeroOpcional(valor)
  if (!coercion.ok) {
    errores.push(error(campo, `El campo ${nombreLegible} debe ser un número.`))
    return null
  }
  const numero = coercion.numero
  if (numero === null) return null
  if (numero < 0 || numero > maximo) {
    errores.push(
      error(campo, `El campo ${nombreLegible} debe ser un número entre 0 y ${maximo}.`),
    )
    return null
  }
  return numero
}

/**
 * Proyección pura de un registro genérico (formulario/server function) a la
 * entrada tipada de validación. Los campos ausentes llegan como `undefined`
 * y la validación decide su tratamiento (requerido vs opcional).
 */
export function datosProductoSanitarioDesdeRecord(
  datos: Readonly<Record<string, unknown>>,
): DatosProductoSanitarioEntrada {
  return {
    codigo: datos.codigo,
    descripcion: datos.descripcion,
    mlMgPorDosis: datos.mlMgPorDosis,
    tipoTratamiento: datos.tipoTratamiento,
    precioDosis: datos.precioDosis,
    comentarios: datos.comentarios,
  }
}

/**
 * SAN-020 (estilo CM-026): valida los campos del producto sanitario.
 *
 * Devuelve TODOS los errores encontrados (no corta en el primero) para que
 * la UI pueda mostrarlos de una sola pasada. Normaliza: trim de textos,
 * blank → null en opcionales, coerción de numéricos desde texto, y
 * `tipo_tratamiento` ausente → default del esquema ('no_reproductivo').
 */
export function validarDatosProductoSanitario(
  datos: DatosProductoSanitarioEntrada,
): ResultadoValidacionProductoSanitario {
  const errores: ErrorValidacionSanidad[] = []

  const codigo = validarTextoRequerido(datos.codigo, "codigo", "código", errores)
  const descripcion = validarTextoRequerido(datos.descripcion, "descripcion", "descripción", errores)

  const mlMgPorDosis = validarNumeroOpcional(
    datos.mlMgPorDosis,
    "ml_mg_por_dosis",
    "ml/mg por dosis",
    MAX_ML_MG_POR_DOSIS,
    errores,
  )
  const precioDosis = validarNumeroOpcional(
    datos.precioDosis,
    "precio_dosis",
    "precio por dosis",
    MAX_PRECIO_DOSIS,
    errores,
  )

  let tipoTratamiento: TipoTratamientoSanidad = "no_reproductivo"
  if (datos.tipoTratamiento !== null && datos.tipoTratamiento !== undefined) {
    const resultadoTipo = validarTipoTratamiento(datos.tipoTratamiento)
    if (resultadoTipo.valido) {
      tipoTratamiento = resultadoTipo.valor
    } else {
      errores.push(resultadoTipo.error)
    }
  }

  let comentarios: string | null = null
  if (datos.comentarios !== null && datos.comentarios !== undefined) {
    const texto = aTextoRecortado(datos.comentarios)
    if (texto !== null && REGEX_HTML.test(texto)) {
      errores.push(error("comentarios", "El campo comentarios no puede contener HTML."))
    } else {
      comentarios = texto
    }
  }

  if (errores.length > 0) return { valido: false, errores }
  if (codigo === null || descripcion === null) {
    // inalcanzable con errores vacíos; guarda de tipos para el compilador
    return { valido: false, errores: [error("codigo", "El campo código es obligatorio.")] }
  }
  return {
    valido: true,
    valores: { codigo, descripcion, mlMgPorDosis, tipoTratamiento, precioDosis, comentarios },
  }
}

/**
 * SAN-023 / CM-041: unicidad del `codigo` entre registros ACTIVOS de la
 * misma finca, case-insensitive y con trim.
 *
 * `codigosActivos` debe contener SÓLO registros activos: los inactivos no
 * reservan código (SAN-021 — reactivar conserva el código original). En
 * edición, `idPropio` excluye el registro que se está editando. Código
 * vacío/blank se rechaza como guarda de entrada (SAN-020).
 */
export function validarCodigoUnicoProductoSanitario(
  codigo: string,
  codigosActivos: readonly { readonly id: string; readonly codigo: string }[],
  idPropio?: string,
): { readonly valido: true } | { readonly valido: false; readonly error: ErrorValidacionSanidad } {
  const normalizado = codigo.trim().toLowerCase()
  if (normalizado.length === 0) {
    return { valido: false, error: error("codigo", "El campo código es obligatorio.") }
  }

  const duplicado = codigosActivos.some(
    (registro) =>
      registro.id !== idPropio && registro.codigo.trim().toLowerCase() === normalizado,
  )
  if (duplicado) {
    return {
      valido: false,
      error: error("codigo", "Ya existe un producto activo con ese código (SAN-023)."),
    }
  }
  return { valido: true }
}
