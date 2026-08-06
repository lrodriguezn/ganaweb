/**
 * Caso de uso `registrarEntradaAlmacen` (Issue #210, RF-SANIDAD v0.2 §7/§11).
 *
 * Evento de dominio RegistrarEntradaAlmacen: un caso de uso por patrón de
 * evento. Registra una entrada de stock append-only (SAN-030) y revalida el
 * permiso `sanidad:crear` (PE-002) y el scope de finca del producto
 * (SAN-063) antes de escribir. La inserción de la entrada + su fila
 * `sync_outbox` ocurre en la MISMA transacción (T-002), responsabilidad del
 * puerto de escritura.
 *
 * Reglas citadas:
 * - SAN-030: entrada de stock (producto, fecha nunca futura RN-002, dosis
 *   entero > 0, precio_por_dosis opcional, comentario).
 * - SAN-032/D-008: append-only en v1 — sin edición ni anulación; el stock se
 *   corrige registrando nuevas entradas.
 * - SAN-063: el `fincaId` jamás se confía de la URL; el caso de uso revalida
 *   que el producto pertenezca a la finca activa. `almacen_entradas` no tiene
 *   `finca_id`, así que el scope sale del join con `productos_sanitarios`.
 * - RN-041/SAN-031: el stock del resultado sale SIEMPRE de la vista
 *   `inventario_sanitario`; negativo = alerta de reconciliación, no error.
 * - PE-006: todo insert lleva `usuario_creado_por`.
 *
 * Resultado serializable estilo CM-042:
 * registrada | validacion | permiso_denegado | conflicto | error.
 *
 * Nombres en español (T-003).
 */

import {
  type ErrorValidacionSanidad,
  esAlertaReconciliacionStock,
  validarEntradaAlmacen,
} from "@ganaweb/dominio"
import type { RelojDelSistemaPort } from "../../puertos/reloj-del-sistema-port.js"
import type { SanidadEscrituraPort, SanidadLecturaPort } from "../../puertos/sanidad-port.js"
import type { SesionSanidad } from "./aplicar-producto-sanitario.js"

export type CommandRegistrarEntradaAlmacen = {
  readonly sesion: SesionSanidad
  readonly productoId: string
  /** ISO YYYY-MM-DD; nunca futura (RN-002). */
  readonly fecha: string
  /** Entero > 0 (SAN-030). */
  readonly dosis: number
  readonly precioPorDosis?: number | null
  readonly comentario?: string | null
}

export type ResultadoRegistrarEntradaAlmacen =
  | {
      readonly tipo: "registrada"
      readonly entradaId: string
      /** RN-041: stock de la vista `inventario_sanitario` tras la entrada. */
      readonly stockDisponible: number
      /** SAN-031: negativo = alerta de reconciliación, no error. */
      readonly alertaStockNegativo: boolean
    }
  | { readonly tipo: "validacion"; readonly errores: readonly ErrorValidacionSanidad[] }
  | { readonly tipo: "permiso_denegado"; readonly detalle: string }
  | { readonly tipo: "conflicto"; readonly detalle: string }
  | { readonly tipo: "error"; readonly detalle: string }

export type RegistrarEntradaAlmacenDeps = {
  readonly lectura: SanidadLecturaPort
  readonly escritura: SanidadEscrituraPort
  readonly reloj: RelojDelSistemaPort
}

function fechaIsoDe(date: Date): string {
  const anio = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, "0")
  const dia = String(date.getDate()).padStart(2, "0")
  return `${anio}-${mes}-${dia}`
}

function tienePermisoSanidad(sesion: SesionSanidad, accion: string): boolean {
  return sesion.permisos.some(
    (permiso) => permiso.modulo === "sanidad" && permiso.accion === accion,
  )
}

/**
 * SAN-063 + PE-002: revalida el producto contra la finca activa. Devuelve el
 * producto o el resultado final que corta el flujo.
 */
async function revalidarProductoAlmacen(
  deps: RegistrarEntradaAlmacenDeps,
  cmd: CommandRegistrarEntradaAlmacen,
): Promise<
  | { readonly ok: true }
  | { readonly ok: false; readonly resultado: ResultadoRegistrarEntradaAlmacen }
> {
  const producto = await deps.lectura.obtenerProducto(cmd.productoId)
  if (producto === null) {
    return {
      ok: false,
      resultado: {
        tipo: "validacion",
        errores: [{ campo: "producto", detalle: "El producto sanitario no existe." }],
      },
    }
  }
  if (producto.fincaId !== cmd.sesion.fincaActivaId) {
    return {
      ok: false,
      resultado: {
        tipo: "permiso_denegado",
        detalle: "El producto no pertenece a la finca activa (SAN-063).",
      },
    }
  }
  return { ok: true }
}

/**
 * Registra una entrada de almacén append-only (evento
 * RegistrarEntradaAlmacen). Ver el header del archivo para el flujo y las
 * reglas citadas.
 */
export function registrarEntradaAlmacen(deps: RegistrarEntradaAlmacenDeps) {
  return async (cmd: CommandRegistrarEntradaAlmacen): Promise<ResultadoRegistrarEntradaAlmacen> => {
    if (!tienePermisoSanidad(cmd.sesion, "crear")) {
      return { tipo: "permiso_denegado", detalle: "Requiere el permiso sanidad:crear (PE-002)." }
    }

    const hoy = fechaIsoDe(deps.reloj.ahora())
    const errores = validarEntradaAlmacen({
      captura: {
        productoId: cmd.productoId,
        fecha: cmd.fecha,
        dosis: cmd.dosis,
        precioPorDosis: cmd.precioPorDosis ?? null,
        comentario: cmd.comentario ?? null,
      },
      hoy,
    })
    if (errores.length > 0) return { tipo: "validacion", errores }

    const pasoProducto = await revalidarProductoAlmacen(deps, cmd)
    if (!pasoProducto.ok) return pasoProducto.resultado

    const escrito = await deps.escritura.registrarEntradaAlmacen({
      fincaId: cmd.sesion.fincaActivaId,
      productoId: cmd.productoId,
      fecha: cmd.fecha,
      dosis: cmd.dosis,
      precioPorDosis: cmd.precioPorDosis ?? null,
      comentario: cmd.comentario ?? null,
      usuarioCreadoPor: cmd.sesion.usuarioId,
    })
    if (escrito.tipo === "conflicto") return { tipo: "conflicto", detalle: escrito.detalle }
    if (escrito.tipo === "error") return { tipo: "error", detalle: escrito.detalle }

    // RN-041: el stock se lee de la vista, ya con la entrada sumada.
    const stockDisponible = await deps.lectura.obtenerStockDisponible(cmd.productoId)

    return {
      tipo: "registrada",
      entradaId: escrito.id,
      stockDisponible,
      alertaStockNegativo: esAlertaReconciliacionStock(stockDisponible),
    }
  }
}
