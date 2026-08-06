/**
 * Adaptador Drizzle (PostgreSQL) del read model del panel de sanidad
 * (Issue #212, RF-SANIDAD v0.2 §4/§11).
 *
 * Implementa `SanidadPanelLecturaPort` (`@ganaweb/aplicacion`, type-only —
 * regla `db-to-aplicacion-runtime`).
 *
 * Reglas materializadas aquí:
 * - SAN-002: métricas del panel — aplicaciones de la semana natural
 *   actual (SAN-052: lunes..domingo), animales distintos en tratamiento
 *   (`tipo_tratamiento` ≠ 'vacuna' en los últimos 30 días — D-002), stock
 *   crítico y agotados desde la vista `inventario_sanitario` (KPI-10).
 * - T-001: el umbral `stock_minimo_dosis` se lee de
 *   `config_parametros_finca` reutilizando `obtenerStockMinimoDosis` del
 *   adaptador de catálogo (#209); sin parámetro se aplica el fallback del
 *   dominio `STOCK_MINIMO_DOSIS_DEFAULT` (nunca un umbral hardcodeado en
 *   la lógica).
 * - KPI-09/SAN-050: refuerzos pendientes — sólo la última aplicación por
 *   animal/producto puede estar pendiente (sin aplicación posterior del
 *   mismo producto), ventana hoy+30, solo animales EN_FINCA y excluidas
 *   las filas de grupos anulados (RN-051). La agrupación por semana
 *   natural (SAN-052) la aplica el dominio en la capa que orquesta.
 * - SAN-004: últimas 4 aplicaciones (objetivo animal|lote, N animales,
 *   responsable).
 * - SAN-005: hasta 4 alertas de stock ordenadas por criticidad.
 * - D-005: historial con filtros producto/fecha/animal-lote; la
 *   paginación se resuelve sobre la colección acotada (escala v1, patrón
 *   de listados del módulo).
 * - SAN-063: todas las queries acotan por finca vía el join con
 *   `productos_sanitarios` (o la columna de la vista); el `fincaId` llega
 *   revalidado por la server function.
 *
 * Todas las salidas son serializables (CM-042): fechas ISO YYYY-MM-DD y
 * numerales como `number`.
 */

import type {
  AlertaStockPanel,
  FilaHistorialSanidad,
  FiltrosHistorialSanidad,
  HistorialSanidadPagina,
  ObjetivoAplicacionSanidad,
  PanelSanidadMetricas,
  RefuerzoPendienteFila,
  SanidadPanelLecturaPort,
  UltimaAplicacionPanel,
} from "@ganaweb/aplicacion"
import {
  STOCK_MINIMO_DOSIS_DEFAULT,
  VENTANA_REFUERZOS_DIAS,
  contarAnimalesEnTratamiento,
  esRefuerzoPendienteSanidad,
  estadoStockSanidad,
  finSemanaIso,
  inicioSemanaIso,
  sumarDiasAFechaIso,
  validarTipoTratamiento,
} from "@ganaweb/dominio"
import { and, desc, eq, gte, ilike, isNull, lte, ne, or } from "drizzle-orm"
import { DrizzleCatalogoProductoSanitarioAdapter } from "./catalogo-producto-sanitario-infrastructure.js"
import type { DbClient } from "./client.js"
import {
  animales,
  aplicacionesSanitarias,
  inventarioSanitario,
  productosSanitarios,
  registrosGrupales,
  usuarios,
} from "./schema/index.js"

function aNumero(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined) return 0
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : 0
}

/** RN-051: exclusión de filas de grupos anulados en lecturas de aplicaciones. */
function sinGruposAnulados() {
  return or(isNull(aplicacionesSanitarias.registroGrupalId), isNull(registrosGrupales.anuladoEn))
}

const ORDEN_ESTADO_STOCK: Record<AlertaStockPanel["estado"], number> = {
  agotado: 0,
  bajo: 1,
  ok: 2,
}

export class DrizzlePanelSanidadAdapter implements SanidadPanelLecturaPort {
  constructor(private readonly db: DbClient) {}

  /** T-001: umbral desde `config_parametros_finca` (fallback del dominio). */
  private async obtenerUmbralStock(fincaId: string): Promise<number> {
    const catalogo = new DrizzleCatalogoProductoSanitarioAdapter(this.db)
    const configurado = await catalogo.obtenerStockMinimoDosis(fincaId)
    return configurado ?? STOCK_MINIMO_DOSIS_DEFAULT
  }

  async obtenerMetricas(fincaId: string, hoy: string): Promise<PanelSanidadMetricas> {
    const umbral = await this.obtenerUmbralStock(fincaId)
    const inicioSemana = inicioSemanaIso(hoy)
    const finSemana = finSemanaIso(hoy)
    const inicioTratamiento = sumarDiasAFechaIso(hoy, -30)

    // SAN-002: aplicaciones con fecha en la semana natural actual.
    const filasSemana = await this.db
      .select({ id: aplicacionesSanitarias.id })
      .from(aplicacionesSanitarias)
      .innerJoin(productosSanitarios, eq(aplicacionesSanitarias.productoId, productosSanitarios.id))
      .leftJoin(
        registrosGrupales,
        eq(aplicacionesSanitarias.registroGrupalId, registrosGrupales.id),
      )
      .where(
        and(
          eq(productosSanitarios.fincaId, fincaId),
          gte(aplicacionesSanitarias.fecha, inicioSemana),
          lte(aplicacionesSanitarias.fecha, finSemana),
          sinGruposAnulados(),
        ),
      )

    // D-002: animales distintos con tratamiento (≠ vacuna) en 30 días.
    const filasTratamiento = await this.db
      .select({
        animalId: aplicacionesSanitarias.animalId,
        tipoTratamiento: productosSanitarios.tipoTratamiento,
        fecha: aplicacionesSanitarias.fecha,
      })
      .from(aplicacionesSanitarias)
      .innerJoin(productosSanitarios, eq(aplicacionesSanitarias.productoId, productosSanitarios.id))
      .leftJoin(
        registrosGrupales,
        eq(aplicacionesSanitarias.registroGrupalId, registrosGrupales.id),
      )
      .where(
        and(
          eq(productosSanitarios.fincaId, fincaId),
          gte(aplicacionesSanitarias.fecha, inicioTratamiento),
          lte(aplicacionesSanitarias.fecha, hoy),
          ne(productosSanitarios.tipoTratamiento, "vacuna"),
          sinGruposAnulados(),
        ),
      )
    const animalesEnTratamiento = contarAnimalesEnTratamiento(
      filasTratamiento.flatMap((fila) => {
        const tipo = validarTipoTratamiento(fila.tipoTratamiento)
        return tipo.valido
          ? [{ animalId: fila.animalId, tipoTratamiento: tipo.valor, fecha: fila.fecha }]
          : []
      }),
      hoy,
    )

    // KPI-10: stock crítico (< umbral) y agotados (≤ 0) desde la vista.
    const filasInventario = await this.db
      .select({ dosisDisponibles: inventarioSanitario.dosisDisponibles })
      .from(inventarioSanitario)
      .where(eq(inventarioSanitario.fincaId, fincaId))

    let stockCritico = 0
    let productosAgotados = 0
    for (const fila of filasInventario) {
      const dosis = aNumero(fila.dosisDisponibles)
      if (dosis < umbral) stockCritico += 1
      if (dosis <= 0) productosAgotados += 1
    }

    return {
      aplicacionesEstaSemana: filasSemana.length,
      animalesEnTratamiento,
      stockCritico,
      productosAgotados,
    }
  }

  /**
   * KPI-09/SAN-050: filas de refuerzo pendiente por animal/producto.
   *
   * Se traen las aplicaciones de la finca (animales EN_FINCA, sin grupos
   * anulados) y se aplica la regla en TS: sólo la ÚLTIMA aplicación por
   * animal/producto puede estar pendiente — una aplicación posterior del
   * mismo producto auto-completa el refuerzo (RN-042). El predicado de
   * ventana (≤ hoy+30) es del dominio (`esRefuerzoPendienteSanidad`).
   */
  async listarRefuerzosPendientes(
    fincaId: string,
    hoy: string,
  ): Promise<readonly RefuerzoPendienteFila[]> {
    const filas = await this.db
      .select({
        animalId: aplicacionesSanitarias.animalId,
        productoId: aplicacionesSanitarias.productoId,
        fecha: aplicacionesSanitarias.fecha,
        proximaDosis: aplicacionesSanitarias.proximaDosis,
        codigo: productosSanitarios.codigo,
        descripcion: productosSanitarios.descripcion,
        tipoTratamiento: productosSanitarios.tipoTratamiento,
      })
      .from(aplicacionesSanitarias)
      .innerJoin(productosSanitarios, eq(aplicacionesSanitarias.productoId, productosSanitarios.id))
      .innerJoin(animales, eq(aplicacionesSanitarias.animalId, animales.id))
      .leftJoin(
        registrosGrupales,
        eq(aplicacionesSanitarias.registroGrupalId, registrosGrupales.id),
      )
      .where(
        and(
          eq(productosSanitarios.fincaId, fincaId),
          // SAN-050: solo animales EN_FINCA (estado_animal_key 0).
          eq(animales.estadoAnimalKey, 0),
          sinGruposAnulados(),
        ),
      )

    // Última aplicación por (animal, producto): la única que puede estar pendiente.
    const ultimaPorPareja = new Map<string, (typeof filas)[number]>()
    for (const fila of filas) {
      const clave = `${fila.animalId}|${fila.productoId}`
      const actual = ultimaPorPareja.get(clave)
      if (actual === undefined || fila.fecha >= actual.fecha) {
        ultimaPorPareja.set(clave, fila)
      }
    }

    const pendientes: RefuerzoPendienteFila[] = []
    for (const fila of ultimaPorPareja.values()) {
      if (
        !esRefuerzoPendienteSanidad({
          proximaDosis: fila.proximaDosis,
          tieneAplicacionPosterior: false,
          animalEnFinca: true,
          hoy,
        })
      ) {
        continue
      }
      const tipo = validarTipoTratamiento(fila.tipoTratamiento)
      if (!tipo.valido || fila.proximaDosis === null) continue
      pendientes.push({
        productoId: fila.productoId,
        codigo: fila.codigo,
        descripcion: fila.descripcion,
        tipoTratamiento: tipo.valor,
        animalId: fila.animalId,
        proximaDosis: fila.proximaDosis,
      })
    }
    return pendientes
  }

  /** SAN-004: las 4 aplicaciones más recientes de la finca. */
  async listarUltimasAplicaciones(fincaId: string): Promise<readonly UltimaAplicacionPanel[]> {
    const filas = await this.db
      .select({
        id: aplicacionesSanitarias.id,
        fecha: aplicacionesSanitarias.fecha,
        registroGrupalId: aplicacionesSanitarias.registroGrupalId,
        productoCodigo: productosSanitarios.codigo,
        productoDescripcion: productosSanitarios.descripcion,
        responsableNombre: usuarios.nombre,
        totalAnimales: registrosGrupales.totalAnimales,
      })
      .from(aplicacionesSanitarias)
      .innerJoin(productosSanitarios, eq(aplicacionesSanitarias.productoId, productosSanitarios.id))
      .leftJoin(usuarios, eq(aplicacionesSanitarias.usuarioCreadoPor, usuarios.id))
      .leftJoin(
        registrosGrupales,
        eq(aplicacionesSanitarias.registroGrupalId, registrosGrupales.id),
      )
      .where(and(eq(productosSanitarios.fincaId, fincaId), sinGruposAnulados()))
      .orderBy(desc(aplicacionesSanitarias.fecha), desc(aplicacionesSanitarias.createdAt))
      .limit(4)

    return filas.map((fila) => {
      const objetivo: ObjetivoAplicacionSanidad = fila.registroGrupalId === null ? "animal" : "lote"
      return {
        id: fila.id,
        fecha: fila.fecha,
        productoCodigo: fila.productoCodigo,
        productoDescripcion: fila.productoDescripcion,
        objetivo,
        cantidadAnimales: objetivo === "lote" ? (fila.totalAnimales ?? 1) : 1,
        responsable: fila.responsableNombre ?? null,
      }
    })
  }

  /**
   * SAN-005/KPI-10: hasta 4 productos con su estado de stock, ordenados
   * por criticidad (agotado → bajo → ok; dentro del mismo estado, el de
   * menor stock primero).
   */
  async listarAlertasStock(fincaId: string): Promise<readonly AlertaStockPanel[]> {
    const umbral = await this.obtenerUmbralStock(fincaId)
    const filas = await this.db
      .select({
        productoId: inventarioSanitario.productoId,
        codigo: inventarioSanitario.codigo,
        descripcion: inventarioSanitario.descripcion,
        dosisDisponibles: inventarioSanitario.dosisDisponibles,
      })
      .from(inventarioSanitario)
      .where(eq(inventarioSanitario.fincaId, fincaId))

    const alertas: AlertaStockPanel[] = filas.map((fila) => {
      const dosis = aNumero(fila.dosisDisponibles)
      return {
        productoId: fila.productoId ?? "",
        codigo: fila.codigo ?? "",
        descripcion: fila.descripcion ?? "",
        dosisDisponibles: dosis,
        estado: estadoStockSanidad(dosis, umbral),
      }
    })
    alertas.sort(
      (a, b) =>
        ORDEN_ESTADO_STOCK[a.estado] - ORDEN_ESTADO_STOCK[b.estado] ||
        a.dosisDisponibles - b.dosisDisponibles,
    )
    return alertas.slice(0, 4)
  }

  /** D-005: historial de aplicaciones con filtros y paginación. */
  async listarHistorial(
    fincaId: string,
    filtros: FiltrosHistorialSanidad,
  ): Promise<HistorialSanidadPagina> {
    const condiciones = [eq(productosSanitarios.fincaId, fincaId), sinGruposAnulados()]
    if (
      filtros.productoId !== null &&
      filtros.productoId !== undefined &&
      filtros.productoId !== ""
    ) {
      condiciones.push(eq(aplicacionesSanitarias.productoId, filtros.productoId))
    }
    if (filtros.desde !== null && filtros.desde !== undefined && filtros.desde !== "") {
      condiciones.push(gte(aplicacionesSanitarias.fecha, filtros.desde))
    }
    if (filtros.hasta !== null && filtros.hasta !== undefined && filtros.hasta !== "") {
      condiciones.push(lte(aplicacionesSanitarias.fecha, filtros.hasta))
    }
    const busqueda = filtros.animalOLote?.trim()
    if (busqueda !== undefined && busqueda !== "") {
      const patron = `%${busqueda}%`
      condiciones.push(
        or(ilike(animales.codigo, patron), ilike(registrosGrupales.descripcion, patron)),
      )
    }

    const filas = await this.db
      .select({
        id: aplicacionesSanitarias.id,
        fecha: aplicacionesSanitarias.fecha,
        registroGrupalId: aplicacionesSanitarias.registroGrupalId,
        dosis: aplicacionesSanitarias.dosis,
        productoCodigo: productosSanitarios.codigo,
        productoDescripcion: productosSanitarios.descripcion,
        animalCodigo: animales.codigo,
        grupoDescripcion: registrosGrupales.descripcion,
        totalAnimales: registrosGrupales.totalAnimales,
        responsableNombre: usuarios.nombre,
      })
      .from(aplicacionesSanitarias)
      .innerJoin(productosSanitarios, eq(aplicacionesSanitarias.productoId, productosSanitarios.id))
      .innerJoin(animales, eq(aplicacionesSanitarias.animalId, animales.id))
      .leftJoin(usuarios, eq(aplicacionesSanitarias.usuarioCreadoPor, usuarios.id))
      .leftJoin(
        registrosGrupales,
        eq(aplicacionesSanitarias.registroGrupalId, registrosGrupales.id),
      )
      .where(and(...condiciones))
      .orderBy(desc(aplicacionesSanitarias.fecha), desc(aplicacionesSanitarias.createdAt))

    const mapeadas: FilaHistorialSanidad[] = filas.map((fila) => {
      const objetivo: ObjetivoAplicacionSanidad = fila.registroGrupalId === null ? "animal" : "lote"
      return {
        id: fila.id,
        fecha: fila.fecha,
        productoCodigo: fila.productoCodigo,
        productoDescripcion: fila.productoDescripcion,
        objetivo,
        cantidadAnimales: objetivo === "lote" ? (fila.totalAnimales ?? 1) : 1,
        animalCodigo: objetivo === "animal" ? fila.animalCodigo : null,
        loteDescripcion: objetivo === "lote" ? fila.grupoDescripcion : null,
        dosis: aNumero(fila.dosis),
        responsable: fila.responsableNombre ?? null,
      }
    })

    const tamanoPagina = Math.max(1, filtros.tamanoPagina)
    const pagina = Math.max(1, filtros.pagina)
    const inicio = (pagina - 1) * tamanoPagina
    return {
      filas: mapeadas.slice(inicio, inicio + tamanoPagina),
      total: mapeadas.length,
      pagina,
      tamanoPagina,
    }
  }
}
