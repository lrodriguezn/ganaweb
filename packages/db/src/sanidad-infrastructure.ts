/**
 * Adaptador Drizzle (PostgreSQL) de los puertos de Sanidad (Issue #208,
 * RF-SANIDAD v0.2).
 *
 * Implementa `SanidadLecturaPort` y `SanidadEscrituraPort`
 * (`@ganaweb/aplicacion`, type-only — regla `db-to-aplicacion-runtime`).
 *
 * Reglas materializadas aquí:
 * - RN-041/KPI-10: `obtenerStockDisponible` lee la vista
 *   `inventario_sanitario` (migración 0007) — el stock NUNCA es un campo
 *   mutable.
 * - RN-051: las lecturas de aplicaciones previas y la vista excluyen filas de
 *   grupos anulados; `anularRegistroGrupal` marca `anulado_en` en la cabecera
 *   y actualiza las filas hijas en UNA transacción (las hijas no tienen
 *   columna de anulación en el esquema v3: su anulación lógica se deriva de la
 *   cabecera vía `registro_grupal_id`; se refresca `updated_at` para que el
 *   pull incremental por cursor las re-sincronice).
 * - RN-052: `registrarAplicaciones` delega en `persistirEventosInternos`
 *   (Issue #244): la cabecera `registros_grupales` + las filas hijas
 *   `aplicaciones_sanitarias` se escriben en una sola transacción a través
 *   del contrato canónico (T-002: append-only; atomicidad por contrato).
 *   La emisión del outbox para estos eventos queda en manos del contrato
 *   (gap documentado; ver `evento-write-internal.ts`).
 * - PE-002: las lecturas NO filtran por finca; el caso de uso revalida el
 *   scope comparando `fincaId` (patrón CM-024).
 * - Issue #210 (SAN-030, T-002): `registrarEntradaAlmacen` inserta la entrada
 *   de almacén y su fila `sync_outbox` en la MISMA transacción; append-only
 *   (SAN-032/D-008). `listarEntradasAlmacen` acota por finca vía el join con
 *   `productos_sanitarios` (SAN-063: la tabla no tiene `finca_id`).
 *
 * Driver único PostgreSQL (online-first, D3). El contrato queda listo para el
 * driver de la réplica local offline cuando llegue el MVP de sync.
 */

import type {
  AnimalEventoSanidadReferencia,
  AnimalSanidadListado,
  AplicacionPreviaSanidad,
  AplicacionSanitariaNueva,
  EntradaAlmacenListada,
  EntradaAlmacenNueva,
  ProductoSanitarioReferencia,
  RegistroGrupalTratamientoNuevo,
  SanidadEscrituraPort,
  SanidadLecturaPort,
} from "@ganaweb/aplicacion"
import { EventoForbiddenError, evaluarAnimalEnFinca } from "@ganaweb/dominio"
import type { EventoWriteCommand } from "@ganaweb/dominio"
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm"
import type { DbClient } from "./client.js"
import { persistirEventosInternos } from "./evento-write-internal.js"
import {
  almacenEntradas,
  animales,
  aplicacionesSanitarias,
  inventarioSanitario,
  muertes,
  productosSanitarios,
  registrosGrupales,
  syncOutbox,
  ventas,
} from "./schema/index.js"

/** `animales.fecha_nacimiento`/`fecha_compra` son epoch segundos (UTC). */
function epochSegundosAFechaIso(epochSegundos: number): string {
  return new Date(epochSegundos * 1000).toISOString().slice(0, 10)
}

function aNumero(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null
  return Number(valor)
}

/** Error de FK (postgres.js envuelve el PostgresError en `cause`). */
function esViolacionForeignKey(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  if ((error as { code?: string }).code === "23503") return true
  return esViolacionForeignKey((error as { cause?: unknown }).cause)
}

type FilaAnimalEvento = {
  id: string
  fincaId: string
  estadoAnimalKey: number | null
  fechaNacimiento: number | null
  fechaCompra: number | null
}

/**
 * Mapea una fila de `animales` + fechas de venta/muerte a la referencia del
 * caso de uso. estado_animal_key: 0 En finca · 1 Vendido · 2 Muerto
 * (config_key_values).
 */
function mapearAnimalEvento(
  fila: FilaAnimalEvento,
  ventaPorAnimal: ReadonlyMap<string, string>,
  muertePorAnimal: ReadonlyMap<string, string>,
): AnimalEventoSanidadReferencia {
  const estadoActual =
    fila.estadoAnimalKey === 1 ? "vendido" : fila.estadoAnimalKey === 2 ? "muerto" : "en_finca"
  const fechaSalida =
    estadoActual === "vendido"
      ? (ventaPorAnimal.get(fila.id) ?? null)
      : estadoActual === "muerto"
        ? (muertePorAnimal.get(fila.id) ?? ventaPorAnimal.get(fila.id) ?? null)
        : null
  return {
    id: fila.id,
    fincaId: fila.fincaId,
    estadoActual,
    fechaNacimiento:
      fila.fechaNacimiento === null ? null : epochSegundosAFechaIso(fila.fechaNacimiento),
    fechaCompra: fila.fechaCompra === null ? null : epochSegundosAFechaIso(fila.fechaCompra),
    fechaSalida,
  }
}

export class DrizzleSanidadAdapter implements SanidadLecturaPort, SanidadEscrituraPort {
  constructor(private readonly db: DbClient) {}

  async obtenerProducto(id: string): Promise<ProductoSanitarioReferencia | null> {
    const filas = await this.db
      .select({
        id: productosSanitarios.id,
        fincaId: productosSanitarios.fincaId,
        codigo: productosSanitarios.codigo,
        descripcion: productosSanitarios.descripcion,
        tipoTratamiento: productosSanitarios.tipoTratamiento,
        precioDosis: productosSanitarios.precioDosis,
        mlMgPorDosis: productosSanitarios.mlMgPorDosis,
        activo: productosSanitarios.activo,
      })
      .from(productosSanitarios)
      .where(eq(productosSanitarios.id, id))
      .limit(1)
    const fila = filas[0]
    if (!fila) return null
    return {
      id: fila.id,
      fincaId: fila.fincaId,
      codigo: fila.codigo,
      descripcion: fila.descripcion,
      tipoTratamiento: fila.tipoTratamiento,
      precioDosis: aNumero(fila.precioDosis),
      mlMgPorDosis: aNumero(fila.mlMgPorDosis),
      activo: fila.activo === 1,
    }
  }

  /**
   * RN-003: fechas de salida (venta/muerte) por animal. Consultas agrupadas
   * separadas, portables a SQLite (D3). Compartida por `obtenerAnimales` y
   * `listarAnimalesEnFinca` (Issue #211).
   */
  private async fechasSalidaPorAnimal(ids: readonly string[]): Promise<{
    readonly ventaPorAnimal: ReadonlyMap<string, string>
    readonly muertePorAnimal: ReadonlyMap<string, string>
  }> {
    if (ids.length === 0) return { ventaPorAnimal: new Map(), muertePorAnimal: new Map() }
    const fechasVenta = await this.db
      .select({ animalId: ventas.animalId, fechaSalida: sql<string>`MAX(${ventas.fecha})` })
      .from(ventas)
      .where(inArray(ventas.animalId, ids))
      .groupBy(ventas.animalId)
    const fechasMuerte = await this.db
      .select({ animalId: muertes.animalId, fechaSalida: sql<string>`MAX(${muertes.fecha})` })
      .from(muertes)
      .where(inArray(muertes.animalId, ids))
      .groupBy(muertes.animalId)
    return {
      ventaPorAnimal: new Map(fechasVenta.map((fila) => [fila.animalId, fila.fechaSalida])),
      muertePorAnimal: new Map(fechasMuerte.map((fila) => [fila.animalId, fila.fechaSalida])),
    }
  }

  async obtenerAnimales(ids: readonly string[]): Promise<readonly AnimalEventoSanidadReferencia[]> {
    if (ids.length === 0) return []
    const filasAnimales = await this.db
      .select({
        id: animales.id,
        fincaId: animales.fincaId,
        estadoAnimalKey: animales.estadoAnimalKey,
        fechaNacimiento: animales.fechaNacimiento,
        fechaCompra: animales.fechaCompra,
      })
      .from(animales)
      .where(inArray(animales.id, [...ids]))

    const idsEncontrados = filasAnimales.map((fila) => fila.id)
    const { ventaPorAnimal, muertePorAnimal } = await this.fechasSalidaPorAnimal(idsEncontrados)

    return filasAnimales.map((fila) => mapearAnimalEvento(fila, ventaPorAnimal, muertePorAnimal))
  }

  /**
   * Issue #211 (SAN-043/RN-003): animales de la finca EN_FINCA a `fecha`.
   * Reutiliza el mapeo de estado/fechas de `obtenerAnimales` y la regla de
   * dominio `evaluarAnimalEnFinca`: un vendido/muerto con salida posterior a
   * `fecha` seguía en la finca ese día (captura tardía). Orden por código
   * para una selección estable en el drawer. SQL portable a SQLite (D3).
   */
  async listarAnimalesEnFinca(
    fincaId: string,
    fecha: string,
  ): Promise<readonly AnimalSanidadListado[]> {
    const filasAnimales = await this.db
      .select({
        id: animales.id,
        fincaId: animales.fincaId,
        codigo: animales.codigo,
        nombre: animales.nombre,
        estadoAnimalKey: animales.estadoAnimalKey,
        fechaNacimiento: animales.fechaNacimiento,
        fechaCompra: animales.fechaCompra,
      })
      .from(animales)
      .where(eq(animales.fincaId, fincaId))
      .orderBy(animales.codigo)
    if (filasAnimales.length === 0) return []

    const idsEncontrados = filasAnimales.map((fila) => fila.id)
    const { ventaPorAnimal, muertePorAnimal } = await this.fechasSalidaPorAnimal(idsEncontrados)

    const enFinca: AnimalSanidadListado[] = []
    for (const fila of filasAnimales) {
      const referencia = mapearAnimalEvento(fila, ventaPorAnimal, muertePorAnimal)
      const evaluacion = evaluarAnimalEnFinca({
        fechaEvento: fecha,
        estadoActual: referencia.estadoActual,
        fechaSalida: referencia.fechaSalida,
      })
      if (evaluacion.valido) {
        enFinca.push({ id: fila.id, codigo: fila.codigo, nombre: fila.nombre ?? "" })
      }
    }
    return enFinca
  }

  async listarAplicacionesPrevias(
    productoId: string,
    animalIds: readonly string[],
  ): Promise<readonly AplicacionPreviaSanidad[]> {
    if (animalIds.length === 0) return []
    const filas = await this.db
      .select({
        id: aplicacionesSanitarias.id,
        animalId: aplicacionesSanitarias.animalId,
        fecha: aplicacionesSanitarias.fecha,
        proximaDosis: aplicacionesSanitarias.proximaDosis,
      })
      .from(aplicacionesSanitarias)
      .leftJoin(
        registrosGrupales,
        eq(aplicacionesSanitarias.registroGrupalId, registrosGrupales.id),
      )
      .where(
        and(
          eq(aplicacionesSanitarias.productoId, productoId),
          inArray(aplicacionesSanitarias.animalId, [...animalIds]),
          // RN-051: las filas de grupos anulados no cuentan para refuerzos.
          or(isNull(aplicacionesSanitarias.registroGrupalId), isNull(registrosGrupales.anuladoEn)),
        ),
      )
    return filas.map((fila) => ({
      id: fila.id,
      animalId: fila.animalId,
      fecha: fila.fecha,
      proximaDosis: fila.proximaDosis,
    }))
  }

  async obtenerStockDisponible(productoId: string): Promise<number> {
    const filas = await this.db
      .select({ dosisDisponibles: inventarioSanitario.dosisDisponibles })
      .from(inventarioSanitario)
      .where(eq(inventarioSanitario.productoId, productoId))
      .limit(1)
    const fila = filas[0]
    return fila ? Number(fila.dosisDisponibles ?? 0) : 0
  }

  /**
   * Issue #210 (SAN-014/SAN-063): entradas de almacén de la finca con los
   * datos del producto. `almacen_entradas` no tiene `finca_id`: el scope sale
   * del inner join con `productos_sanitarios`. Orden: fecha descendente
   * (lo más reciente primero), `created_at` como desempate.
   */
  async listarEntradasAlmacen(fincaId: string): Promise<readonly EntradaAlmacenListada[]> {
    const filas = await this.db
      .select({
        id: almacenEntradas.id,
        productoId: almacenEntradas.productoId,
        fecha: almacenEntradas.fecha,
        dosis: almacenEntradas.dosis,
        precioPorDosis: almacenEntradas.precioPorDosis,
        comentario: almacenEntradas.comentario,
        productoCodigo: productosSanitarios.codigo,
        productoDescripcion: productosSanitarios.descripcion,
      })
      .from(almacenEntradas)
      .innerJoin(productosSanitarios, eq(almacenEntradas.productoId, productosSanitarios.id))
      .where(eq(productosSanitarios.fincaId, fincaId))
      .orderBy(desc(almacenEntradas.fecha), desc(almacenEntradas.createdAt))
    return filas.map((fila) => ({
      id: fila.id,
      productoId: fila.productoId,
      fecha: fila.fecha,
      dosis: fila.dosis,
      precioPorDosis: aNumero(fila.precioPorDosis),
      comentario: fila.comentario,
      productoCodigo: fila.productoCodigo,
      productoDescripcion: fila.productoDescripcion,
    }))
  }

  async registrarAplicaciones(entrada: {
    readonly fincaId: string
    readonly registroGrupal: RegistroGrupalTratamientoNuevo | null
    readonly aplicaciones: readonly AplicacionSanitariaNueva[]
    readonly usuarioCreadoPor: string
  }): Promise<
    | { readonly tipo: "aplicado"; readonly aplicacionIds: readonly string[] }
    | { readonly tipo: "conflicto"; readonly detalle: string }
    | { readonly tipo: "error"; readonly detalle: string }
  > {
    try {
      const aplicacionIds = entrada.aplicaciones.map(() => crypto.randomUUID())
      const commands: EventoWriteCommand[] = []
      if (entrada.registroGrupal) {
        commands.push({
          tipo: "crear_registro_grupal",
          evento: "aplicacion_sanitaria",
          id: entrada.registroGrupal.id,
          fincaId: entrada.fincaId,
          usuarioId: entrada.usuarioCreadoPor,
          totalAnimales: entrada.registroGrupal.totalAnimales,
          criterio: { origen: "manual" },
          fecha: entrada.registroGrupal.fecha,
          descripcion: entrada.registroGrupal.descripcion,
        })
      }
      entrada.aplicaciones.forEach((aplicacion, index) => {
        const common = {
          evento: "aplicacion_sanitaria" as const,
          id: aplicacionIds[index] as string,
          fincaId: entrada.fincaId,
          usuarioId: entrada.usuarioCreadoPor,
          animalId: aplicacion.animalId,
          datos: {
            productoId: aplicacion.productoId,
            fecha: aplicacion.fecha,
            dosis: aplicacion.dosis,
            precioDosis: aplicacion.precioDosis,
            proximaDosis: aplicacion.proximaDosis,
            comentarios: aplicacion.comentarios,
          },
        }
        commands.push(
          aplicacion.registroGrupalId
            ? {
                ...common,
                tipo: "crear_hijo_grupal",
                registroGrupalId: aplicacion.registroGrupalId,
              }
            : { ...common, tipo: "crear_evento_individual" },
        )
      })
      await persistirEventosInternos(this.db, commands, {
        fuente: "sanidad_validada",
        fincaId: entrada.fincaId,
        usuarioId: entrada.usuarioCreadoPor,
      })
      return { tipo: "aplicado", aplicacionIds }
    } catch (error) {
      if (error instanceof EventoForbiddenError || esViolacionForeignKey(error)) {
        return { tipo: "conflicto", detalle: "La aplicación referencia un registro inexistente." }
      }
      return { tipo: "error", detalle: "No se pudo registrar la aplicación sanitaria." }
    }
  }

  /**
   * Gap heredado (Issue #211, tarea 1.3): la anulación NO emite filas
   * `sync_outbox` (UPDATE de cabecera + hijas). El tratamiento de la
   * anulación en el transporte de sync queda pendiente para el MVP de sync
   * (RN-060); acá sólo se documenta, no se amplía alcance.
   */
  async anularRegistroGrupal(
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
  > {
    const filas = await this.db
      .select({
        id: registrosGrupales.id,
        fincaId: registrosGrupales.fincaId,
        anuladoEn: registrosGrupales.anuladoEn,
      })
      .from(registrosGrupales)
      .where(eq(registrosGrupales.id, id))
      .limit(1)
    const registro = filas[0]
    // Scope (PE-002): un registro de otra finca se reporta como inexistente.
    if (!registro || registro.fincaId !== fincaId) return { tipo: "no_encontrado" }
    if (registro.anuladoEn !== null) {
      return { tipo: "conflicto", detalle: "El registro grupal ya está anulado (RN-051)." }
    }

    try {
      await this.db.transaction(async (tx) => {
        await tx
          .update(registrosGrupales)
          .set({ anuladoEn, anuladoPor, motivoAnulacion, updatedAt: anuladoEn })
          .where(eq(registrosGrupales.id, id))
        // RN-051: anulación lógica de TODAS las filas hijas en la misma
        // transacción — derivada de la cabecera (las hijas no tienen columna
        // de anulación en el esquema v3); updated_at refresca el cursor de pull.
        await tx
          .update(aplicacionesSanitarias)
          .set({ updatedAt: anuladoEn })
          .where(eq(aplicacionesSanitarias.registroGrupalId, id))
      })
      return { tipo: "anulado" }
    } catch {
      return { tipo: "error", detalle: "No se pudo anular el registro grupal." }
    }
  }

  /**
   * Issue #210 (SAN-030, T-002): entrada de almacén append-only. Inserta la
   * fila en `almacen_entradas` Y su fila `sync_outbox` en la MISMA
   * transacción: si alguna falla (p. ej. FK de producto inexistente) no queda
   * escrita ninguna de las dos. El payload del outbox replica la fila en
   * camelCase (convención de `outboxBase` en los casos de uso de animales).
   */
  async registrarEntradaAlmacen(
    entrada: EntradaAlmacenNueva,
  ): Promise<
    | { readonly tipo: "registrada"; readonly id: string }
    | { readonly tipo: "conflicto"; readonly detalle: string }
    | { readonly tipo: "error"; readonly detalle: string }
  > {
    try {
      const ahora = new Date()
      const entradaId = await this.db.transaction(async (tx) => {
        const filas = await tx
          .insert(almacenEntradas)
          .values({
            id: crypto.randomUUID(),
            productoId: entrada.productoId,
            fecha: entrada.fecha,
            dosis: entrada.dosis,
            precioPorDosis: entrada.precioPorDosis === null ? null : String(entrada.precioPorDosis),
            comentario: entrada.comentario,
            usuarioCreadoPor: entrada.usuarioCreadoPor,
          })
          .returning({ id: almacenEntradas.id })
        const id = filas[0]?.id
        if (id === undefined) {
          throw new Error("La inserción de la entrada de almacén no devolvió id.")
        }
        // T-002: la fila sync_outbox dentro de la misma transacción.
        await tx.insert(syncOutbox).values({
          id: crypto.randomUUID(),
          fincaId: entrada.fincaId,
          dispositivoId: "server",
          tablaDestino: "almacen_entradas",
          operacion: "INSERT",
          payload: {
            id,
            productoId: entrada.productoId,
            fecha: entrada.fecha,
            dosis: entrada.dosis,
            precioPorDosis: entrada.precioPorDosis,
            comentario: entrada.comentario,
            usuarioCreadoPor: entrada.usuarioCreadoPor,
          },
          createdAt: ahora,
          updatedAt: ahora,
        })
        return id
      })
      return { tipo: "registrada", id: entradaId }
    } catch (error) {
      if (esViolacionForeignKey(error)) {
        return { tipo: "conflicto", detalle: "La entrada referencia un producto inexistente." }
      }
      return { tipo: "error", detalle: "No se pudo registrar la entrada de almacén." }
    }
  }
}
