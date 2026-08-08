/**
 * Issue #227 — Read model unificado de finca
 * (RF-EVENTOS v1.1, EV-UI-002..005, EV-INT-001, EV-SEC-001).
 *
 * Composición:
 *  - Reutiliza el UNION ALL de las 11 tablas especializadas del timeline
 *    (`#167`), con la exclusion vigente de registros grupales anulados
 *    (`#181`) y la semantica de conteo/paginacion (`#183`).
 *  - Anade el JOIN a `animales` para derivar `finca_id` por animal
 *    (EV-ARQ-003): el feed de finca nunca emite filas de animales de
 *    otra finca.
 *  - Para cabeceras grupales: una fila agregada por `registro_grupal_id`
 *    con `child_count` (hijos efectivos, excluyendo los anidados en un
 *    registro grupal anulado) en el feed; cada hijo en el historial.
 *  - RBAC fail-closed en servidor: el port NUNCA recibe `fincaId`
 *    distinto a la `fincaActivaId` de la sesion (la capa de aplicacion
 *    lo valida antes de llegar aqui); la query refuerza el filtro de
 *    `animal.finca_id = $finca` como red de seguridad.
 *
 * Implementacion (D3 — UNION ALL, sin UNION paralelo divergente):
 *  - `sql.join(ramas, sql.raw(" UNION ALL "))` — inmutable: no se
 *    acumulan llamadas mutables sobre el `SQL` acumulado.
 *  - La exclusion de registros grupales anulados (#181) se aplica por
 *    rama con un `NOT EXISTS` identico al timeline.
 *  - El cursor es keyset (`{f, id}` base64url, mismo encoding que el
 *    timeline) y la condicion `fecha < f OR (fecha = f AND id < id)`
 *    compone con el ORDER BY estable `fecha DESC, id DESC`.
 *  - `COUNT(*) OVER ()` da el conteo pendiente bajo el MISMO filtro
 *    sin segunda ronda a la DB (#183).
 *  - La agrupacion del feed por cabecera se hace con un OUTER
 *    `ROW_NUMBER() OVER (PARTITION BY COALESCE(registro_grupal_id, id))`,
 *    lo que deja una sola fila por cabecera grupal y todas las filas
 *    individuales (registro_grupal_id NULL) intactas.
 */
import type {
  ContadoresEventosFinca,
  EventosFincaPagina,
  EventosFincaReadPort,
  EventosFincaReadRequest,
  FeedFincaItem,
  HistorialFincaItem,
} from "@ganaweb/aplicacion"
import type { CategoriaFiltroFinca, DominioEvento, PermisoVerDominio } from "@ganaweb/dominio"
import { type SQL, sql } from "drizzle-orm"
import type { DbClient } from "./client.js"
import { animales } from "./schema/index.js"

interface RamaFinca {
  readonly dominio: DominioEvento
  readonly tipo: string
  /** Tabla especializada (interpolación segura — no viene del request). */
  readonly tabla: string
  /** Expresión SQL que produce la fecha del evento como date. */
  readonly fechaExpr: string
  /** Expresión SQL que produce el detalle (text|null) de la firma. */
  readonly detalleExpr: string
  /** La tabla tiene `registro_grupal_id` (exclusion #181 + agrupacion feed). */
  readonly tieneRegistroGrupal: boolean
}

/**
 * Catalogo de las 11 ramas del read model. El orden no es semantico:
 * la query ordena por `fecha DESC, id DESC` al final. Mantener una
 * sola fuente de verdad (la misma que el timeline del animal) evita
 * divergencia de tablas entre consumidores del dominio Eventos.
 */
const RAMAS_FINCA: readonly RamaFinca[] = [
  {
    dominio: "reproductivo",
    tipo: "servicio",
    tabla: "servicios",
    fechaExpr: "fecha",
    detalleExpr: "tipo",
    tieneRegistroGrupal: true,
  },
  {
    dominio: "reproductivo",
    tipo: "palpacion",
    tabla: "palpaciones",
    fechaExpr: "fecha",
    detalleExpr: "resultado",
    tieneRegistroGrupal: true,
  },
  {
    dominio: "reproductivo",
    tipo: "parto",
    tabla: "partos",
    fechaExpr: "fecha",
    detalleExpr: "tipo_parto",
    tieneRegistroGrupal: true,
  },
  {
    dominio: "sanidad",
    tipo: "aplicacion_sanitaria",
    tabla: "aplicaciones_sanitarias",
    fechaExpr: "fecha",
    detalleExpr: "dosis::text",
    tieneRegistroGrupal: true,
  },
  {
    dominio: "sanidad",
    tipo: "revision_veterinaria",
    tabla: "revisiones_veterinarias",
    fechaExpr: "fecha",
    detalleExpr: "tipo_diagnostico",
    tieneRegistroGrupal: true,
  },
  {
    dominio: "productivo",
    tipo: "pesaje",
    tabla: "pesos",
    fechaExpr: "fecha",
    detalleExpr: "peso_kg::text || ' kg'",
    tieneRegistroGrupal: true,
  },
  {
    dominio: "productivo",
    tipo: "produccion_lactea",
    tabla: "producciones_lacteas",
    fechaExpr: "fecha",
    detalleExpr: "(cantidad_am + cantidad_pm)::text || ' L'",
    tieneRegistroGrupal: true,
  },
  {
    dominio: "productivo",
    tipo: "condicion_corporal",
    tabla: "animales_condicion_corporal",
    fechaExpr: "fecha",
    detalleExpr: "puntaje::text",
    tieneRegistroGrupal: false,
  },
  {
    dominio: "movimientos",
    tipo: "venta",
    tabla: "ventas",
    fechaExpr: "fecha",
    detalleExpr: "comprador",
    tieneRegistroGrupal: true,
  },
  {
    dominio: "movimientos",
    tipo: "muerte",
    tabla: "muertes",
    fechaExpr: "fecha",
    detalleExpr: "NULL::text",
    tieneRegistroGrupal: false,
  },
  {
    dominio: "movimientos",
    tipo: "traslado",
    tabla: "animales_ubicacion_historico",
    fechaExpr: "(fecha AT TIME ZONE 'UTC')::date",
    detalleExpr: "motivo",
    tieneRegistroGrupal: true,
  },
]

/**
 * Mapa rapido: tipo canonico -> dominio (subset estable del read model).
 * Se usa para validar el cruce de `tipo` y `categoria` cuando el port
 * recibe un `tipo` arbitrario (defensa en profundidad).
 */
const TIPO_A_DOMINIO: Readonly<Record<string, DominioEvento>> = {
  servicio: "reproductivo",
  palpacion: "reproductivo",
  parto: "reproductivo",
  aplicacion_sanitaria: "sanidad",
  revision_veterinaria: "sanidad",
  pesaje: "productivo",
  produccion_lactea: "productivo",
  condicion_corporal: "productivo",
  venta: "movimientos",
  muerte: "movimientos",
  traslado: "movimientos",
}

const FORMATO_FECHA_CURSOR = /^\d{4}-\d{2}-\d{2}$/
const FORMATO_MES = /^\d{4}-\d{2}$/

interface CursorFinca {
  readonly f: string
  readonly id: string
}

function decodificarCursorFinca(cursor: string): CursorFinca | null {
  try {
    const parseado: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    if (typeof parseado !== "object" || parseado === null) return null
    const { f, id } = parseado as { readonly f?: unknown; readonly id?: unknown }
    if (typeof f !== "string" || typeof id !== "string") return null
    if (!FORMATO_FECHA_CURSOR.test(f)) return null
    if (Number.isNaN(new Date(f).getTime())) return null
    return { f, id }
  } catch {
    return null
  }
}

function codificarCursorFinca(item: { readonly fecha: string; readonly id: string }): string {
  return Buffer.from(JSON.stringify({ f: item.fecha, id: item.id }), "utf8").toString("base64url")
}

function validarFechasFiltro(fechaDesde: string | undefined, fechaHasta: string | undefined): void {
  if (fechaDesde && !FORMATO_FECHA_CURSOR.test(fechaDesde)) {
    throw new Error("invalid fechaDesde")
  }
  if (fechaHasta && !FORMATO_FECHA_CURSOR.test(fechaHasta)) {
    throw new Error("invalid fechaHasta")
  }
  if (fechaDesde && fechaHasta && fechaDesde.localeCompare(fechaHasta) > 0) {
    throw new Error("invalid fechaDesde")
  }
}

function reducirAnd(condiciones: readonly SQL[]): SQL {
  if (condiciones.length === 0) return sql``
  return sql` AND ${condiciones.reduce((acc, cur) => sql`${acc} AND ${cur}`)}`
}

function condicionFechaFiltro(
  columnaFecha: SQL,
  fechaDesde: string | undefined,
  fechaHasta: string | undefined,
): SQL {
  const condiciones: SQL[] = []
  if (fechaDesde) {
    condiciones.push(sql`${columnaFecha} >= ${fechaDesde}::date`)
  }
  if (fechaHasta) {
    condiciones.push(sql`${columnaFecha} <= ${fechaHasta}::date`)
  }
  return reducirAnd(condiciones)
}

/**
 * Devuelve el fragmento `NOT EXISTS` que excluye eventos anidados en
 * un registro grupal anulado (#181). Identico al criterio del timeline
 * del animal; vive aqui para que la rama del feed no dependa del
 * modulo animal-infrastructure.
 */
function condicionVigenciaGrupal(tabla: string, tieneRegistroGrupal: boolean): SQL {
  if (!tieneRegistroGrupal) return sql``
  return sql` AND NOT EXISTS (
    SELECT 1 FROM registros_grupales
    WHERE registros_grupales.id = ${sql.raw(tabla)}.registro_grupal_id
      AND registros_grupales.anulado_en IS NOT NULL
  )`
}

function condicionTipo(rama: RamaFinca, tipo: string | undefined): SQL {
  if (!tipo) return sql``
  // Doble check: la rama debe tener el tipo pedido Y pertenecer al
  // dominio del tipo. `ramasAplicables` ya filtra por dominio, pero
  // un dominio agrupa varios tipos; este WHERE adicional garantiza
  // que el UNION solo emite filas del tipo concreto.
  if (rama.tipo !== tipo) {
    return sql` AND 1=0`
  }
  return sql``
}

/**
 * Construye una rama de la union del FEED de finca. La forma base
 * es siempre la misma; la agrupacion por cabecera se hace en la capa
 * exterior con `ROW_NUMBER() OVER (PARTITION BY COALESCE(...))`. Asi,
 * la query del feed no depende de callbacks mutables ni de joins
 * adicionales sobre la union; cada rama sigue siendo una sentencia
 * inmutable con sus propias proyecciones.
 */
function ramaFeedFinca(
  rama: RamaFinca,
  fincaId: string,
  fechaDesde: string | undefined,
  fechaHasta: string | undefined,
  tipo: string | undefined,
): SQL {
  const fecha = sql.raw(rama.fechaExpr)
  const tabla = sql.raw(rama.tabla)
  return sql`SELECT
      ${tabla}.id::text AS id,
      ${fecha} AS fecha,
      ${rama.dominio}::text AS dominio,
      ${rama.tipo}::text AS tipo,
      ${sql.raw(rama.detalleExpr)} AS detalle,
      ${animales}.id::text AS animal_id,
      ${animales}.codigo::text AS animal_codigo,
      ${animales}.nombre::text AS animal_nombre,
      ${
        rama.tieneRegistroGrupal ? sql`${tabla}.registro_grupal_id::text` : sql`NULL::text`
      } AS registro_grupal_id,
      ${
        rama.tieneRegistroGrupal
          ? sql`(SELECT COUNT(*)::int FROM ${tabla} h
              WHERE h.registro_grupal_id = ${tabla}.registro_grupal_id
              ${condicionVigenciaGrupalInterna(rama.tabla, "h")})`
          : sql`NULL::int`
      } AS total_animales
    FROM ${tabla}
    INNER JOIN ${animales} ON ${animales}.id = ${tabla}.animal_id
    WHERE ${animales}.finca_id = ${fincaId}${condicionVigenciaGrupal(rama.tabla, rama.tieneRegistroGrupal)}${condicionTipo(rama, tipo)}${condicionFechaFiltro(fecha, fechaDesde, fechaHasta)}
  `
}

/**
 * Variante interna del NOT EXISTS para sub-consultas sobre la misma
 * tabla. Se usa en el `COUNT(*)` de hijos efectivos del feed.
 */
function condicionVigenciaGrupalInterna(_tabla: string, alias: string): SQL {
  return sql` AND NOT EXISTS (
    SELECT 1 FROM registros_grupales
    WHERE registros_grupales.id = ${sql.raw(alias)}.registro_grupal_id
      AND registros_grupales.anulado_en IS NOT NULL
  )`
}

/**
 * Rama para el HISTORIAL: cada hijo aparece por separado. Mantiene la
 * exclusion #181 (no emitir hijos de cabeceras anuladas) y la
 * composicion con el cursor keyset.
 */
function ramaHistorialFinca(
  rama: RamaFinca,
  fincaId: string,
  fechaDesde: string | undefined,
  fechaHasta: string | undefined,
  tipo: string | undefined,
): SQL {
  const fecha = sql.raw(rama.fechaExpr)
  const tabla = sql.raw(rama.tabla)
  return sql`SELECT
      ${tabla}.id::text AS id,
      ${fecha} AS fecha,
      ${rama.dominio}::text AS dominio,
      ${rama.tipo}::text AS tipo,
      ${sql.raw(rama.detalleExpr)} AS detalle,
      ${animales}.id::text AS animal_id,
      ${animales}.codigo::text AS animal_codigo,
      ${animales}.nombre::text AS animal_nombre,
      ${
        rama.tieneRegistroGrupal ? sql`${tabla}.registro_grupal_id::text` : sql`NULL::text`
      } AS registro_grupal_id
    FROM ${tabla}
    INNER JOIN ${animales} ON ${animales}.id = ${tabla}.animal_id
    WHERE ${animales}.finca_id = ${fincaId}${condicionVigenciaGrupal(rama.tabla, rama.tieneRegistroGrupal)}${condicionTipo(rama, tipo)}${condicionFechaFiltro(fecha, fechaDesde, fechaHasta)}
  `
}

function ramasAplicables(
  categoria: CategoriaFiltroFinca | undefined,
  tipo: string | undefined,
): readonly RamaFinca[] {
  if (tipo) {
    const tipoValido = Object.keys(TIPO_A_DOMINIO).includes(tipo) ? tipo : null
    if (!tipoValido) return []
    const dominio = TIPO_A_DOMINIO[tipoValido]
    return RAMAS_FINCA.filter((rama) => rama.dominio === dominio)
  }
  if (categoria && categoria !== "todos") {
    return RAMAS_FINCA.filter((rama) => rama.dominio === categoria)
  }
  return RAMAS_FINCA
}

export class DrizzleEventosFincaReadRepository implements EventosFincaReadPort {
  constructor(private readonly db: DbClient) {}

  async feedFinca(request: EventosFincaReadRequest): Promise<EventosFincaPagina<FeedFincaItem>> {
    const { fincaId, sesion } = request
    if (sesion.fincaActivaId !== fincaId) {
      return { items: [] }
    }
    validarFechasFiltro(request.fechaDesde, request.fechaHasta)
    const cursor = request.cursor ? decodificarCursorFinca(request.cursor) : null
    const ramas = ramasAplicables(request.categoria, request.tipo)
    if (ramas.length === 0) return { items: [] }

    const union = sql.join(
      ramas.map((rama) =>
        ramaFeedFinca(rama, fincaId, request.fechaDesde, request.fechaHasta, request.tipo),
      ),
      sql.raw(" UNION ALL "),
    )

    // La agrupacion por cabecera se hace con un ROW_NUMBER sobre la
    // union: la primera fila por (registro_grupal_id) gana; los hijos
    // restantes se descartan. Para filas sin cabecera, el COALESCE a
    // `id` deja cada fila en su propio grupo (rn=1 siempre), por lo
    // que las individuales no se ven afectadas.
    const filas = (await this.db.execute(
      sql`SELECT
          id,
          fecha::text AS fecha,
          dominio,
          tipo,
          detalle,
          animal_id,
          animal_codigo,
          animal_nombre,
          registro_grupal_id,
          (CASE WHEN registro_grupal_id IS NOT NULL THEN TRUE ELSE FALSE END) AS es_cabecera_grupal,
          total_animales,
          (COUNT(*) OVER ())::int AS total_tras_cursor
        FROM (
          SELECT
            *,
            ROW_NUMBER() OVER (
              PARTITION BY COALESCE(registro_grupal_id, id)
              ORDER BY fecha DESC, id DESC
            ) AS rn
          FROM (${union}) AS evento_union
        ) AS evento
        WHERE rn = 1
        ${cursor ? sql`AND (fecha < ${cursor.f}::date OR (fecha = ${cursor.f}::date AND id < ${cursor.id}))` : sql``}
        ORDER BY fecha DESC, id DESC
        LIMIT ${request.pageSize + 1}`,
    )) as unknown as readonly {
      readonly id: string
      readonly fecha: string
      readonly dominio: DominioEvento
      readonly tipo: string
      readonly detalle: string | null
      readonly animal_id: string | null
      readonly animal_codigo: string | null
      readonly animal_nombre: string | null
      readonly registro_grupal_id: string | null
      readonly es_cabecera_grupal: boolean
      readonly total_animales: number | null
      readonly total_tras_cursor: number
    }[]

    const items = filas.slice(0, request.pageSize).map((fila) => ({
      id: fila.id,
      dominio: fila.dominio,
      tipo: fila.tipo,
      fecha: fila.fecha,
      detalle: fila.detalle,
      esCabeceraGrupal: fila.es_cabecera_grupal,
      registroGrupalId: fila.registro_grupal_id,
      totalAnimales: fila.total_animales,
      animalCodigo: fila.animal_codigo,
      animalNombre: fila.animal_nombre,
    })) as readonly FeedFincaItem[]

    const ultimo = items[items.length - 1]
    if (filas.length > request.pageSize && ultimo) {
      const totalTrasCursor = Number(filas[0]?.total_tras_cursor ?? 0)
      return {
        items,
        nextCursor: codificarCursorFinca(ultimo),
        ...(totalTrasCursor > items.length ? { pendientes: totalTrasCursor - items.length } : {}),
      }
    }
    return { items }
  }

  async historialFinca(
    request: EventosFincaReadRequest,
  ): Promise<EventosFincaPagina<HistorialFincaItem>> {
    const { fincaId, sesion } = request
    if (sesion.fincaActivaId !== fincaId) {
      return { items: [] }
    }
    validarFechasFiltro(request.fechaDesde, request.fechaHasta)
    const cursor = request.cursor ? decodificarCursorFinca(request.cursor) : null
    const ramas = ramasAplicables(request.categoria, request.tipo)
    if (ramas.length === 0) return { items: [] }

    const union = sql.join(
      ramas.map((rama) =>
        ramaHistorialFinca(rama, fincaId, request.fechaDesde, request.fechaHasta, request.tipo),
      ),
      sql.raw(" UNION ALL "),
    )

    const filas = (await this.db.execute(
      sql`SELECT
          id,
          fecha::text AS fecha,
          dominio,
          tipo,
          detalle,
          animal_id,
          animal_codigo,
          animal_nombre,
          registro_grupal_id,
          (COUNT(*) OVER ())::int AS total_tras_cursor
        FROM (${union}) AS evento
        ${cursor ? sql`WHERE (fecha < ${cursor.f}::date OR (fecha = ${cursor.f}::date AND id < ${cursor.id}))` : sql``}
        ORDER BY fecha DESC, id DESC
        LIMIT ${request.pageSize + 1}`,
    )) as unknown as readonly {
      readonly id: string
      readonly fecha: string
      readonly dominio: DominioEvento
      readonly tipo: string
      readonly detalle: string | null
      readonly animal_id: string
      readonly animal_codigo: string
      readonly animal_nombre: string | null
      readonly registro_grupal_id: string | null
      readonly total_tras_cursor: number
    }[]

    const items = filas.slice(0, request.pageSize).map((fila) => ({
      id: fila.id,
      dominio: fila.dominio,
      tipo: fila.tipo,
      fecha: fila.fecha,
      detalle: fila.detalle,
      animalId: fila.animal_id,
      animalCodigo: fila.animal_codigo,
      animalNombre: fila.animal_nombre,
      registroGrupalId: fila.registro_grupal_id,
    })) as readonly HistorialFincaItem[]

    const ultimo = items[items.length - 1]
    if (filas.length > request.pageSize && ultimo) {
      const totalTrasCursor = Number(filas[0]?.total_tras_cursor ?? 0)
      return {
        items,
        nextCursor: codificarCursorFinca(ultimo),
        ...(totalTrasCursor > items.length ? { pendientes: totalTrasCursor - items.length } : {}),
      }
    }
    return { items }
  }

  async contadoresFinca(input: {
    readonly sesion: EventosFincaReadRequest["sesion"]
    readonly fincaId: string
    readonly mes?: string
  }): Promise<ContadoresEventosFinca> {
    const { fincaId, sesion } = input
    if (sesion.fincaActivaId !== fincaId) {
      return {
        mes: input.mes ?? mesActualUtc(),
        desde: "",
        hasta: "",
        porDominio: { reproductivo: 0, productivo: 0, sanidad: 0, movimientos: 0 },
        total: 0,
      }
    }
    const mes = input.mes ?? mesActualUtc()
    if (!FORMATO_MES.test(mes)) {
      return {
        mes,
        desde: "",
        hasta: "",
        porDominio: { reproductivo: 0, productivo: 0, sanidad: 0, movimientos: 0 },
        total: 0,
      }
    }
    const desde = `${mes}-01`
    const hasta = ultimoDiaDelMes(mes)

    // Contadores agregados por dominio en un solo round-trip: una UNION
    // de las 11 ramas (mismo patron que el feed), con un alias de
    // dominio y `COUNT(*)` despues de agrupar.
    const union = sql.join(
      RAMAS_FINCA.map((rama) => {
        const fecha = sql.raw(rama.fechaExpr)
        const tabla = sql.raw(rama.tabla)
        return sql`SELECT ${rama.dominio}::text AS dominio
          FROM ${tabla}
          INNER JOIN ${animales} ON ${animales}.id = ${tabla}.animal_id
          WHERE ${animales}.finca_id = ${fincaId}
            ${condicionVigenciaGrupal(rama.tabla, rama.tieneRegistroGrupal)}
            AND ${fecha} >= ${desde}::date
            AND ${fecha} <= ${hasta}::date`
      }),
      sql.raw(" UNION ALL "),
    )

    const filas = (await this.db.execute(
      sql`SELECT dominio, COUNT(*)::int AS total
          FROM (${union}) AS conteo
          GROUP BY dominio`,
    )) as unknown as readonly { readonly dominio: string; readonly total: number }[]

    const inicialMutable: { [K in PermisoVerDominio]: number } = {
      reproductivo: 0,
      productivo: 0,
      sanidad: 0,
      movimientos: 0,
    }
    let total = 0
    for (const fila of filas) {
      const dominio = fila.dominio as PermisoVerDominio
      if (dominio in inicialMutable) {
        inicialMutable[dominio] = Number(fila.total)
        total += Number(fila.total)
      }
    }
    const inicial: Readonly<Record<PermisoVerDominio, number>> = inicialMutable
    return {
      mes,
      desde,
      hasta,
      porDominio: inicial,
      total,
    }
  }
}

function mesActualUtc(): string {
  const ahora = new Date()
  const anio = ahora.getUTCFullYear()
  const mes = String(ahora.getUTCMonth() + 1).padStart(2, "0")
  return `${anio}-${mes}`
}

function ultimoDiaDelMes(mes: string): string {
  const [anioStr, mesStr] = mes.split("-")
  const anio = Number(anioStr)
  const mesNum = Number(mesStr)
  if (!anio || !mesNum) return `${mes}-31`
  const ultimo = new Date(Date.UTC(anio, mesNum, 0)).getUTCDate()
  return `${mes}-${String(ultimo).padStart(2, "0")}`
}
