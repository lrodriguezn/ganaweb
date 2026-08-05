/**
 * Puertos del módulo Sanidad (Issue #208, RF-SANIDAD v0.2).
 *
 * Contratos type-only de la capa de aplicación (D6) para el evento
 * `AplicarProductoSanitario` (§4 arquitectura funcional) y la anulación de
 * registros grupales (RN-051). Los adaptadores Drizzle viven en `packages/db`
 * (driver PostgreSQL); el driver de la réplica local offline aún no existe en
 * `packages/db` — el contrato queda listo para implementarlo cuando llegue el
 * MVP de sync (riesgo #2 del requisito).
 *
 * Nombres en español (T-003).
 */

import type {
  AplicacionPreviaSanidad,
  AplicacionSanitariaNueva,
  EstadoAnimalEventoSanidad,
} from "@ganaweb/dominio"

export type { AplicacionPreviaSanidad, AplicacionSanitariaNueva, EstadoAnimalEventoSanidad }

/**
 * Datos mínimos del producto sanitario para el caso de uso: scope de finca
 * (PE-002), snapshot de precio (RN-040) y disponibilidad en captura (RN-050).
 */
export type ProductoSanitarioReferencia = {
  readonly id: string
  readonly fincaId: string
  readonly codigo: string
  readonly descripcion: string
  readonly tipoTratamiento: string
  readonly precioDosis: number | null
  readonly mlMgPorDosis: number | null
  readonly activo: boolean
}

/**
 * Estado del animal relevante para RN-002/RN-003. Fechas como ISO YYYY-MM-DD
 * (el adaptador convierte `animales.fecha_nacimiento`/`fecha_compra`, que son
 * epoch segundos, y toma la fecha de venta/muerte de `ventas`/`muertes`).
 * `fechaSalida` es null para animales EN_FINCA.
 */
export type AnimalEventoSanidadReferencia = {
  readonly id: string
  readonly fincaId: string
  readonly estadoActual: EstadoAnimalEventoSanidad
  readonly fechaNacimiento: string | null
  readonly fechaCompra: string | null
  readonly fechaSalida: string | null
}

/**
 * Lecturas del caso de uso `aplicarProductoSanitario`.
 *
 * `obtenerProducto`/`obtenerAnimales` NO filtran por finca: el scope lo
 * revalida el caso de uso comparando `fincaId` (patrón CM-024, PE-002).
 */
export interface SanidadLecturaPort {
  /** Null si el producto no existe. */
  obtenerProducto(id: string): Promise<ProductoSanitarioReferencia | null>

  /** Sólo los animales encontrados; los ausentes los reporta el caso de uso. */
  obtenerAnimales(ids: readonly string[]): Promise<readonly AnimalEventoSanidadReferencia[]>

  /**
   * Aplicaciones previas del mismo producto para esos animales, EXCLUIDAS las
   * de grupos anulados (RN-051). Fuente del motor de refuerzos (RN-042).
   */
  listarAplicacionesPrevias(
    productoId: string,
    animalIds: readonly string[],
  ): Promise<readonly AplicacionPreviaSanidad[]>

  /**
   * RN-041: stock SIEMPRE calculado (vista `inventario_sanitario`):
   * Σ almacen_entradas.dosis − Σ aplicaciones.dosis (sin filas anuladas).
   * 0 si el producto no tiene movimientos.
   */
  obtenerStockDisponible(productoId: string): Promise<number>
}

/** Cabecera `registros_grupales` para una captura de tratamiento (RN-052). */
export type RegistroGrupalTratamientoNuevo = {
  readonly id: string
  readonly fincaId: string
  readonly tipoEvento: "tratamiento"
  readonly totalAnimales: number
  readonly fecha: Date
  readonly usuarioCreadoPor: string
  readonly descripcion: string | null
}

/**
 * Escritura del evento de aplicación y anulación grupal.
 *
 * `registrarAplicaciones` escribe cabecera (si existe) + filas hijas en UNA
 * transacción (T-002: append-only; el outbox se cablea en #209–#211).
 * `anularRegistroGrupal` marca `anulado_en` en la cabecera y anula lógicamente
 * todas las filas hijas en una transacción (RN-051).
 */
export interface SanidadEscrituraPort {
  registrarAplicaciones(entrada: {
    readonly registroGrupal: RegistroGrupalTratamientoNuevo | null
    readonly aplicaciones: readonly AplicacionSanitariaNueva[]
    /** PE-006: todo insert de evento lleva usuario_creado_por. */
    readonly usuarioCreadoPor: string
  }): Promise<
    | { readonly tipo: "aplicado"; readonly aplicacionIds: readonly string[] }
    | { readonly tipo: "conflicto"; readonly detalle: string }
    | { readonly tipo: "error"; readonly detalle: string }
  >

  anularRegistroGrupal(
    id: string,
    fincaId: string,
    anuladoEn: Date,
  ): Promise<
    | { readonly tipo: "anulado" }
    | { readonly tipo: "no_encontrado" }
    | { readonly tipo: "conflicto"; readonly detalle: string }
    | { readonly tipo: "error"; readonly detalle: string }
  >
}
