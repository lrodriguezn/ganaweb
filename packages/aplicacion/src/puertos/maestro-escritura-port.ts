/**
 * Puertos de escritura de Configuración · Maestros (issue #147,
 * RF-CONFIG-MAESTROS v1.0).
 *
 * `MaestroEscrituraPort` cubre las 11 familias de maestros por finca;
 * `FincaEscrituraPort` cubre los datos básicos de la finca (CM-050).
 *
 * Los resultados `conflicto` provienen de restricciones UNIQUE de la base
 * de datos — p. ej. potreros y sectores tienen UNIQUE(finca_id, codigo)
 * (CM-032); el adaptador identifica el campo en conflicto y lo reporta.
 * Los adaptadores Drizzle vivirán en `packages/db` (issue #147, paso db);
 * este archivo es un contrato type-only de la capa de aplicación (D6).
 *
 * Nombres en español (T-003).
 */

import type { DatosMaestroNormalizados, FamiliaMaestro } from "@ganaweb/dominio"

export type { DatosMaestroNormalizados, FamiliaMaestro }

/**
 * Datos mínimos de un registro para el control de scope (CM-024):
 * `obtenerPorId` NO filtra por finca; el caso de uso verifica la
 * pertenencia comparando `fincaId`.
 */
export interface RegistroMaestroScope {
  readonly id: string
  readonly fincaId: string
}

export interface MaestroEscrituraPort {
  /** Busca por id SIN filtrar por finca (el scope lo aplica el caso de uso). Null si no existe. */
  obtenerPorId(familia: FamiliaMaestro, id: string): Promise<RegistroMaestroScope | null>

  /** Nombres de registros activo=1 de la finca (para la regla de duplicados R-D1/CM-041). */
  listarNombresActivos(
    familia: FamiliaMaestro,
    fincaId: string,
  ): Promise<ReadonlyArray<{ readonly id: string; readonly nombre: string }>>

  /**
   * Inserta un registro. `datos` contiene sólo campos normalizados del
   * dominio (incluye `es_inseminador` sólo si aplica — veterinarios,
   * CM-040). `conflicto`: restricción UNIQUE de la base (CM-032), con el
   * campo que la dispara.
   */
  crear(
    familia: FamiliaMaestro,
    fincaId: string,
    datos: DatosMaestroNormalizados,
  ): Promise<
    | { readonly tipo: "creado"; readonly id: string }
    | { readonly tipo: "conflicto"; readonly campo: string }
    | { readonly tipo: "error"; readonly detalle: string }
  >

  /**
   * Actualiza EXACTAMENTE las llaves presentes en `datos` (semántica de
   * campos presentes: lo ausente no se toca). `conflicto`: igual que en
   * `crear` (CM-032).
   */
  editar(
    familia: FamiliaMaestro,
    fincaId: string,
    id: string,
    datos: DatosMaestroNormalizados,
  ): Promise<
    | { readonly tipo: "actualizado" }
    | { readonly tipo: "no_encontrado" }
    | { readonly tipo: "conflicto"; readonly campo: string }
    | { readonly tipo: "error"; readonly detalle: string }
  >

  /** RN-050: activar/inactivar es la única baja posible; no existe borrado. */
  cambiarEstado(
    familia: FamiliaMaestro,
    fincaId: string,
    id: string,
    activo: 0 | 1,
  ): Promise<
    | { readonly tipo: "estado_actualizado" }
    | { readonly tipo: "no_encontrado" }
    | { readonly tipo: "error"; readonly detalle: string }
  >
}

/** Contrato de escritura de los datos básicos de la finca (CM-050). */
export interface FincaEscrituraPort {
  actualizarDatosBasicos(
    fincaId: string,
    datos: DatosMaestroNormalizados,
  ): Promise<
    | { readonly tipo: "actualizado" }
    | { readonly tipo: "no_encontrado" }
    | { readonly tipo: "error"; readonly detalle: string }
  >
}
