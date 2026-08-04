/**
 * Puerto de conteos del hub de Configuración · Maestros (issue #147,
 * RF-CONFIG-MAESTROS v1.0, CM-061).
 *
 * El hub muestra, para la finca activa, cuántos registros activos hay por
 * familia de maestro, cuántos inseminadores existen (CM-040), si la finca
 * está completa (CM-007) y cuántos registros activos tienen los catálogos
 * globales. Todo se resuelve en UNA única consulta agregada (CM-061) para
 * evitar N+1 sobre las 11 tablas de maestros.
 *
 * Interpretación de "ubicación completa" (CM-007): la finca tiene `nombre`
 * no blank Y al menos uno entre `departamento` o `municipio` no blank.
 * `vereda` sola NO cuenta como ubicación completa.
 *
 * Los adaptadores Drizzle vivirán en `packages/db` (issue #147, paso db);
 * este archivo es un contrato type-only de la capa de aplicación (D6).
 * Nombres en español (T-003).
 */

import type { FamiliaMaestro } from "@ganaweb/dominio"

export type { FamiliaMaestro }

/** Resultado agregado de los conteos del hub (CM-061). */
export interface ConteosMaestrosResultado {
  /** Registros activo=1 por familia de maestro de la finca. */
  readonly porMaestro: Readonly<Record<FamiliaMaestro, number>>
  /** CM-040: veterinarios con es_inseminador=1 AND activo=1. */
  readonly inseminadores: number
  /**
   * CM-007: true si la finca tiene nombre + ubicación (departamento o
   * municipio no blank; vereda sola no cuenta).
   */
  readonly fincaCompleta: boolean
  /** Catálogos globales (sin finca): registros activo=1. */
  readonly catalogosGlobales: Readonly<Record<"razas" | "tiposExplotacion" | "calidades", number>>
}

/** Claves individuales de la degradación por card del hub (CM-014). */
export type ConteoFamiliaClave = FamiliaMaestro | "inseminadores" | "fincaCompleta"
export type ConteoCatalogoGlobalClave = "razas" | "tiposExplotacion" | "calidades"

/**
 * Puerto de lectura agregada de conteos de maestros. `contarTodo` debe
 * implementarse con un único statement SQL (CM-061).
 *
 * CM-014: cuando `contarTodo` falla, el hub degrada por card y pide los
 * conteos individuales (`contarPorFamilia` / `contarCatalogoGlobal`); por
 * eso estos métodos devuelven `null` en error en vez de lanzar.
 */
export interface ConteosMaestrosPort {
  contarTodo(fincaId: string): Promise<ConteosMaestrosResultado>

  /** CM-014: conteo individual para la degradación por card cuando contarTodo falla. Null si falla. */
  contarPorFamilia(fincaId: string, familia: ConteoFamiliaClave): Promise<number | null>

  /** CM-014: conteo individual de un catálogo global. Null si falla. */
  contarCatalogoGlobal(catalogo: ConteoCatalogoGlobalClave): Promise<number | null>
}
