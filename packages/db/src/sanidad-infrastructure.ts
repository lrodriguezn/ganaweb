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
 * - RN-052: `registrarAplicaciones` escribe cabecera + filas hijas en una
 *   transacción (T-002: append-only; el outbox se cablea en #209–#211).
 * - PE-002: las lecturas NO filtran por finca; el caso de uso revalida el
 *   scope comparando `fincaId` (patrón CM-024).
 *
 * Driver único PostgreSQL (online-first, D3). El contrato queda listo para el
 * driver de la réplica local offline cuando llegue el MVP de sync.
 */

import type {
  AnimalEventoSanidadReferencia,
  AplicacionPreviaSanidad,
  AplicacionSanitariaNueva,
  ProductoSanitarioReferencia,
  RegistroGrupalTratamientoNuevo,
  SanidadEscrituraPort,
  SanidadLecturaPort,
} from "@ganaweb/aplicacion"
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm"
import type { DbClient } from "./client.js"
import {
  animales,
  aplicacionesSanitarias,
  inventarioSanitario,
  muertes,
  productosSanitarios,
  registrosGrupales,
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
  const causa = (error as { cause?: { code?: string } }).cause
  return causa?.code === "23503"
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

    // RN-003: la fecha de salida (venta/muerte) permite evaluar el estado a la
    // fecha del evento. Consultas agrupadas separadas (portables a SQLite).
    const idsEncontrados = filasAnimales.map((fila) => fila.id)
    const fechasVenta = await this.db
      .select({ animalId: ventas.animalId, fechaSalida: sql<string>`MAX(${ventas.fecha})` })
      .from(ventas)
      .where(inArray(ventas.animalId, idsEncontrados))
      .groupBy(ventas.animalId)
    const fechasMuerte = await this.db
      .select({ animalId: muertes.animalId, fechaSalida: sql<string>`MAX(${muertes.fecha})` })
      .from(muertes)
      .where(inArray(muertes.animalId, idsEncontrados))
      .groupBy(muertes.animalId)
    const ventaPorAnimal = new Map(fechasVenta.map((fila) => [fila.animalId, fila.fechaSalida]))
    const muertePorAnimal = new Map(fechasMuerte.map((fila) => [fila.animalId, fila.fechaSalida]))

    return filasAnimales.map((fila) => mapearAnimalEvento(fila, ventaPorAnimal, muertePorAnimal))
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

  async registrarAplicaciones(entrada: {
    readonly registroGrupal: RegistroGrupalTratamientoNuevo | null
    readonly aplicaciones: readonly AplicacionSanitariaNueva[]
    readonly usuarioCreadoPor: string
  }): Promise<
    | { readonly tipo: "aplicado"; readonly aplicacionIds: readonly string[] }
    | { readonly tipo: "conflicto"; readonly detalle: string }
    | { readonly tipo: "error"; readonly detalle: string }
  > {
    try {
      const aplicacionIds = await this.db.transaction(async (tx) => {
        if (entrada.registroGrupal !== null) {
          const cabecera = entrada.registroGrupal
          await tx.insert(registrosGrupales).values({
            id: cabecera.id,
            fincaId: cabecera.fincaId,
            tipoEvento: cabecera.tipoEvento,
            totalAnimales: cabecera.totalAnimales,
            fecha: cabecera.fecha,
            usuarioCreadoPor: cabecera.usuarioCreadoPor,
            descripcion: cabecera.descripcion,
          })
        }
        const filas = await tx
          .insert(aplicacionesSanitarias)
          .values(
            entrada.aplicaciones.map((aplicacion) => ({
              id: crypto.randomUUID(),
              animalId: aplicacion.animalId,
              registroGrupalId: aplicacion.registroGrupalId,
              productoId: aplicacion.productoId,
              fecha: aplicacion.fecha,
              dosis: String(aplicacion.dosis),
              precioDosis: aplicacion.precioDosis === null ? null : String(aplicacion.precioDosis),
              proximaDosis: aplicacion.proximaDosis,
              comentarios: aplicacion.comentarios,
              usuarioCreadoPor: entrada.usuarioCreadoPor,
            })),
          )
          .returning({ id: aplicacionesSanitarias.id })
        return filas.map((fila) => fila.id)
      })
      return { tipo: "aplicado", aplicacionIds }
    } catch (error) {
      if (esViolacionForeignKey(error)) {
        return { tipo: "conflicto", detalle: "La aplicación referencia un registro inexistente." }
      }
      return { tipo: "error", detalle: "No se pudo registrar la aplicación sanitaria." }
    }
  }

  async anularRegistroGrupal(
    id: string,
    fincaId: string,
    anuladoEn: Date,
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
          .set({ anuladoEn, updatedAt: anuladoEn })
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
}
