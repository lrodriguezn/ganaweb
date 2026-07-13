import type { AnimalReferenceCheckerPort } from "@ganaweb/aplicacion"
import { and, eq, or } from "drizzle-orm"
import type { DbClient } from "./client.js"
import {
  animales,
  animalesCondicionCorporal,
  animalesImagenes,
  animalesUbicacionHistorico,
  aplicacionesSanitarias,
  muertes,
  palpaciones,
  partos,
  partosCrias,
  pesos,
  produccionesLacteas,
  registrosGrupales,
  revisionesVeterinarias,
  servicios,
  ventas,
} from "./schema/index.js"

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
