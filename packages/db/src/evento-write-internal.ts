import type { EventoWriteGateway } from "@ganaweb/aplicacion"
import type {
  AnularEventoCommand,
  CrearEventoIndividualCommand,
  CrearHijoEventoGrupalCommand,
  EventoWriteCommand,
  TipoEventoCanonico,
} from "@ganaweb/dominio"
import {
  EVENTOS_CANONICOS,
  EventoCommandInvalidError,
  EventoForbiddenError,
} from "@ganaweb/dominio"
import { sql } from "drizzle-orm"
import type { PgTable } from "drizzle-orm/pg-core"
import type { DbClient } from "./client.js"
import {
  animalesCondicionCorporal,
  animalesUbicacionHistorico,
  aplicacionesSanitarias,
  muertes,
  palpaciones,
  partos,
  pesos,
  produccionesLacteas,
  registrosGrupales,
  revisionesVeterinarias,
  servicios,
  ventas,
} from "./schema/index.js"

interface TableConfig {
  readonly table: PgTable
  readonly tableName: string
  readonly allowedData: ReadonlySet<string>
}

function config(table: PgTable, tableName: string, allowedData: readonly string[]): TableConfig {
  return { table, tableName, allowedData: new Set(allowedData) }
}

const TABLES: Record<TipoEventoCanonico, TableConfig> = {
  servicio: config(servicios, EVENTOS_CANONICOS.servicio.tabla, [
    "fecha",
    "tipo",
    "padreId",
    "pajuelaId",
    "inseminadorId",
    "tipoInseminacion",
    "dosis",
    "precio",
    "efectivo",
    "observaciones",
  ]),
  palpacion: config(palpaciones, EVENTOS_CANONICOS.palpacion.tabla, [
    "servicioId",
    "fecha",
    "diagnosticoId",
    "resultado",
    "diasGestion",
    "comentarios",
  ]),
  parto: config(partos, EVENTOS_CANONICOS.parto.tabla, [
    "servicioId",
    "fecha",
    "machos",
    "hembras",
    "muertos",
    "tipoParto",
    "comentarios",
  ]),
  aplicacion_sanitaria: config(
    aplicacionesSanitarias,
    EVENTOS_CANONICOS.aplicacion_sanitaria.tabla,
    ["productoId", "fecha", "dosis", "precioDosis", "proximaDosis", "comentarios"],
  ),
  revision_veterinaria: config(
    revisionesVeterinarias,
    EVENTOS_CANONICOS.revision_veterinaria.tabla,
    ["fecha", "diagnosticoId", "tipoDiagnostico", "celoPresentado", "comentarios", "veterinarioId"],
  ),
  pesaje: config(pesos, EVENTOS_CANONICOS.pesaje.tabla, [
    "fecha",
    "pesoKg",
    "tipoPeso",
    "comentarios",
    "createdAt",
  ]),
  produccion_lactea: config(produccionesLacteas, EVENTOS_CANONICOS.produccion_lactea.tabla, [
    "fecha",
    "cantidadAm",
    "cantidadPm",
    "potreroId",
    "sectorId",
    "loteId",
    "grupoId",
  ]),
  condicion_corporal: config(
    animalesCondicionCorporal,
    EVENTOS_CANONICOS.condicion_corporal.tabla,
    ["condicionId", "puntaje", "fecha"],
  ),
  venta: config(ventas, EVENTOS_CANONICOS.venta.tabla, [
    "fecha",
    "motivoVentaId",
    "lugarVentaId",
    "pesoVentaKg",
    "precio",
    "comprador",
    "comentarios",
  ]),
  muerte: config(muertes, EVENTOS_CANONICOS.muerte.tabla, [
    "fecha",
    "causaMuerteId",
    "comentarios",
  ]),
  traslado: config(animalesUbicacionHistorico, EVENTOS_CANONICOS.traslado.tabla, [
    "potreroId",
    "sectorId",
    "loteId",
    "grupoId",
    "fecha",
    "motivo",
  ]),
}

function firstBoolean(result: unknown): boolean {
  return (result as Array<{ autorizado: boolean }>)[0]?.autorizado === true
}

function assertAllowedData(command: CrearEventoIndividualCommand | CrearHijoEventoGrupalCommand) {
  const allowed = TABLES[command.evento].allowedData
  for (const field of Object.keys(command.datos)) {
    if (!allowed.has(field)) throw new EventoCommandInvalidError(`datos.${field}`)
  }
}

type Transaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0]

class DrizzleEventoWriteGateway implements EventoWriteGateway {
  constructor(private readonly db: DbClient) {}

  persistir(command: EventoWriteCommand): Promise<{ readonly id: string }> {
    return this.db.transaction((tx) => this.persistirEnTransaccion(tx, command))
  }

  anular(command: AnularEventoCommand): Promise<void> {
    return this.db.transaction((tx) => this.anularEnTransaccion(tx, command))
  }

  persistirLote(commands: readonly EventoWriteCommand[]) {
    return this.db.transaction(async (tx) => {
      const results: { readonly id: string }[] = []
      for (const command of commands) {
        results.push(await this.persistirEnTransaccion(tx, command))
      }
      return results
    })
  }

  /** T-002/D1: batch persist + extra hook in the SAME transaction. */
  persistirLoteConTransaccion(
    commands: readonly EventoWriteCommand[],
    enTransaccion: (tx: Transaction) => Promise<void>,
  ) {
    return this.db.transaction(async (tx) => {
      const results: { readonly id: string }[] = []
      for (const command of commands) {
        results.push(await this.persistirEnTransaccion(tx, command))
      }
      await enTransaccion(tx)
      return results
    })
  }

  private persistirEnTransaccion(tx: Transaction, command: EventoWriteCommand) {
    if (command.tipo === "anular_evento") {
      return this.anularEnTransaccion(tx, command).then(() => ({ id: command.objetivoId }))
    }
    return command.tipo === "crear_registro_grupal"
      ? this.persistHeader(tx, command)
      : this.persistAnimalEvent(tx, command)
  }

  private async anularEnTransaccion(tx: Transaction, command: AnularEventoCommand): Promise<void> {
    const audit = {
      fecha: command.fecha.toISOString(),
      actor: command.usuarioId,
      motivo: command.motivo.trim(),
    }
    const result =
      command.objetivo === "grupal"
        ? await tx.execute(
            sql`UPDATE registros_grupales
                SET anulado_en = ${audit.fecha}, anulado_por = ${audit.actor},
                    motivo_anulacion = ${audit.motivo}, updated_at = ${audit.fecha}
                WHERE id = ${command.objetivoId}
                  AND finca_id = ${command.fincaId}
                  AND anulado_en IS NULL`,
          )
        : await tx.execute(
            sql`UPDATE ${sql.identifier(TABLES[command.evento].tableName)} evento
                SET anulado_en = ${audit.fecha}, anulado_por = ${audit.actor},
                    motivo_anulacion = ${audit.motivo}
                FROM animales animal
                WHERE evento.id = ${command.objetivoId}
                  AND evento.animal_id = animal.id
                  AND animal.finca_id = ${command.fincaId}
                  AND evento.registro_grupal_id IS NULL
                  AND evento.anulado_en IS NULL`,
          )
    if ((result as { readonly count?: number }).count !== 1) {
      throw new EventoCommandInvalidError("objetivoId")
    }
    if (["venta", "muerte", "traslado"].includes(command.evento)) {
      const tabla = TABLES[command.evento].tableName
      const targets =
        command.objetivo === "individual"
          ? ((await tx.execute(
              sql`SELECT id, animal_id, fecha::text AS fecha FROM ${sql.identifier(tabla)} WHERE id = ${command.objetivoId}`,
            )) as unknown as readonly { id: string; animal_id: string; fecha: string }[])
          : ((await tx.execute(
              sql`SELECT id, animal_id, fecha::text AS fecha FROM ${sql.identifier(tabla)} WHERE registro_grupal_id = ${command.objetivoId}`,
            )) as unknown as readonly { id: string; animal_id: string; fecha: string }[])
      for (const target of targets) {
        await this.reproyectarMovimiento(tx, target.animal_id, command.evento === "traslado")
      }
    }
  }

  private async persistHeader(
    tx: Transaction,
    command: Extract<EventoWriteCommand, { tipo: "crear_registro_grupal" }>,
  ) {
    await this.validateHeaderScope(tx, command)
    await tx.insert(registrosGrupales).values({
      id: command.id,
      fincaId: command.fincaId,
      tipoEvento: EVENTOS_CANONICOS[command.evento].tipoGrupal,
      totalAnimales: command.totalAnimales,
      origenSeleccion: command.criterio.origen,
      ...(command.criterio.origen === "lote" ? { loteId: command.criterio.loteId } : {}),
      ...(command.criterio.origen === "potrero" ? { potreroId: command.criterio.potreroId } : {}),
      ...(command.criterio.origen === "grupo" ? { grupoId: command.criterio.grupoId } : {}),
      descripcion: command.descripcion ?? null,
      fecha: command.fecha,
      corrigeAId: command.corrigeAId ?? null,
      usuarioCreadoPor: command.usuarioId,
    })
    return { id: command.id }
  }

  private async persistAnimalEvent(
    tx: Transaction,
    command: CrearEventoIndividualCommand | CrearHijoEventoGrupalCommand,
  ) {
    assertAllowedData(command)
    await this.validateAnimalScope(tx, command)
    await tx.insert(TABLES[command.evento].table).values({
      ...command.datos,
      id: command.id,
      animalId: command.animalId,
      registroGrupalId: command.tipo === "crear_hijo_grupal" ? command.registroGrupalId : null,
      corrigeAId: command.tipo === "crear_evento_individual" ? (command.corrigeAId ?? null) : null,
      usuarioCreadoPor: command.usuarioId,
    } as never)
    if (["venta", "muerte", "traslado"].includes(command.evento)) {
      await this.reproyectarMovimiento(tx, command.animalId, command.evento === "traslado")
    }
    return { id: command.id }
  }

  private async reproyectarMovimiento(
    tx: Transaction,
    animalId: string,
    reproyectarUbicacion: boolean,
  ): Promise<void> {
    await tx.execute(sql`
      WITH movimientos AS (
        SELECT v.id, 'venta'::text AS tipo, v.fecha FROM ventas v
        LEFT JOIN registros_grupales rg ON rg.id = v.registro_grupal_id
        WHERE v.animal_id = ${animalId} AND v.anulado_en IS NULL
          AND (v.registro_grupal_id IS NULL OR rg.anulado_en IS NULL)
        UNION ALL
        SELECT m.id, 'muerte', m.fecha FROM muertes m
        LEFT JOIN registros_grupales rg ON rg.id = m.registro_grupal_id
        WHERE m.animal_id = ${animalId} AND m.anulado_en IS NULL
          AND (m.registro_grupal_id IS NULL OR rg.anulado_en IS NULL)
        UNION ALL
        SELECT h.id, 'traslado', (h.fecha AT TIME ZONE 'UTC')::date
        FROM animales_ubicacion_historico h
        LEFT JOIN registros_grupales rg ON rg.id = h.registro_grupal_id
        WHERE h.animal_id = ${animalId} AND h.anulado_en IS NULL
          AND (h.registro_grupal_id IS NULL OR rg.anulado_en IS NULL)
      ), ubicaciones AS (
        SELECT h.id, h.potrero_id, h.sector_id, h.lote_id, h.grupo_id,
          (h.fecha AT TIME ZONE 'UTC')::date AS fecha
        FROM animales_ubicacion_historico h
        LEFT JOIN registros_grupales rg ON rg.id = h.registro_grupal_id
        WHERE h.animal_id = ${animalId} AND h.anulado_en IS NULL
          AND (h.registro_grupal_id IS NULL OR rg.anulado_en IS NULL)
      ), ubicacion AS (
        SELECT
          (array_agg(potrero_id ORDER BY fecha DESC, id DESC)
            FILTER (WHERE potrero_id IS NOT NULL))[1] AS potrero_id,
          (array_agg(sector_id ORDER BY fecha DESC, id DESC)
            FILTER (WHERE sector_id IS NOT NULL))[1] AS sector_id,
          (array_agg(lote_id ORDER BY fecha DESC, id DESC)
            FILTER (WHERE lote_id IS NOT NULL))[1] AS lote_id,
          (array_agg(grupo_id ORDER BY fecha DESC, id DESC)
            FILTER (WHERE grupo_id IS NOT NULL))[1] AS grupo_id
        FROM ubicaciones
      )
      UPDATE animales a SET
        estado_animal_key = CASE (SELECT tipo FROM movimientos ORDER BY fecha DESC, id DESC LIMIT 1)
          WHEN 'venta' THEN 1 WHEN 'muerte' THEN 2 ELSE 0 END,
        potrero_id = CASE WHEN ${reproyectarUbicacion} THEN ubicacion.potrero_id ELSE a.potrero_id END,
        sector_id = CASE WHEN ${reproyectarUbicacion} THEN ubicacion.sector_id ELSE a.sector_id END,
        lote_id = CASE WHEN ${reproyectarUbicacion} THEN ubicacion.lote_id ELSE a.lote_id END,
        grupo_id = CASE WHEN ${reproyectarUbicacion} THEN ubicacion.grupo_id ELSE a.grupo_id END,
        updated_at = NOW()
      FROM ubicacion WHERE a.id = ${animalId}
    `)
  }

  private async validateAnimalScope(
    tx: Transaction,
    command: CrearEventoIndividualCommand | CrearHijoEventoGrupalCommand,
  ) {
    const animal = await tx.execute(
      sql`SELECT EXISTS (SELECT 1 FROM animales WHERE id = ${command.animalId} AND finca_id = ${command.fincaId}) AS autorizado`,
    )
    if (!firstBoolean(animal)) throw new EventoForbiddenError("alcance_invalido")
    if (command.tipo === "crear_hijo_grupal") {
      const header = await tx.execute(
        sql`SELECT EXISTS (SELECT 1 FROM registros_grupales WHERE id = ${command.registroGrupalId} AND finca_id = ${command.fincaId} AND tipo_evento = ${EVENTOS_CANONICOS[command.evento].tipoGrupal}) AS autorizado`,
      )
      if (!firstBoolean(header)) throw new EventoForbiddenError("alcance_invalido")
      return
    }
    if (command.corrigeAId) {
      const source = await tx.execute(
        sql`SELECT EXISTS (SELECT 1 FROM ${sql.identifier(TABLES[command.evento].tableName)} evento JOIN animales animal ON animal.id = evento.animal_id WHERE evento.id = ${command.corrigeAId} AND animal.finca_id = ${command.fincaId}) AS autorizado`,
      )
      if (!firstBoolean(source)) throw new EventoForbiddenError("alcance_invalido")
    }
  }

  private async validateHeaderScope(
    tx: Transaction,
    command: Extract<EventoWriteCommand, { tipo: "crear_registro_grupal" }>,
  ) {
    if (command.criterio.origen !== "manual") {
      const [table, id] =
        command.criterio.origen === "lote"
          ? ["lotes", command.criterio.loteId]
          : command.criterio.origen === "potrero"
            ? ["potreros", command.criterio.potreroId]
            : ["grupos", command.criterio.grupoId]
      const criterion = await tx.execute(
        sql`SELECT EXISTS (SELECT 1 FROM ${sql.identifier(table)} WHERE id = ${id} AND finca_id = ${command.fincaId}) AS autorizado`,
      )
      if (!firstBoolean(criterion)) throw new EventoForbiddenError("alcance_invalido")
    }
    if (command.corrigeAId) {
      const source = await tx.execute(
        sql`SELECT EXISTS (SELECT 1 FROM registros_grupales WHERE id = ${command.corrigeAId} AND finca_id = ${command.fincaId}) AS autorizado`,
      )
      if (!firstBoolean(source)) throw new EventoForbiddenError("alcance_invalido")
    }
  }
}

export function createEventoWriteGateway(db: DbClient): EventoWriteGateway {
  return new DrizzleEventoWriteGateway(db)
}

export type ContextoEscrituraEventoInterno = Readonly<{
  fuente: "boundary_autorizado" | "sanidad_validada" | "creacion_animal_autorizada"
  fincaId: string
  usuarioId: string
}>

export function persistirEventoInterno(
  db: DbClient,
  command: EventoWriteCommand,
  contexto: ContextoEscrituraEventoInterno,
) {
  if (contexto.fincaId !== command.fincaId || contexto.usuarioId !== command.usuarioId) {
    throw new EventoForbiddenError("alcance_invalido")
  }
  return new DrizzleEventoWriteGateway(db).persistir(command)
}

export function persistirEventosInternos(
  db: DbClient,
  commands: readonly EventoWriteCommand[],
  contexto: ContextoEscrituraEventoInterno,
  opciones?: { readonly enTransaccion?: (tx: unknown) => Promise<void> },
) {
  for (const command of commands) {
    if (contexto.fincaId !== command.fincaId || contexto.usuarioId !== command.usuarioId) {
      throw new EventoForbiddenError("alcance_invalido")
    }
  }
  const gateway = new DrizzleEventoWriteGateway(db)
  const enTransaccion = opciones?.enTransaccion
  if (enTransaccion) {
    // T-002/D1: ejecutar la persistencia y el callback adicional en la
    // misma transacción para atomicidad (ej: inserción de notificaciones).
    return gateway.persistirLoteConTransaccion(
      commands,
      enTransaccion as (tx: Transaction) => Promise<void>,
    )
  }
  return gateway.persistirLote(commands)
}
