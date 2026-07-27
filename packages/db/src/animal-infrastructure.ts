import { AsyncLocalStorage } from "node:async_hooks"
import type {
  AnimalListadoReadPort,
  AnimalListadoReadRequest,
  AnimalListadoReadResult,
  AnimalListadoRow,
  AnimalRegistro,
  AnimalRepositoryPort,
  AnimalUpdateCambios,
  AnimalUseCaseDeps,
  ArchivoAnimalPort,
  ColaBinariosPort,
  EntradaOutbox,
  OutboxPort,
  TimelineAnimalPort,
  TransaccionPort,
} from "@ganaweb/aplicacion"
import type { AnimalReferenceCheckerPort, AnimalResumen } from "@ganaweb/aplicacion"
import type { ErrorValidacionAnimal } from "@ganaweb/aplicacion"
import { type SQL, and, asc, eq, or, sql } from "drizzle-orm"
import { DrizzleAuthRepository } from "./auth-repository.js"
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
    fechaNacimiento: row.fechaNacimiento,
    fechaCompra: row.fechaCompra,
    codigoRfid: row.codigoRfid,
    tipoExplotacionId: row.tipoExplotacionId,
    tatuado: row.tatuado,
    herrado: row.herrado,
    descornado: row.descornado,
    esDeMonta: row.esDeMonta === 1,
    numeroPezones: row.numeroPezones,
    calidadAnimalId: row.calidadAnimalId,
    hierroId: row.hierroId,
    propietarioId: row.propietarioId,
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
    codigoRfid: row.codigoRfid,
    tipoExplotacionId: row.tipoExplotacionId,
    tatuado: row.tatuado,
    herrado: row.herrado,
    descornado: row.descornado,
    esDeMonta: row.esDeMonta === 1,
    numeroPezones: row.numeroPezones,
    calidadAnimalId: row.calidadAnimalId,
    hierroId: row.hierroId,
    propietarioId: row.propietarioId,
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: field mapper with many optional DB columns
function toAnimalRowExtended(extra: {
  readonly razaId?: string | null
  readonly colorId?: string | null
  readonly madreId?: string | null
  readonly padreId?: string | null
  readonly categoriaReproductiva?: string | null
  readonly calidadAnimalId?: string | null
  readonly hierroId?: string | null
  readonly propietarioId?: string | null
  readonly precioCompra?: number | null
  readonly pesoCompra?: number | null
  readonly comentarios?: string | null
  readonly codigoArete?: string | null
  readonly codigoRfid?: string | null
  readonly tipoExplotacionId?: string | null
  readonly tatuado?: boolean
  readonly herrado?: boolean
  readonly descornado?: boolean
  readonly esDeMonta?: boolean | null
  readonly numeroPezones?: number | null
}) {
  return {
    razaId: extra.razaId ?? null,
    colorId: extra.colorId ?? null,
    madreId: extra.madreId ?? null,
    padreId: extra.padreId ?? null,
    categoriaReproductiva: extra.categoriaReproductiva ?? null,
    calidadAnimalId: extra.calidadAnimalId ?? null,
    hierroId: extra.hierroId ?? null,
    propietarioId: extra.propietarioId ?? null,
    precioCompra: extra.precioCompra ?? null,
    pesoCompra: extra.pesoCompra ?? null,
    comentarios: extra.comentarios ?? null,
    codigoArete: extra.codigoArete ?? null,
    codigoRfid: extra.codigoRfid ?? null,
    tipoExplotacionId: extra.tipoExplotacionId ?? null,
    tatuado: extra.tatuado ?? false,
    herrado: extra.herrado ?? false,
    descornado: extra.descornado ?? false,
    esDeMonta: extra.esDeMonta === true ? 1 : extra.esDeMonta === false ? 0 : null,
    numeroPezones: extra.numeroPezones ?? null,
  }
}

function toAnimalRow(
  animal: AnimalResumen,
  extra: {
    readonly usuarioCreadoPor?: string
    readonly creadoEn?: Date
    readonly version?: number
    readonly activo?: boolean
    readonly razaId?: string | null
    readonly colorId?: string | null
    readonly madreId?: string | null
    readonly padreId?: string | null
    readonly categoriaReproductiva?: string | null
    readonly calidadAnimalId?: string | null
    readonly hierroId?: string | null
    readonly propietarioId?: string | null
    readonly precioCompra?: number | null
    readonly pesoCompra?: number | null
    readonly comentarios?: string | null
    readonly codigoArete?: string | null
    readonly codigoRfid?: string | null
    readonly tipoExplotacionId?: string | null
    readonly tatuado?: boolean
    readonly herrado?: boolean
    readonly descornado?: boolean
    readonly esDeMonta?: boolean | null
    readonly numeroPezones?: number | null
  },
): typeof animales.$inferInsert {
  return {
    id: animal.id,
    fincaId: animal.fincaId,
    codigo: animal.codigo,
    nombre: animal.nombreAnimal ?? "",
    sexoKey: sexoKeyFromSexo(animal.sexo),
    estadoAnimalKey:
      animal.estadoActual === "activo" ? 0 : animal.estadoActual === "vendido" ? 1 : 2,
    saludAnimalKey: animal.salud === "enfermo" ? 1 : 0,
    activo: extra.activo === false ? 0 : 1,
    usuarioCreadoPor: extra.usuarioCreadoPor,
    createdAt: extra.creadoEn,
    version: extra.version ?? 1,
    fechaNacimiento: animal.fechaNacimiento ?? null,
    fechaCompra: animal.fechaCompra ?? null,
    ...toAnimalRowExtended(extra),
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: conditional set builder with many optional fields
function buildUpdateSet(cambios: AnimalUpdateCambios) {
  const set: Record<string, unknown> = {
    version: cambios.versionLeida + 1,
    updatedAt: new Date(),
  }
  if (cambios.codigo) set.codigo = cambios.codigo.trim()
  if (cambios.nombre !== undefined) set.nombre = cambios.nombre
  if (cambios.sexoKey !== undefined) set.sexoKey = cambios.sexoKey
  if (cambios.fechaNacimiento !== undefined) set.fechaNacimiento = cambios.fechaNacimiento
  if (cambios.fechaCompra !== undefined) set.fechaCompra = cambios.fechaCompra
  if (cambios.razaId !== undefined) set.razaId = cambios.razaId
  if (cambios.colorId !== undefined) set.colorId = cambios.colorId
  if (cambios.calidadAnimalId !== undefined) set.calidadAnimalId = cambios.calidadAnimalId
  if (cambios.hierroId !== undefined) set.hierroId = cambios.hierroId
  if (cambios.propietarioId !== undefined) set.propietarioId = cambios.propietarioId
  if (cambios.precioCompra !== undefined) set.precioCompra = cambios.precioCompra
  if (cambios.pesoCompra !== undefined) set.pesoCompra = cambios.pesoCompra
  if (cambios.madreId !== undefined) set.madreId = cambios.madreId
  if (cambios.padreId !== undefined) set.padreId = cambios.padreId
  if (cambios.comentarios !== undefined) set.comentarios = cambios.comentarios
  if (cambios.codigoArete !== undefined) set.codigoArete = cambios.codigoArete
  if (cambios.categoriaReproductiva !== undefined)
    set.categoriaReproductiva = cambios.categoriaReproductiva
  if (cambios.codigoRfid !== undefined) set.codigoRfid = cambios.codigoRfid
  if (cambios.tipoExplotacionId !== undefined) set.tipoExplotacionId = cambios.tipoExplotacionId
  if (cambios.tatuado !== undefined) set.tatuado = cambios.tatuado
  if (cambios.herrado !== undefined) set.herrado = cambios.herrado
  if (cambios.descornado !== undefined) set.descornado = cambios.descornado
  if (cambios.esDeMonta !== undefined) set.esDeMonta = cambios.esDeMonta ? 1 : 0
  if (cambios.numeroPezones !== undefined) set.numeroPezones = cambios.numeroPezones
  return set
}

export class AnimalListadoForbiddenError extends Error {
  constructor() {
    super("Animal listing is forbidden")
    this.name = "AnimalListadoForbiddenError"
  }
}

type AnimalListadoDbRow = Record<string, unknown>

const animalListSortColumns: Record<string, SQL> = {
  codigo: sql`a.codigo`,
  nombre: sql`a.nombre`,
  sexoKey: sql`a.sexo_key`,
  razaLabel: sql`raza.nombre`,
  fechaNacimiento: sql`a.fecha_nacimiento`,
  edadAnios: sql`a.fecha_nacimiento`,
  colorLabel: sql`color.nombre`,
  tipoIngresoId: sql`a.tipo_ingreso_id`,
  codigoMadre: sql`a.codigo_madre`,
  nombreMadre: sql`madre.nombre`,
  codigoPadre: sql`a.codigo_padre`,
  nombrePadre: sql`padre.nombre`,
  propietarioLabel: sql`propietario.nombre`,
  hierroLabel: sql`hierro.nombre`,
  numeroPezones: sql`a.numero_pezones`,
  calidadLabel: sql`calidad.nombre`,
  codigoArete: sql`a.codigo_arete`,
  fechaCompra: sql`a.fecha_compra`,
  precioCompra: sql`a.precio_compra`,
  pesoCompraKg: sql`a.peso_compra`,
  tatuado: sql`a.tatuado`,
  herrado: sql`a.herrado`,
  descornado: sql`a.descornado`,
  codigoRfid: sql`a.codigo_rfid`,
  potreroLabel: sql`potrero.nombre`,
  sectorLabel: sql`sector.nombre`,
  loteLabel: sql`lote.nombre`,
  grupoLabel: sql`grupo.nombre`,
  saludKey: sql`a.salud_animal_key`,
  categoriaReproductivaKey: sql`a.categoria_reproductiva`,
  estadoKey: sql`a.estado_animal_key`,
  pesoUltimoKg: sql`ultimo_peso.peso_kg`,
  codigoQr: sql`a.codigo_qr`,
  esDeMonta: sql`a.es_de_monta`,
  tipoExplotacionLabel: sql`tipo_explotacion.nombre`,
}

const animalListFilterColumns: Record<string, SQL> = {
  codigo: sql`a.codigo`,
  nombre: sql`a.nombre`,
  sexoKey: sql`a.sexo_key`,
  razaId: sql`a.raza_id`,
  fechaNacimiento: sql`a.fecha_nacimiento`,
  colorId: sql`a.color_id`,
  tipoIngresoId: sql`a.tipo_ingreso_id`,
  codigoMadre: sql`a.codigo_madre`,
  nombreMadre: sql`madre.nombre`,
  codigoPadre: sql`a.codigo_padre`,
  nombrePadre: sql`padre.nombre`,
  propietarioId: sql`a.propietario_id`,
  hierroId: sql`a.hierro_id`,
  numeroPezones: sql`a.numero_pezones`,
  calidadAnimalId: sql`a.calidad_animal_id`,
  codigoArete: sql`a.codigo_arete`,
  fechaCompra: sql`a.fecha_compra`,
  precioCompra: sql`a.precio_compra`,
  pesoCompraKg: sql`a.peso_compra`,
  tatuado: sql`a.tatuado`,
  herrado: sql`a.herrado`,
  descornado: sql`a.descornado`,
  codigoRfid: sql`a.codigo_rfid`,
  potreroId: sql`a.potrero_id`,
  sectorId: sql`a.sector_id`,
  loteId: sql`a.lote_id`,
  grupoId: sql`a.grupo_id`,
  comentarios: sql`a.comentarios`,
  saludKey: sql`a.salud_animal_key`,
  categoriaReproductivaKey: sql`a.categoria_reproductiva`,
  estadoKey: sql`a.estado_animal_key`,
  pesoUltimoKg: sql`ultimo_peso.peso_kg`,
  codigoQr: sql`a.codigo_qr`,
  esDeMonta: sql`a.es_de_monta`,
  tipoExplotacionId: sql`a.tipo_explotacion_id`,
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null
}

function epochToIsoDate(epoch: unknown): string | null {
  if (epoch === null || epoch === undefined) return null
  const numeric = Number(epoch)
  if (!Number.isFinite(numeric)) return null
  return new Date(numeric * 1000).toISOString().slice(0, 10)
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function isoToEpochStart(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / 1000)
}

function isEpochDateColumn(filterKey: string): boolean {
  return filterKey === "fechaNacimiento" || filterKey === "fechaCompra"
}

function idLabel(id: unknown, label: unknown) {
  const validId = nullableString(id)
  return validId
    ? { id: validId, label: nullableString(label) ?? `Desconocido (${validId})` }
    : null
}

function keyLabel(key: unknown, label: string) {
  return { key: String(key ?? 0), label }
}

function escapeLikeLiteral(value: string): string {
  return value.replaceAll("!", "!!").replaceAll("%", "!%").replaceAll("_", "!_")
}

function normalizedContains(column: SQL, value: string): SQL {
  const pattern = `%${escapeLikeLiteral(value)}%`
  return sql`public.unaccent(pg_catalog.lower(${column})) LIKE public.unaccent(pg_catalog.lower(${pattern})) ESCAPE '!'`
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: maps the fixed 36-field transport contract.
function mapAnimalListadoDbRow(row: AnimalListadoDbRow): AnimalListadoRow {
  const sexoKey = Number(row.sexo_key ?? 0)
  const saludKey = Number(row.salud_animal_key ?? 0)
  const estadoKey = Number(row.estado_animal_key ?? 0)
  const fechaNacimiento = epochToIsoDate(row.fecha_nacimiento)
  const birth = fechaNacimiento ? new Date(`${fechaNacimiento}T00:00:00Z`) : null
  const edadAnios =
    birth && birth <= new Date()
      ? Math.round(((Date.now() - birth.getTime()) / 31557600000) * 10) / 10
      : null
  const pesoKg = nullableNumber(row.peso_kg)
  const pesoFecha = nullableString(row.peso_fecha)
  return {
    id: String(row.id),
    codigo: String(row.codigo),
    nombre: String(row.nombre ?? ""),
    sexo: keyLabel(sexoKey, sexoKey === 1 ? "Hembra" : sexoKey === 2 ? "Pajuela" : "Macho"),
    raza: idLabel(row.raza_id, row.raza_nombre),
    fechaNacimiento,
    edadAnios,
    color: idLabel(row.color_id, row.color_nombre),
    origen:
      row.tipo_ingreso_id === null || row.tipo_ingreso_id === undefined
        ? null
        : {
            id: String(row.tipo_ingreso_id),
            label: nullableString(row.origen_label) ?? `Desconocido (${row.tipo_ingreso_id})`,
          },
    codigoMadre: nullableString(row.codigo_madre),
    nombreMadre: nullableString(row.madre_nombre),
    codigoPadre: nullableString(row.codigo_padre),
    nombrePadre: nullableString(row.padre_nombre),
    propietario: idLabel(row.propietario_id, row.propietario_nombre),
    hierro: idLabel(row.hierro_id, row.hierro_nombre),
    numeroPezones: nullableNumber(row.numero_pezones),
    calidad: idLabel(row.calidad_id, row.calidad_nombre),
    codigoArete: nullableString(row.codigo_arete),
    fechaCompra: epochToIsoDate(row.fecha_compra),
    precioCompra: nullableNumber(row.precio_compra),
    pesoCompraKg: nullableNumber(row.peso_compra),
    tatuado: row.tatuado === true,
    herrado: row.herrado === true,
    descornado: row.descornado === true,
    codigoRfid: nullableString(row.codigo_rfid),
    potrero: idLabel(row.potrero_id, row.potrero_nombre),
    sector: idLabel(row.sector_id, row.sector_nombre),
    lote: idLabel(row.lote_id, row.lote_nombre),
    grupo: idLabel(row.grupo_id, row.grupo_nombre),
    comentarios: nullableString(row.comentarios),
    salud: keyLabel(saludKey, saludKey === 1 ? "Enfermo" : "Sano"),
    categoriaReproductiva: nullableString(row.categoria_reproductiva)
      ? keyLabel(row.categoria_reproductiva, String(row.categoria_reproductiva))
      : null,
    estado: keyLabel(
      estadoKey,
      estadoKey === 1 ? "Vendido" : estadoKey === 2 ? "Muerto" : "Activo",
    ),
    pesoUltimo: pesoKg === null || !pesoFecha ? null : { pesoKg, fecha: pesoFecha },
    codigoQr: nullableString(row.codigo_qr),
    esDeMonta: Number(row.es_de_monta ?? 0) === 1,
    tipoExplotacion: idLabel(row.tipo_explotacion_id, row.tipo_explotacion_nombre),
  }
}

function buildAnimalListadoPredicates(request: AnimalListadoReadRequest): SQL[] {
  const predicates: SQL[] = []
  if (request.q) {
    predicates.push(
      sql`(${normalizedContains(sql`a.codigo`, request.q)} OR ${normalizedContains(sql`a.nombre`, request.q)} OR ${normalizedContains(sql`a.codigo_arete`, request.q)} OR ${normalizedContains(sql`a.codigo_rfid`, request.q)})`,
    )
  }
  for (const filter of request.filters) {
    const column = animalListFilterColumns[filter.key]
    if (!column) throw new Error(`Unsupported animal-list filter: ${filter.key}`)
    if (filter.grammar === "contains") predicates.push(normalizedContains(column, filter.value))
    else if (filter.grammar === "in") {
      const values = filter.value.split(",").map((value) => sql`${value}`)
      predicates.push(sql`${column} IN (${sql.join(values, sql`, `)})`)
    } else if (filter.grammar === "bool")
      predicates.push(sql`${column} = ${filter.value === "true" ? 1 : 0}`)
    else {
      const [min, max] = filter.value.split(",")
      const bounds = isEpochDateColumn(filter.key)
        ? ([isoToEpochStart(min ?? ""), isoToEpochStart(max ?? "")] as const)
        : ([min ?? "", max ?? ""] as const)
      predicates.push(sql`${column} BETWEEN ${bounds[0]} AND ${bounds[1]}`)
    }
  }
  return predicates
}

const animalListadoFrom = sql`
  FROM animales a
  LEFT JOIN config_razas raza ON raza.id = a.raza_id
  LEFT JOIN config_colores color ON color.id = a.color_id
  LEFT JOIN animales madre ON madre.id = a.madre_id
  LEFT JOIN animales padre ON padre.id = a.padre_id
  LEFT JOIN propietarios propietario ON propietario.id = a.propietario_id
  LEFT JOIN hierros hierro ON hierro.id = a.hierro_id
  LEFT JOIN config_calidad_animal calidad ON calidad.id = a.calidad_animal_id
  LEFT JOIN potreros potrero ON potrero.id = a.potrero_id
  LEFT JOIN sectores sector ON sector.id = a.sector_id
  LEFT JOIN lotes lote ON lote.id = a.lote_id
  LEFT JOIN grupos grupo ON grupo.id = a.grupo_id
  LEFT JOIN config_tipos_explotacion tipo_explotacion ON tipo_explotacion.id = a.tipo_explotacion_id
  LEFT JOIN config_key_values origen ON origen.opcion = 'tipo_ingreso' AND origen.key = a.tipo_ingreso_id::text
  LEFT JOIN LATERAL (SELECT peso_kg, fecha FROM pesos WHERE animal_id = a.id ORDER BY fecha DESC, id DESC LIMIT 1) ultimo_peso ON true
`

export class DrizzleAnimalListadoReadModel implements AnimalListadoReadPort {
  lastStatementCount = 0
  constructor(private readonly db: DbClient) {}

  async listar(request: AnimalListadoReadRequest): Promise<AnimalListadoReadResult> {
    const authorization = await new DrizzleAuthRepository(
      currentDb(this.db),
    ).obtenerAutorizacionUsuario(request.usuarioId, request.fincaId)
    if (
      authorization.tipo !== "autorizado" ||
      !authorization.sesion.permisos.some(
        (permission) => permission.modulo === "animales" && permission.accion === "ver",
      )
    )
      throw new AnimalListadoForbiddenError()
    const predicates = buildAnimalListadoPredicates(request)
    const where = sql`WHERE a.finca_id = ${request.fincaId} AND a.activo = 1 ${predicates.length ? sql`AND ${sql.join(predicates, sql` AND `)}` : sql``}`
    const [sortKey = "", direction] = request.sort.split(":")
    const sortColumn = animalListSortColumns[sortKey]
    if (!sortColumn) throw new Error(`Unsupported animal-list sort: ${sortKey}`)
    const order =
      direction === "desc" ? sql`${sortColumn} DESC, a.id ASC` : sql`${sortColumn} ASC, a.id ASC`
    this.lastStatementCount = 0
    const page = await currentDb(this.db).execute(
      sql`SELECT a.*, raza.nombre AS raza_nombre, color.nombre AS color_nombre, madre.nombre AS madre_nombre, padre.nombre AS padre_nombre, propietario.nombre AS propietario_nombre, hierro.nombre AS hierro_nombre, calidad.nombre AS calidad_nombre, potrero.nombre AS potrero_nombre, sector.nombre AS sector_nombre, lote.nombre AS lote_nombre, grupo.nombre AS grupo_nombre, tipo_explotacion.nombre AS tipo_explotacion_nombre, origen.value AS origen_label, ultimo_peso.peso_kg, ultimo_peso.fecha AS peso_fecha ${animalListadoFrom} ${where} ORDER BY ${order} LIMIT ${request.pageSize} OFFSET ${(request.page - 1) * request.pageSize}`,
    )
    this.lastStatementCount += 1
    const filtered = await currentDb(this.db).execute(
      sql`SELECT count(*)::int AS count ${animalListadoFrom} ${where}`,
    )
    this.lastStatementCount += 1
    const unfiltered = await currentDb(this.db).execute(
      sql`SELECT count(*)::int AS count FROM animales WHERE finca_id = ${request.fincaId} AND activo = 1`,
    )
    this.lastStatementCount += 1
    const pageRows = page as AnimalListadoDbRow[]
    const filteredRows = filtered as AnimalListadoDbRow[]
    const unfilteredRows = unfiltered as AnimalListadoDbRow[]
    return {
      data: pageRows.map(mapAnimalListadoDbRow),
      page: request.page,
      pageSize: request.pageSize,
      total: Number(filteredRows[0]?.count ?? 0),
      totalSinFiltro: Number(unfilteredRows[0]?.count ?? 0),
      sort: request.sort,
      cols: request.cols,
    }
  }
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
      readonly razaId?: string | null
      readonly colorId?: string | null
      readonly madreId?: string | null
      readonly padreId?: string | null
      readonly categoriaReproductiva?: string | null
      readonly calidadAnimalId?: string | null
      readonly hierroId?: string | null
      readonly propietarioId?: string | null
      readonly precioCompra?: number | null
      readonly pesoCompra?: number | null
      readonly comentarios?: string | null
      readonly codigoArete?: string | null
      readonly codigoRfid?: string | null
      readonly tipoExplotacionId?: string | null
      readonly tatuado?: boolean
      readonly herrado?: boolean
      readonly descornado?: boolean
      readonly esDeMonta?: boolean | null
      readonly numeroPezones?: number | null
    }
    await currentDb(this.db).insert(animales).values(toAnimalRow(animal, persistible))
  }

  async actualizar(animalId: string, fincaId: string, cambios: AnimalUpdateCambios): Promise<void> {
    await currentDb(this.db)
      .update(animales)
      .set(buildUpdateSet(cambios))
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
      if (!row)
        errores.push(errorUbicacion("potrero_id", "El potrero no pertenece a la finca activa."))
    }
    if (entrada.sectorId !== undefined) {
      const [row] = await db
        .select({ id: sectores.id })
        .from(sectores)
        .where(and(eq(sectores.id, entrada.sectorId), eq(sectores.fincaId, entrada.fincaId)))
        .limit(1)
      if (!row)
        errores.push(errorUbicacion("sector_id", "El sector no pertenece a la finca activa."))
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
