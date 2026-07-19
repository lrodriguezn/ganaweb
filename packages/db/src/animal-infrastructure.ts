import { AsyncLocalStorage } from "node:async_hooks"
import type {
  AnimalRegistro,
  AnimalRepositoryPort,
  AnimalUseCaseDeps,
  ArchivoAnimalPort,
  ColaBinariosPort,
  EntradaOutbox,
  OutboxPort,
  TimelineAnimalPort,
  TransaccionPort,
} from "@ganaweb/aplicacion"
import type { AnimalReferenceCheckerPort, AnimalResumen } from "@ganaweb/aplicacion"
import { and, asc, eq, or } from "drizzle-orm"
import type { ErrorValidacionAnimal } from "@ganaweb/aplicacion"
import type { DbClient } from "./client.js"
import {
  animales,
  animalesCondicionCorporal,
  animalesImagenes,
  animalesUbicacionHistorico,
  aplicacionesSanitarias,
  auditoriaEliminaciones,
  grupos,
  imagenes,
  lotes,
  muertes,
  palpaciones,
  partos,
  partosCrias,
  pesos,
  potreros,
  produccionesLacteas,
  registrosGrupales,
  revisionesVeterinarias,
  sectores,
  servicios,
  syncColaBinaria,
  syncOutbox,
  syncTombstones,
  ventas,
} from "./schema/index.js"

const animalDbContext = new AsyncLocalStorage<DbClient>()

function currentDb(db: DbClient): DbClient {
  return animalDbContext.getStore() ?? db
}

function sexoFromKey(sexoKey: number | null | undefined): AnimalResumen["sexo"] {
  if (sexoKey === 1) return "hembra"
  if (sexoKey === 2) return "pajuela"
  return "macho"
}

function sexoKeyFromSexo(sexo: AnimalResumen["sexo"]): AnimalRegistro["sexoKey"] {
  if (sexo === "hembra") return 1
  if (sexo === "pajuela") return 2
  return 0
}

function estadoFromKey(estadoKey: number | null | undefined): AnimalResumen["estadoActual"] {
  if (estadoKey === 1) return "vendido"
  if (estadoKey === 2) return "muerto"
  return "activo"
}

function saludFromKey(saludKey: number | null | undefined): AnimalResumen["salud"] {
  return saludKey === 1 ? "enfermo" : "sano"
}

function mapAnimalResumen(row: typeof animales.$inferSelect): AnimalResumen {
  return {
    id: row.id,
    fincaId: row.fincaId,
    codigo: row.codigo,
    nombreAnimal: row.nombre ?? "",
    sexo: sexoFromKey(row.sexoKey),
    estadoActual: estadoFromKey(row.estadoAnimalKey),
    salud: saludFromKey(row.saludAnimalKey),
  }
}

function mapAnimalRegistro(row: typeof animales.$inferSelect): AnimalRegistro {
  return {
    id: row.id,
    fincaId: row.fincaId,
    codigo: row.codigo,
    nombre: row.nombre ?? "",
    sexoKey: sexoKeyFromSexo(sexoFromKey(row.sexoKey)),
    version: row.version,
    activo: row.activo === 1,
    estadoActual: estadoFromKey(row.estadoAnimalKey),
    salud: saludFromKey(row.saludAnimalKey),
    ...(row.potreroId ? { potreroId: row.potreroId } : {}),
    ...(row.loteId ? { loteId: row.loteId } : {}),
    usuarioCreadoPor: row.usuarioCreadoPor ?? "",
    creadoEn: row.createdAt,
    fechaNacimiento: row.fechaNacimiento,
    fechaCompra: row.fechaCompra,
  }
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export interface ResumenReferenciasAnimalPersistencia {
  readonly eventCount: number
  readonly offspringCount: number
  readonly blocksCodeChange: boolean
}

type MaybeGroup = { readonly registroGrupalId?: string | null }
type AnimalRow = {
  readonly id: string
  readonly fincaId: string
  readonly madreId?: string | null
  readonly padreId?: string | null
  readonly donadoraId?: string | null
}
type EventRow = { readonly animalId: string } & MaybeGroup
type LocationRow = { readonly animalId: string; readonly motivo?: string | null } & MaybeGroup
type ImageLinkRow = { readonly animalId: string; readonly activo: number }
type RegistroGrupalRow = { readonly id: string; readonly anuladoEn?: Date | string | null }

export interface AnimalReferenceRows {
  readonly animales?: readonly AnimalRow[]
  readonly pesos?: readonly EventRow[]
  readonly servicios?: readonly EventRow[]
  readonly palpaciones?: readonly EventRow[]
  readonly partos?: readonly EventRow[]
  readonly partosCrias?: readonly {
    readonly criaId: string
    readonly registroGrupalId?: string | null
  }[]
  readonly produccionesLacteas?: readonly EventRow[]
  readonly aplicacionesSanitarias?: readonly EventRow[]
  readonly revisionesVeterinarias?: readonly EventRow[]
  readonly condicionesCorporales?: readonly EventRow[]
  readonly ventas?: readonly EventRow[]
  readonly muertes?: readonly EventRow[]
  readonly ubicaciones?: readonly LocationRow[]
  readonly imagenes?: readonly ImageLinkRow[]
  readonly registrosGrupales?: readonly RegistroGrupalRow[]
}

export interface AnimalReferenceQueryInput {
  readonly animalId: string
  readonly fincaId: string
}

export interface AnimalReferenceQueryReader {
  listarReferenciasAnimal(input: AnimalReferenceQueryInput): Promise<
    AnimalReferenceRows & {
      readonly animalId: string
      readonly fincaId: string
    }
  >
}

function isAnnulled(row: MaybeGroup, groups: ReadonlyMap<string, RegistroGrupalRow>): boolean {
  if (!row.registroGrupalId) return false
  return groups.get(row.registroGrupalId)?.anuladoEn != null
}

function countEvents(
  rows: readonly EventRow[] | undefined,
  animalId: string,
  groups: ReadonlyMap<string, RegistroGrupalRow>,
): number {
  return (rows ?? []).filter((row) => row.animalId === animalId && !isAnnulled(row, groups)).length
}

export function resumirReferenciasAnimal(
  input: AnimalReferenceRows & { readonly animalId: string; readonly fincaId: string },
): ResumenReferenciasAnimalPersistencia {
  const groups = new Map((input.registrosGrupales ?? []).map((group) => [group.id, group]))
  const regularEventCount = [
    input.pesos,
    input.servicios,
    input.palpaciones,
    input.partos,
    input.produccionesLacteas,
    input.aplicacionesSanitarias,
    input.revisionesVeterinarias,
    input.condicionesCorporales,
    input.ventas,
    input.muertes,
  ].reduce((total, rows) => total + countEvents(rows, input.animalId, groups), 0)

  const birthEventCount = (input.partosCrias ?? []).filter(
    (row) => row.criaId === input.animalId && !isAnnulled(row, groups),
  ).length
  const blockingLocationCount = (input.ubicaciones ?? []).filter(
    (row) =>
      row.animalId === input.animalId && row.motivo !== "inicial" && !isAnnulled(row, groups),
  ).length
  const offspringCount = (input.animales ?? []).filter(
    (animal) =>
      animal.fincaId === input.fincaId &&
      (animal.madreId === input.animalId ||
        animal.padreId === input.animalId ||
        animal.donadoraId === input.animalId),
  ).length
  const eventCount = regularEventCount + birthEventCount + blockingLocationCount

  return { eventCount, offspringCount, blocksCodeChange: eventCount + offspringCount > 0 }
}

export class DrizzleAnimalReferenceQueryReader implements AnimalReferenceQueryReader {
  constructor(private readonly db: DbClient) {}

  async listarReferenciasAnimal(input: AnimalReferenceQueryInput) {
    const [
      offspring,
      pesosRows,
      serviciosRows,
      palpacionesRows,
      partosRows,
      partosCriasRows,
      produccionesLacteasRows,
      aplicacionesSanitariasRows,
      revisionesVeterinariasRows,
      condicionesCorporalesRows,
      ventasRows,
      muertesRows,
      ubicacionesRows,
      imagenesRows,
      registrosGrupalesRows,
    ] = await Promise.all([
      this.db
        .select({
          id: animales.id,
          fincaId: animales.fincaId,
          madreId: animales.madreId,
          padreId: animales.padreId,
          donadoraId: animales.donadoraId,
        })
        .from(animales)
        .where(
          and(
            eq(animales.fincaId, input.fincaId),
            or(
              eq(animales.madreId, input.animalId),
              eq(animales.padreId, input.animalId),
              eq(animales.donadoraId, input.animalId),
            ),
          ),
        ),
      this.db
        .select({ animalId: pesos.animalId, registroGrupalId: pesos.registroGrupalId })
        .from(pesos)
        .where(eq(pesos.animalId, input.animalId)),
      this.db
        .select({ animalId: servicios.animalId, registroGrupalId: servicios.registroGrupalId })
        .from(servicios)
        .where(eq(servicios.animalId, input.animalId)),
      this.db
        .select({ animalId: palpaciones.animalId, registroGrupalId: palpaciones.registroGrupalId })
        .from(palpaciones)
        .where(eq(palpaciones.animalId, input.animalId)),
      this.db
        .select({ animalId: partos.animalId, registroGrupalId: partos.registroGrupalId })
        .from(partos)
        .where(eq(partos.animalId, input.animalId)),
      this.db
        .select({ criaId: partosCrias.criaId, registroGrupalId: partos.registroGrupalId })
        .from(partosCrias)
        .innerJoin(partos, eq(partos.id, partosCrias.partoId))
        .where(eq(partosCrias.criaId, input.animalId)),
      this.db
        .select({
          animalId: produccionesLacteas.animalId,
          registroGrupalId: produccionesLacteas.registroGrupalId,
        })
        .from(produccionesLacteas)
        .where(eq(produccionesLacteas.animalId, input.animalId)),
      this.db
        .select({
          animalId: aplicacionesSanitarias.animalId,
          registroGrupalId: aplicacionesSanitarias.registroGrupalId,
        })
        .from(aplicacionesSanitarias)
        .where(eq(aplicacionesSanitarias.animalId, input.animalId)),
      this.db
        .select({
          animalId: revisionesVeterinarias.animalId,
          registroGrupalId: revisionesVeterinarias.registroGrupalId,
        })
        .from(revisionesVeterinarias)
        .where(eq(revisionesVeterinarias.animalId, input.animalId)),
      this.db
        .select({ animalId: animalesCondicionCorporal.animalId })
        .from(animalesCondicionCorporal)
        .where(eq(animalesCondicionCorporal.animalId, input.animalId)),
      this.db
        .select({ animalId: ventas.animalId, registroGrupalId: ventas.registroGrupalId })
        .from(ventas)
        .where(eq(ventas.animalId, input.animalId)),
      this.db
        .select({ animalId: muertes.animalId })
        .from(muertes)
        .where(eq(muertes.animalId, input.animalId)),
      this.db
        .select({
          animalId: animalesUbicacionHistorico.animalId,
          motivo: animalesUbicacionHistorico.motivo,
          registroGrupalId: animalesUbicacionHistorico.registroGrupalId,
        })
        .from(animalesUbicacionHistorico)
        .where(eq(animalesUbicacionHistorico.animalId, input.animalId)),
      this.db
        .select({ animalId: animalesImagenes.animalId, activo: animalesImagenes.activo })
        .from(animalesImagenes)
        .where(eq(animalesImagenes.animalId, input.animalId)),
      this.db
        .select({ id: registrosGrupales.id, anuladoEn: registrosGrupales.anuladoEn })
        .from(registrosGrupales)
        .where(eq(registrosGrupales.fincaId, input.fincaId)),
    ])

    return {
      animalId: input.animalId,
      fincaId: input.fincaId,
      animales: offspring,
      pesos: pesosRows,
      servicios: serviciosRows,
      palpaciones: palpacionesRows,
      partos: partosRows,
      partosCrias: partosCriasRows,
      produccionesLacteas: produccionesLacteasRows,
      aplicacionesSanitarias: aplicacionesSanitariasRows,
      revisionesVeterinarias: revisionesVeterinariasRows,
      condicionesCorporales: condicionesCorporalesRows,
      ventas: ventasRows,
      muertes: muertesRows,
      ubicaciones: ubicacionesRows,
      imagenes: imagenesRows,
      registrosGrupales: registrosGrupalesRows,
    }
  }
}

export class DbAnimalReferenceChecker implements AnimalReferenceCheckerPort {
  constructor(private readonly reader: AnimalReferenceQueryReader) {}

  async summarize(
    animalId: string,
    fincaId: string,
  ): Promise<ResumenReferenciasAnimalPersistencia> {
    return resumirReferenciasAnimal(
      await this.reader.listarReferenciasAnimal({ animalId, fincaId }),
    )
  }
}

export function createAnimalReferenceChecker(db: DbClient): AnimalReferenceCheckerPort {
  return new DbAnimalReferenceChecker(new DrizzleAnimalReferenceQueryReader(db))
}

export interface AnimalImageLinkPersistenceRow {
  readonly id: string
  readonly animalId: string
  readonly activo: number
  readonly esPrincipal: number
}

export function marcarPrincipalAnimalImagen(
  links: readonly AnimalImageLinkPersistenceRow[],
  animalId: string,
  linkId: string,
): readonly AnimalImageLinkPersistenceRow[] {
  const selected = links.find((link) => link.id === linkId && link.animalId === animalId)
  if (!selected || selected.activo !== 1) {
    throw new Error("La imagen principal debe ser un vínculo activo del animal.")
  }

  return links.map((link) =>
    link.animalId === animalId ? { ...link, esPrincipal: link.id === linkId ? 1 : 0 } : link,
  )
}

export interface PersistenciaImagenAnimalInput {
  readonly imagenId: string
  readonly linkId: string
  readonly fincaId: string
  readonly animalId: string
  readonly storagePath: string
  readonly mimeType: string
  readonly bytes: number
  readonly width: number
  readonly height: number
  readonly esPrincipal: boolean
  readonly createdAt: Date
}

export function crearPersistenciaImagenAnimal(input: PersistenciaImagenAnimalInput) {
  return {
    imagen: {
      id: input.imagenId,
      fincaId: input.fincaId,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      bytes: input.bytes,
      width: input.width,
      height: input.height,
      metadata: { authenticated: true, publicUrl: null },
      createdAt: input.createdAt,
    },
    link: {
      id: input.linkId,
      fincaId: input.fincaId,
      animalId: input.animalId,
      imagenId: input.imagenId,
      activo: 1,
      esPrincipal: input.esPrincipal ? 1 : 0,
      createdAt: input.createdAt,
    },
  } as const
}

export interface AuditoriaEliminacionAnimalInput {
  readonly id: string
  readonly fincaId: string
  readonly codigo: string
  readonly nombre?: string | null
  readonly usuarioId: string
  readonly dispositivoId?: string | null
  readonly via: "permiso" | "autoservicio"
  readonly createdAt: Date
}

export function crearAuditoriaEliminacionAnimal(input: AuditoriaEliminacionAnimalInput) {
  return Object.freeze({
    id: input.id,
    fincaId: input.fincaId,
    entidad: "animal" as const,
    entidadCodigo: input.codigo,
    entidadResumen: input.nombre ? `${input.codigo} · ${input.nombre}` : input.codigo,
    usuarioId: input.usuarioId,
    dispositivoId: input.dispositivoId ?? null,
    via: input.via,
    createdAt: input.createdAt,
  })
}

export class DrizzleAnimalRepository implements AnimalRepositoryPort {
  constructor(private readonly db: DbClient) {}

  async buscarPorCodigoYFinca(codigo: string, fincaId: string): Promise<AnimalResumen | null> {
    const [row] = await currentDb(this.db)
      .select()
      .from(animales)
      .where(and(eq(animales.fincaId, fincaId), eq(animales.codigo, codigo)))
      .limit(1)
    return row ? mapAnimalResumen(row) : null
  }

  async obtenerPorIdYFinca(animalId: string, fincaId: string): Promise<AnimalRegistro | null> {
    const [row] = await currentDb(this.db)
      .select()
      .from(animales)
      .where(and(eq(animales.id, animalId), eq(animales.fincaId, fincaId)))
      .limit(1)
    return row ? mapAnimalRegistro(row) : null
  }

  async listarPorFinca(fincaId: string): Promise<readonly AnimalRegistro[]> {
    const rows = await currentDb(this.db)
      .select()
      .from(animales)
      .where(eq(animales.fincaId, fincaId))
      .orderBy(asc(animales.codigo))
    return rows.map(mapAnimalRegistro)
  }

  async guardar(animal: AnimalResumen): Promise<void> {
    const persistible = animal as AnimalResumen & {
      readonly usuarioCreadoPor?: string
      readonly creadoEn?: Date
      readonly version?: number
      readonly activo?: boolean
    }
    await currentDb(this.db)
      .insert(animales)
      .values({
        id: animal.id,
        fincaId: animal.fincaId,
        codigo: animal.codigo,
        nombre: animal.nombreAnimal ?? "",
        sexoKey: sexoKeyFromSexo(animal.sexo),
        estadoAnimalKey:
          animal.estadoActual === "activo" ? 0 : animal.estadoActual === "vendido" ? 1 : 2,
        saludAnimalKey: animal.salud === "enfermo" ? 1 : 0,
        activo: persistible.activo === false ? 0 : 1,
        usuarioCreadoPor: persistible.usuarioCreadoPor,
        createdAt: persistible.creadoEn,
        version: persistible.version ?? 1,
        fechaNacimiento: persistible.fechaNacimiento ?? null,
        fechaCompra: persistible.fechaCompra ?? null,
      })
  }

  async actualizar(
    animalId: string,
    fincaId: string,
    cambios: { readonly codigo?: string; readonly versionLeida: number },
  ): Promise<void> {
    await currentDb(this.db)
      .update(animales)
      .set({
        ...(cambios.codigo ? { codigo: cambios.codigo.trim() } : {}),
        version: cambios.versionLeida + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(animales.id, animalId),
          eq(animales.fincaId, fincaId),
          eq(animales.version, cambios.versionLeida),
        ),
      )
  }

  async inactivar(animalId: string, fincaId: string): Promise<void> {
    await currentDb(this.db)
      .update(animales)
      .set({ activo: 0, updatedAt: new Date() })
      .where(and(eq(animales.id, animalId), eq(animales.fincaId, fincaId)))
  }

  async reactivar(animalId: string, fincaId: string, codigo: string): Promise<void> {
    await currentDb(this.db)
      .update(animales)
      .set({ activo: 1, codigo: codigo.trim(), updatedAt: new Date() })
      .where(and(eq(animales.id, animalId), eq(animales.fincaId, fincaId)))
  }

  async eliminarFisico(animalId: string, fincaId: string): Promise<void> {
    await currentDb(this.db)
      .delete(animales)
      .where(and(eq(animales.id, animalId), eq(animales.fincaId, fincaId)))
  }
}

export class DrizzleAnimalMediaRepository implements ArchivoAnimalPort {
  constructor(private readonly db: DbClient) {}

  async listarImagenes(animalId: string, fincaId: string) {
    const rows = await currentDb(this.db)
      .select({
        id: animalesImagenes.id,
        esPrincipal: animalesImagenes.esPrincipal,
      })
      .from(animalesImagenes)
      .innerJoin(imagenes, eq(imagenes.id, animalesImagenes.imagenId))
      .where(
        and(
          eq(animalesImagenes.animalId, animalId),
          eq(imagenes.fincaId, fincaId),
          eq(animalesImagenes.activo, 1),
        ),
      )
      .orderBy(asc(animalesImagenes.createdAt))

    return rows.map((row) => ({
      id: row.id,
      esPrincipal: row.esPrincipal === 1,
      estadoSubida: "pendiente" as const,
    }))
  }

  async vincularImagenPendiente(entrada: {
    readonly id: string
    readonly fincaId: string
    readonly animalId: string
    readonly blobId: string
    readonly mimeType: string
    readonly bytes: number
    readonly esPrincipal: boolean
    readonly estadoSubida: "pendiente"
  }): Promise<void> {
    await currentDb(this.db).insert(imagenes).values({
      id: entrada.blobId,
      fincaId: entrada.fincaId,
      ruta: entrada.blobId,
      nombreOriginal: entrada.blobId,
      mimeType: entrada.mimeType,
      tamanoBytes: entrada.bytes,
    })
    await currentDb(this.db)
      .insert(animalesImagenes)
      .values({
        id: entrada.id,
        animalId: entrada.animalId,
        imagenId: entrada.blobId,
        esPrincipal: entrada.esPrincipal ? 1 : 0,
      })
  }
}

export class DrizzleOutboxRepository implements OutboxPort {
  constructor(private readonly db: DbClient) {}

  async append(evento: EntradaOutbox): Promise<void> {
    await currentDb(this.db)
      .insert(syncOutbox)
      .values({
        id: evento.id,
        fincaId: evento.fincaId,
        dispositivoId: "server",
        tablaDestino: evento.tablaDestino,
        operacion: evento.operacion,
        payload: evento.payload,
        createdAt: new Date(evento.createdAt),
        updatedAt: new Date(evento.createdAt),
      })
  }
}

export class DrizzleBinaryQueueRepository implements ColaBinariosPort {
  constructor(private readonly db: DbClient) {}

  async encolar(entrada: {
    readonly id: string
    readonly fincaId: string
    readonly animalId: string
    readonly blobId: string
    readonly mimeType: string
    readonly bytes: number
  }): Promise<void> {
    await currentDb(this.db).insert(syncColaBinaria).values({
      id: entrada.id,
      fincaId: entrada.fincaId,
      entidad: "animal",
      entidadId: entrada.animalId,
      blobId: entrada.blobId,
      mimeType: entrada.mimeType,
      bytes: entrada.bytes,
    })
  }
}

export class DrizzleAnimalTimelineRepository implements TimelineAnimalPort {
  constructor(private readonly db: DbClient) {}

  async listarPagina(consulta: {
    readonly animalId: string
    readonly fincaId: string
    readonly cursor?: string
    readonly limit: 20
  }) {
    const animal = await new DrizzleAnimalRepository(this.db).obtenerPorIdYFinca(
      consulta.animalId,
      consulta.fincaId,
    )
    return {
      items: animal
        ? [
            {
              id: `${animal.id}-created`,
              fecha: animal.creadoEn.toISOString(),
              titulo: "Animal registrado",
            },
          ]
        : [],
    }
  }
}

export class DrizzleTransactionRunner implements TransaccionPort {
  constructor(private readonly db: DbClient) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => animalDbContext.run(tx as unknown as DbClient, work))
  }
}

function errorUbicacion(
  campo: "potrero_id" | "sector_id" | "lote_id" | "grupo_id",
  detalle: string,
): ErrorValidacionAnimal {
  return { campo, regla: "CA-CRE-008", detalle }
}

export class DrizzleAnimalUbicacionesRepository {
  constructor(private readonly db: DbClient) {}

  async verificarPropiedadEnFinca(entrada: {
    readonly fincaId: string
    readonly potreroId?: string
    readonly sectorId?: string
    readonly loteId?: string
    readonly grupoId?: string
  }): Promise<readonly ErrorValidacionAnimal[]> {
    const db = currentDb(this.db)
    const errores: ErrorValidacionAnimal[] = []

    if (entrada.potreroId !== undefined) {
      const [row] = await db
        .select({ id: potreros.id })
        .from(potreros)
        .where(and(eq(potreros.id, entrada.potreroId), eq(potreros.fincaId, entrada.fincaId)))
        .limit(1)
      if (!row) errores.push(errorUbicacion("potrero_id", "El potrero no pertenece a la finca activa."))
    }
    if (entrada.sectorId !== undefined) {
      const [row] = await db
        .select({ id: sectores.id })
        .from(sectores)
        .where(and(eq(sectores.id, entrada.sectorId), eq(sectores.fincaId, entrada.fincaId)))
        .limit(1)
      if (!row) errores.push(errorUbicacion("sector_id", "El sector no pertenece a la finca activa."))
    }
    if (entrada.loteId !== undefined) {
      const [row] = await db
        .select({ id: lotes.id })
        .from(lotes)
        .where(and(eq(lotes.id, entrada.loteId), eq(lotes.fincaId, entrada.fincaId)))
        .limit(1)
      if (!row) errores.push(errorUbicacion("lote_id", "El lote no pertenece a la finca activa."))
    }
    if (entrada.grupoId !== undefined) {
      const [row] = await db
        .select({ id: grupos.id })
        .from(grupos)
        .where(and(eq(grupos.id, entrada.grupoId), eq(grupos.fincaId, entrada.fincaId)))
        .limit(1)
      if (!row) errores.push(errorUbicacion("grupo_id", "El grupo no pertenece a la finca activa."))
    }

    return errores
  }
}

export function createAnimalUseCaseDeps(db: DbClient): AnimalUseCaseDeps {
  return {
    animales: new DrizzleAnimalRepository(db),
    referencias: createAnimalReferenceChecker(db),
    timeline: new DrizzleAnimalTimelineRepository(db),
    archivos: new DrizzleAnimalMediaRepository(db),
    outbox: new DrizzleOutboxRepository(db),
    colaBinarios: new DrizzleBinaryQueueRepository(db),
    transacciones: new DrizzleTransactionRunner(db),
    auditoriaEliminaciones: {
      async registrar(entrada) {
        await currentDb(db).insert(auditoriaEliminaciones).values(entrada)
      },
    },
    tombstones: {
      async registrar(entrada) {
        await currentDb(db).insert(syncTombstones).values({
          id: entrada.id,
          fincaId: entrada.fincaId,
          tablaDestino: entrada.tablaDestino,
          entidadId: entrada.entidadId,
          payload: entrada.payload,
          createdAt: entrada.createdAt,
        })
      },
    },
    ubicaciones: {
      async registrarInicial(entrada) {
        await currentDb(db).insert(animalesUbicacionHistorico).values({
          id: entrada.id,
          animalId: entrada.animalId,
          potreroId: entrada.potreroId,
          sectorId: entrada.sectorId,
          loteId: entrada.loteId,
          fecha: entrada.createdAt,
          motivo: entrada.motivo,
        })
      },
      async verificarPropiedadEnFinca(entrada) {
        return new DrizzleAnimalUbicacionesRepository(db).verificarPropiedadEnFinca(entrada)
      },
    },
    pesajes: {
      async registrarInicial(entrada) {
        await currentDb(db)
          .insert(pesos)
          .values({
            id: entrada.id,
            animalId: entrada.animalId,
            fecha: toDateOnly(entrada.fecha),
            pesoKg: entrada.pesoKg.toString(),
            createdAt: entrada.createdAt,
          })
      },
    },
  }
}
