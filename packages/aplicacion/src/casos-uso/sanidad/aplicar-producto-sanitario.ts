/**
 * Caso de uso `aplicarProductoSanitario` (Issue #208, RF-SANIDAD v0.2).
 *
 * Evento de dominio AplicarProductoSanitario (§4 arquitectura funcional):
 * un caso de uso por patrón de evento. Igual que el resto de la capa, no sabe
 * si corre en el navegador (réplica SQLite) o en el servidor (Postgres).
 *
 * Flujo:
 * 1. PE-002: revalida el permiso `sanidad:crear` y el scope de finca de cada
 *    recurso (producto y animales) — el gating de UI es cortesía, no seguridad.
 * 2. Reglas de dominio: RN-052 (1..N animales + cabecera grupal), RN-002
 *    (fechas), RN-003 (EN_FINCA a la fecha del evento, captura tardía con
 *    advertencia), RN-050 (producto activo), RN-040 (snapshot de precio),
 *    RN-042 (refuerzo auto-completado), RN-041 (stock calculado; negativo =
 *    alerta de reconciliación, nunca bloqueo).
 * 3. Persistencia vía puertos: cabecera + filas en una transacción (T-002; el
 *    outbox se cablea en #209–#211).
 *
 * Resultado serializable estilo CM-042:
 * aplicado | validacion | permiso_denegado | conflicto | error.
 */

import {
  type ErrorValidacionSanidad,
  construirAplicacionesSanitarias,
  esAlertaReconciliacionStock,
  esFechaIso,
  evaluarAnimalEnFinca,
  planificarRegistroGrupal,
  refuerzosAutoCompletados,
  validarCabeceraRegistroGrupal,
  validarCantidadAnimalesSanidad,
  validarFechaEventoSanidad,
} from "@ganaweb/dominio"
import type { RelojDelSistemaPort } from "../../puertos/reloj-del-sistema-port.js"
import type {
  AnimalEventoSanidadReferencia,
  ProductoSanitarioReferencia,
  RegistroGrupalTratamientoNuevo,
  SanidadEscrituraPort,
  SanidadLecturaPort,
} from "../../puertos/sanidad-port.js"

export type SesionSanidad = {
  readonly usuarioId: string
  readonly fincaActivaId: string
  readonly permisos: readonly { readonly modulo: string; readonly accion: string }[]
}

export type CommandAplicarProductoSanitario = {
  readonly sesion: SesionSanidad
  readonly productoId: string
  readonly dosis: number
  /** ISO YYYY-MM-DD; nunca futura (RN-002). */
  readonly fecha: string
  /** ISO YYYY-MM-DD opcional; única fecha que puede ser futura (RN-002). */
  readonly proximaDosis?: string | null
  readonly animalIds: readonly string[]
  readonly comentarios?: string | null
}

export type AdvertenciaAplicacionSanitaria = {
  readonly tipo: "captura_tardia"
  readonly animalId: string
  readonly detalle: string
}

export type ResultadoAplicarProductoSanitario =
  | {
      readonly tipo: "aplicado"
      readonly aplicacionIds: readonly string[]
      /** RN-052: null cuando N=1; id de la cabecera cuando N>1. */
      readonly registroGrupalId: string | null
      /** RN-040: precio de catálogo congelado al aplicar. */
      readonly precioDosisSnapshot: number | null
      /** RN-042: ids de aplicaciones cuyo refuerzo quedó auto-completado. */
      readonly refuerzosAutoCompletados: readonly string[]
      /** RN-003: capturas tardías aceptadas con advertencia. */
      readonly advertencias: readonly AdvertenciaAplicacionSanitaria[]
      /** RN-041: stock resultante tras descontar dosis × N. */
      readonly stockDisponible: number
      readonly alertaStockNegativo: boolean
    }
  | { readonly tipo: "validacion"; readonly errores: readonly ErrorValidacionSanidad[] }
  | { readonly tipo: "permiso_denegado"; readonly detalle: string }
  | { readonly tipo: "conflicto"; readonly detalle: string }
  | { readonly tipo: "error"; readonly detalle: string }

export type AplicarProductoSanitarioDeps = {
  readonly lectura: SanidadLecturaPort
  readonly escritura: SanidadEscrituraPort
  readonly reloj: RelojDelSistemaPort
}

let secuenciaLocalSanidad = 0

function idSanidad(prefijo: string): string {
  secuenciaLocalSanidad += 1
  return `${prefijo}-${Date.now()}-${secuenciaLocalSanidad}`
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

function claveError(error: ErrorValidacionSanidad): string {
  return `${error.campo}::${error.detalle}`
}

/** Acumula errores deduplicados (varios animales pueden producir el mismo mensaje). */
function agregarError(
  errores: ErrorValidacionSanidad[],
  vistos: Set<string>,
  error: ErrorValidacionSanidad,
): void {
  const clave = claveError(error)
  if (!vistos.has(clave)) {
    vistos.add(clave)
    errores.push(error)
  }
}

function validarAnimalesDeLaCaptura(
  cmd: CommandAplicarProductoSanitario,
  errores: ErrorValidacionSanidad[],
  vistos: Set<string>,
): void {
  const cantidad = validarCantidadAnimalesSanidad(cmd.animalIds.length)
  if (!cantidad.valido) agregarError(errores, vistos, cantidad.error)

  const duplicados = new Set(cmd.animalIds).size !== cmd.animalIds.length
  if (duplicados) {
    agregarError(errores, vistos, {
      campo: "animales",
      detalle: "La captura no puede incluir el mismo animal dos veces.",
    })
  }
}

function validarEntradaBasica(
  cmd: CommandAplicarProductoSanitario,
  hoy: string,
): readonly ErrorValidacionSanidad[] {
  const errores: ErrorValidacionSanidad[] = []
  const vistos = new Set<string>()

  validarAnimalesDeLaCaptura(cmd, errores, vistos)

  if (!Number.isFinite(cmd.dosis) || cmd.dosis <= 0) {
    agregarError(errores, vistos, {
      campo: "dosis",
      detalle: "La dosis debe ser un número mayor que 0.",
    })
  }

  for (const error of validarFechaEventoSanidad({ fecha: cmd.fecha, hoy })) {
    agregarError(errores, vistos, error)
  }

  if (
    cmd.proximaDosis !== null &&
    cmd.proximaDosis !== undefined &&
    !esFechaIso(cmd.proximaDosis)
  ) {
    agregarError(errores, vistos, {
      campo: "proxima_dosis",
      detalle: "La próxima dosis debe tener formato ISO (AAAA-MM-DD).",
    })
  }

  return errores
}

function evaluarAnimalParaEvento(
  animal: AnimalEventoSanidadReferencia,
  cmd: CommandAplicarProductoSanitario,
  hoy: string,
  errores: ErrorValidacionSanidad[],
  vistos: Set<string>,
  advertencias: AdvertenciaAplicacionSanitaria[],
): void {
  for (const error of validarFechaEventoSanidad({
    fecha: cmd.fecha,
    hoy,
    fechaNacimiento: animal.fechaNacimiento,
    fechaCompra: animal.fechaCompra,
  })) {
    agregarError(errores, vistos, {
      campo: error.campo,
      detalle: `Animal ${animal.id}: ${error.detalle}`,
    })
  }

  const enFinca = evaluarAnimalEnFinca({
    fechaEvento: cmd.fecha,
    estadoActual: animal.estadoActual,
    fechaSalida: animal.fechaSalida,
  })
  if (!enFinca.valido) {
    agregarError(errores, vistos, {
      campo: enFinca.error.campo,
      detalle: `Animal ${animal.id}: ${enFinca.error.detalle}`,
    })
    return
  }
  if (enFinca.capturaTardia) {
    advertencias.push({
      tipo: "captura_tardia",
      animalId: animal.id,
      detalle: `Animal ${animal.id}: el registro es tardío; el animal ya no está en la finca, pero lo estaba en la fecha del evento (RN-003).`,
    })
  }
}

/**
 * PE-002 + RN-050: revalida el producto contra la finca activa y su
 * disponibilidad en captura. Devuelve el producto o el resultado final.
 */
async function revalidarProducto(
  deps: AplicarProductoSanitarioDeps,
  cmd: CommandAplicarProductoSanitario,
): Promise<
  | { readonly ok: true; readonly producto: ProductoSanitarioReferencia }
  | { readonly ok: false; readonly resultado: ResultadoAplicarProductoSanitario }
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
        detalle: "El producto no pertenece a la finca activa (PE-002).",
      },
    }
  }
  if (!producto.activo) {
    return {
      ok: false,
      resultado: {
        tipo: "validacion",
        errores: [
          {
            campo: "producto",
            detalle: "El producto está inactivo y no puede aplicarse (RN-050).",
          },
        ],
      },
    }
  }
  return { ok: true, producto }
}

/**
 * PE-002 + RN-002/RN-003: revalida cada animal contra la finca activa y
 * evalúa el evento a la fecha del evento. Devuelve advertencias o el
 * resultado final.
 */
async function revalidarAnimales(
  deps: AplicarProductoSanitarioDeps,
  cmd: CommandAplicarProductoSanitario,
  hoy: string,
): Promise<
  | { readonly ok: true; readonly advertencias: readonly AdvertenciaAplicacionSanitaria[] }
  | { readonly ok: false; readonly resultado: ResultadoAplicarProductoSanitario }
> {
  const animales = await deps.lectura.obtenerAnimales(cmd.animalIds)
  const animalesPorId = new Map(animales.map((animal) => [animal.id, animal]))

  const errores: ErrorValidacionSanidad[] = []
  const vistos = new Set<string>()
  const advertencias: AdvertenciaAplicacionSanitaria[] = []

  for (const animalId of cmd.animalIds) {
    const animal = animalesPorId.get(animalId)
    if (animal === undefined) {
      agregarError(errores, vistos, {
        campo: "animales",
        detalle: `El animal ${animalId} no existe.`,
      })
      continue
    }
    if (animal.fincaId !== cmd.sesion.fincaActivaId) {
      return {
        ok: false,
        resultado: {
          tipo: "permiso_denegado",
          detalle: "Hay animales fuera de la finca activa (PE-002).",
        },
      }
    }
    evaluarAnimalParaEvento(animal, cmd, hoy, errores, vistos, advertencias)
  }
  if (errores.length > 0) return { ok: false, resultado: { tipo: "validacion", errores } }
  return { ok: true, advertencias }
}

/**
 * RN-040/RN-052: construye la cabecera grupal (si N>1) y las filas de
 * aplicación con snapshot de precio.
 */
function prepararEscritura(
  cmd: CommandAplicarProductoSanitario,
  producto: ProductoSanitarioReferencia,
  ahora: Date,
): {
  readonly registroGrupal: RegistroGrupalTratamientoNuevo | null
  readonly aplicaciones: ReturnType<typeof construirAplicacionesSanitarias>
  readonly totalAnimales: number
} {
  const plan = planificarRegistroGrupal(cmd.animalIds.length)
  const registroGrupal: RegistroGrupalTratamientoNuevo | null = plan.requiereCabecera
    ? {
        id: idSanidad("rg-sanidad"),
        fincaId: cmd.sesion.fincaActivaId,
        tipoEvento: plan.tipoEvento,
        totalAnimales: plan.totalAnimales,
        fecha: ahora,
        usuarioCreadoPor: cmd.sesion.usuarioId,
        descripcion: cmd.comentarios ?? null,
      }
    : null
  const aplicaciones = construirAplicacionesSanitarias({
    producto: { id: producto.id, precioDosis: producto.precioDosis },
    animalIds: [...cmd.animalIds],
    fecha: cmd.fecha,
    dosis: cmd.dosis,
    proximaDosis: cmd.proximaDosis ?? null,
    comentarios: cmd.comentarios ?? null,
    registroGrupalId: registroGrupal?.id ?? null,
  })
  return { registroGrupal, aplicaciones, totalAnimales: plan.totalAnimales }
}

/**
 * Aplica un producto sanitario a 1..N animales (evento
 * AplicarProductoSanitario). Ver el header del archivo para el flujo y las
 * reglas citadas.
 */
export function aplicarProductoSanitario(deps: AplicarProductoSanitarioDeps) {
  return async (
    cmd: CommandAplicarProductoSanitario,
  ): Promise<ResultadoAplicarProductoSanitario> => {
    if (!tienePermisoSanidad(cmd.sesion, "crear")) {
      return { tipo: "permiso_denegado", detalle: "Requiere el permiso sanidad:crear (PE-002)." }
    }

    const ahora = deps.reloj.ahora()
    const hoy = fechaIsoDe(ahora)
    const erroresEntrada = validarEntradaBasica(cmd, hoy)
    if (erroresEntrada.length > 0) return { tipo: "validacion", errores: erroresEntrada }

    const pasoProducto = await revalidarProducto(deps, cmd)
    if (!pasoProducto.ok) return pasoProducto.resultado

    const pasoAnimales = await revalidarAnimales(deps, cmd, hoy)
    if (!pasoAnimales.ok) return pasoAnimales.resultado

    const previas = await deps.lectura.listarAplicacionesPrevias(cmd.productoId, cmd.animalIds)
    const refuerzos = refuerzosAutoCompletados(previas, cmd.fecha)

    const stockActual = await deps.lectura.obtenerStockDisponible(cmd.productoId)
    const stockDisponible = stockActual - cmd.dosis * cmd.animalIds.length

    const escritura = prepararEscritura(cmd, pasoProducto.producto, ahora)
    const cabecera = validarCabeceraRegistroGrupal({
      totalAnimales: escritura.totalAnimales,
      filasHijas: escritura.aplicaciones.length,
    })
    if (!cabecera.valido) return { tipo: "error", detalle: cabecera.error.detalle }

    const escrito = await deps.escritura.registrarAplicaciones({
      fincaId: cmd.sesion.fincaActivaId,
      registroGrupal: escritura.registroGrupal,
      aplicaciones: escritura.aplicaciones,
      usuarioCreadoPor: cmd.sesion.usuarioId,
    })
    if (escrito.tipo === "conflicto") return { tipo: "conflicto", detalle: escrito.detalle }
    if (escrito.tipo === "error") return { tipo: "error", detalle: escrito.detalle }

    return {
      tipo: "aplicado",
      aplicacionIds: escrito.aplicacionIds,
      registroGrupalId: escritura.registroGrupal?.id ?? null,
      precioDosisSnapshot: pasoProducto.producto.precioDosis,
      refuerzosAutoCompletados: refuerzos,
      advertencias: pasoAnimales.advertencias,
      stockDisponible,
      alertaStockNegativo: esAlertaReconciliacionStock(stockDisponible),
    }
  }
}
