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
 * Issue #210: entradas de almacén append-only (SAN-030..SAN-032).
 *
 * Nombres en español (T-003).
 */

import type {
  AplicacionPreviaSanidad,
  AplicacionSanitariaNueva,
  EstadoAnimalEventoSanidad,
} from "@ganaweb/dominio"
import type { NotificacionNueva, NotificacionesEscrituraPort } from "./notificaciones-port.js"

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
 * Issue #211 (SAN-043): animal selectable en el registro de aplicación —
 * la forma mínima serializable (CM-042) que el drawer necesita.
 */
export type AnimalSanidadListado = {
  readonly id: string
  readonly codigo: string
  readonly nombre: string
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

  /**
   * Issue #210 (SAN-014/SAN-063): entradas de almacén de la finca, ordenadas
   * por fecha descendente. El scope de finca sale del join con
   * `productos_sanitarios` (`almacen_entradas` no tiene `finca_id`).
   */
  listarEntradasAlmacen(fincaId: string): Promise<readonly EntradaAlmacenListada[]>

  /**
   * Issue #211 (SAN-043/RN-003): animales de la finca que estaban EN_FINCA a
   * `fecha` (ISO YYYY-MM-DD) — la selección del registro de aplicación. Un
   * animal vendido/muerto cuenta como EN_FINCA si su fecha de salida es
   * posterior a `fecha` (captura tardía permitida, RN-003). SQL portable a
   * SQLite (D3): sin rasgos PG-only.
   */
  listarAnimalesEnFinca(fincaId: string, fecha: string): Promise<readonly AnimalSanidadListado[]>
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
 * Fila de `almacen_entradas` ya registrada (Issue #210, SAN-014/SAN-030).
 * Append-only: no hay estado de edición/anulación (SAN-032/D-008).
 */
export type EntradaAlmacenSanidad = {
  readonly id: string
  readonly productoId: string
  /** ISO YYYY-MM-DD (columna DATE). */
  readonly fecha: string
  /** Entero > 0 (SAN-030). */
  readonly dosis: number
  readonly precioPorDosis: number | null
  readonly comentario: string | null
}

/**
 * Entrada de almacén para el listado (Issue #210, SAN-014): la fila más los
 * datos de producto que muestra la UI (fecha, producto, dosis, precio,
 * comentario). El join con `productos_sanitarios` da el scope por finca
 * (SAN-063), porque `almacen_entradas` no tiene `finca_id`.
 */
export type EntradaAlmacenListada = EntradaAlmacenSanidad & {
  readonly productoCodigo: string
  readonly productoDescripcion: string
}

/**
 * Entrada de almacén por registrar (Issue #210, SAN-030). El adaptador la
 * inserta junto a su fila `sync_outbox` en la MISMA transacción (T-002).
 *
 * `almacen_entradas` no tiene `finca_id` en el esquema v3: el scope sale del
 * join con `productos_sanitarios` (SAN-063). El `fincaId` viaja aquí sólo
 * para la fila `sync_outbox` (que sí lo exige) y lo aporta el caso de uso
 * tras revalidar el producto contra la finca activa — nunca de la URL.
 */
export type EntradaAlmacenNueva = {
  readonly fincaId: string
  readonly productoId: string
  readonly fecha: string
  readonly dosis: number
  readonly precioPorDosis: number | null
  readonly comentario: string | null
  /** PE-006: todo insert de evento lleva usuario_creado_por. */
  readonly usuarioCreadoPor: string
}

/**
 * Escritura del evento de aplicación y anulación grupal.
 *
 * `registrarAplicaciones` escribe cabecera (si existe) + filas hijas Y sus
 * filas `sync_outbox` en UNA transacción (T-002/RN-060, Issue #211:
 * append-only; si alguna inserción falla no queda escrita ninguna).
 * `anularRegistroGrupal` marca `anulado_en` en la cabecera y anula lógicamente
 * todas las filas hijas en una transacción (RN-051).
 */
export interface SanidadEscrituraPort {
  registrarAplicaciones(entrada: {
    /**
     * Scope de la captura para las filas `sync_outbox` (la tabla
     * `aplicaciones_sanitarias` no tiene `finca_id`). Lo aporta el caso de
     * uso tras revalidar la finca activa — nunca de la URL (SAN-063).
     */
    readonly fincaId: string
    readonly registroGrupal: RegistroGrupalTratamientoNuevo | null
    readonly aplicaciones: readonly AplicacionSanitariaNueva[]
    /** PE-006: todo insert de evento lleva usuario_creado_por. */
    readonly usuarioCreadoPor: string
    /**
     * T-002/D1: puerto de notificaciones para insertar dentro de la misma
     * transacción que las aplicaciones y el outbox. Si se proporciona, las
     * notificaciones se insertan dentro de la transacción del adaptador;
     * si falla, se hace rollback de TODO (atomicidad).
     */
    readonly notificaciones?: NotificacionesEscrituraPort | undefined
    /**
     * T-002/D1: función que genera las notificaciones a partir de los
     * IDs de las aplicaciones creadas. Se ejecuta dentro de la transacción
     * del adaptador después de crear las aplicaciones.
     */
    readonly crearNotificaciones?: (
      aplicacionIds: readonly string[],
    ) => readonly NotificacionNueva[]
  }): Promise<
    | { readonly tipo: "aplicado"; readonly aplicacionIds: readonly string[] }
    | { readonly tipo: "conflicto"; readonly detalle: string }
    | { readonly tipo: "error"; readonly detalle: string }
  >

  anularRegistroGrupal(
    id: string,
    fincaId: string,
    anuladoEn: Date,
    anuladoPor: string,
    motivoAnulacion: string,
  ): Promise<
    | { readonly tipo: "anulado" }
    | { readonly tipo: "no_encontrado" }
    | { readonly tipo: "conflicto"; readonly detalle: string }
    | { readonly tipo: "error"; readonly detalle: string }
  >

  /**
   * Issue #210 (SAN-030, T-002): registra una entrada de almacén append-only.
   * Inserta la fila en `almacen_entradas` Y su fila `sync_outbox` en la MISMA
   * transacción. Devuelve el id de la entrada creada.
   */
  registrarEntradaAlmacen(
    entrada: EntradaAlmacenNueva,
  ): Promise<
    | { readonly tipo: "registrada"; readonly id: string }
    | { readonly tipo: "conflicto"; readonly detalle: string }
    | { readonly tipo: "error"; readonly detalle: string }
  >
}
