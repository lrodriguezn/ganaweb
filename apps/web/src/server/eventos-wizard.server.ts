import { randomUUID } from "node:crypto"

import {
  EventoForbiddenError,
  type EventoWriteCommand,
  type SesionAutorizada,
  anularEvento,
} from "@ganaweb/aplicacion"
import { db } from "@ganaweb/db/client"
import { createEventoWriteGateway } from "@ganaweb/db/evento-write-infrastructure"
import {
  type ContextoEscrituraEventoInterno,
  persistirEventosInternos,
} from "@ganaweb/db/evento-write-infrastructure"
import { sql } from "drizzle-orm"

import { DrizzleAnimalRepository } from "@ganaweb/db/animal-infrastructure"
import { DrizzleCatalogoFincaAdapter } from "@ganaweb/db/catalogo-finca-infrastructure"
import { validarCamposDatosEvento, validarDatosEvento } from "./evento-rules.js"

/**
 * Server functions del shell de captura de eventos (Issue #229, §4
 * EV-CAP-001..005/007).
 *
 * - Reusa la autoridad del boundary transversal de #226: la autorización
 *   (RBAC por dominio, validación de campos, alcance de finca) la enforce el
 *   dominio y la DB en UN solo lugar. El shell es composición pura.
 * - Atomicidad (EV-CAP-005): `persistirEventosInternos` transacciona cabecera
 *   + N hijas efectivas en una sola operación; un fallo de cualquier hija
 *   revierte TODO (la API de gateway ya garantiza rollback de la tx).
 * - RBAC: el server resuelve el dominio del tipo elegido y verifica el
 *   permiso `crear` contra la sesión — fail-closed.
 * - Mapeo HTTP: autorización/alcance → 403, validación de payload → 422,
 *   resto → 500.
 *
 * Patrón de runtime inyectable (`deps`, `getSession`) idéntico a
 * `sanidad-almacen.server.ts` y `animal-actions.server.ts`: el contract test
 * tsx inyecta fakes; el runtime usa el adaptador Drizzle real y la sesión
 * de `auth.ts`.
 */

export interface EventoWizardResultadoIds {
  readonly cabeceraId?: string
  readonly individualId?: string
  readonly hijosIds: readonly string[]
}

export type EventoWizardResultado =
  | { readonly tipo: "capturado"; readonly ids: EventoWizardResultadoIds }
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | { readonly tipo: "permiso_denegado"; readonly permiso: string }
  | {
      readonly tipo: "validacion"
      readonly errores: readonly { campo: string; detalle: string }[]
    }
  | { readonly tipo: "alcance_invalido" }
  | { readonly tipo: "error"; readonly detalle: string }

export interface EventoWizardWebInput {
  readonly fincaId: string
  readonly tipo: string
  readonly alcance:
    | { readonly tipo: "individual"; readonly animalId: string }
    | {
        readonly tipo: "grupal"
        readonly origen: "manual" | "lote" | "potrero" | "grupo"
        readonly loteId?: string
        readonly potreroId?: string
        readonly grupoId?: string
        readonly animalIdsEfectivos: readonly string[]
        readonly excepciones?: Readonly<
          Record<string, Readonly<Record<string, string | number | null>>>
        >
      }
  readonly datos: Readonly<Record<string, string | number | null>>
  readonly corrigeAId?: string
}

const TIPOS_PERMITIDOS = new Set<string>([
  "servicio",
  "palpacion",
  "parto",
  "aplicacion_sanitaria",
  "revision_veterinaria",
  "pesaje",
  "produccion_lactea",
  "condicion_corporal",
  "venta",
  "muerte",
  "traslado",
])

const DOMINIO_POR_TIPO: Readonly<
  Record<string, "reproductivo" | "productivo" | "sanidad" | "movimientos">
> = {
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

const PERMISO_POR_DOMINIO: Readonly<Record<string, string>> = {
  reproductivo: "eventos_reproductivos:crear",
  productivo: "eventos_productivos:crear",
  sanidad: "sanidad:crear",
  movimientos: "movimientos:crear",
}

export type EventoWizardDeps = {
  readonly persistirLote: (
    commands: readonly EventoWriteCommand[],
    contexto: ContextoEscrituraEventoInterno,
  ) => Promise<readonly { readonly id: string }[]>
  readonly getSession: (fincaId?: string) => Promise<SesionAutorizada | null>
  readonly reloj: () => Date
}

export interface EventoAnulacionInput {
  readonly fincaId: string
  readonly evento: string
  readonly objetivo: "individual" | "grupal"
  readonly objetivoId: string
  readonly motivo: string
}

export type EventoAnulacionResultado =
  | { readonly tipo: "ok" }
  | { readonly tipo: "no_autenticado" | "finca_no_autorizada" }
  | { readonly tipo: "permiso_denegado"; readonly permiso: string }
  | { readonly tipo: "validacion"; readonly detalle: string }
  | { readonly tipo: "error"; readonly detalle: string }

export interface EventoAnnulmentDeps {
  readonly anular: (input: {
    readonly sesion: SesionAutorizada
    readonly command: Extract<EventoWriteCommand, { tipo: "anular_evento" }>
  }) => Promise<void>
  readonly getSession: (fincaId?: string) => Promise<SesionAutorizada | null>
  readonly reloj: () => Date
}

export function createEventoAnnulmentDeps(): EventoAnnulmentDeps {
  return {
    anular: anularEvento(createEventoWriteGateway(db)),
    getSession: getAuthorizedSession,
    reloj: () => new Date(),
  }
}

export function createEventoAnnulmentHarness(deps: EventoAnnulmentDeps) {
  return {
    async anular(input: EventoAnulacionInput): Promise<EventoAnulacionResultado> {
      const sesion = await deps.getSession(input.fincaId)
      if (!sesion) return { tipo: "no_autenticado" }
      if (sesion.fincaActivaId !== input.fincaId) return { tipo: "finca_no_autorizada" }
      const validacion = validarAnulacionInput(input)
      if (validacion) return validacion
      try {
        await deps.anular({
          sesion,
          command: {
            tipo: "anular_evento",
            id: `an-${randomUUID()}`,
            fincaId: input.fincaId,
            usuarioId: sesion.usuarioId,
            evento: input.evento as EventoWriteCommand["evento"],
            objetivo: input.objetivo,
            objetivoId: input.objetivoId,
            motivo: input.motivo,
            fecha: deps.reloj(),
          },
        })
        return { tipo: "ok" }
      } catch (error) {
        return mapAnulacionError(error)
      }
    },
  }
}

function validarAnulacionInput(
  input: EventoAnulacionInput,
): Extract<EventoAnulacionResultado, { tipo: "validacion" }> | null {
  return !TIPOS_PERMITIDOS.has(input.evento) || !input.objetivoId.trim()
    ? { tipo: "validacion", detalle: "El tipo y el objetivo son obligatorios." }
    : null
}

function mapAnulacionError(error: unknown): EventoAnulacionResultado {
  if (error instanceof EventoForbiddenError && error.motivo === "permiso_denegado") {
    return { tipo: "permiso_denegado", permiso: error.permiso ?? "desconocido" }
  }
  if (error instanceof EventoForbiddenError) return { tipo: "finca_no_autorizada" }
  return { tipo: "error", detalle: error instanceof Error ? error.message : "Fallo desconocido" }
}

export function createEventosWizardDeps(): EventoWizardDeps {
  return {
    persistirLote: (commands, contexto) => persistirEventosInternos(db, commands, contexto),
    getSession: getAuthorizedSession,
    reloj: () => new Date(),
  }
}

export function createEventoWizardActionHarness(deps: EventoWizardDeps) {
  return {
    async capturar(input: EventoWizardWebInput): Promise<EventoWizardResultado> {
      const sesion = await deps.getSession(input.fincaId)
      if (!sesion) return { tipo: "no_autenticado" }
      if (sesion.fincaActivaId !== input.fincaId) return { tipo: "finca_no_autorizada" }

      if (!TIPOS_PERMITIDOS.has(input.tipo)) {
        return {
          tipo: "validacion",
          errores: [{ campo: "tipo", detalle: `Tipo de evento inválido: ${input.tipo}` }],
        }
      }
      const dominio = DOMINIO_POR_TIPO[input.tipo] ?? undefined
      const permisoRequerido = dominio ? PERMISO_POR_DOMINIO[dominio] : undefined
      if (!dominio || !permisoRequerido) {
        return {
          tipo: "validacion",
          errores: [{ campo: "tipo", detalle: `Sin mapping RBAC para el tipo ${input.tipo}` }],
        }
      }
      if (input.alcance.tipo === "grupal" && INDIVIDUAL_ONLY.has(input.tipo)) {
        return {
          tipo: "validacion",
          errores: [{ campo: "alcance", detalle: `${input.tipo} solo admite alcance individual.` }],
        }
      }
      const tienePermiso = sesion.permisos.some(
        (p) => `${p.modulo}:${p.accion}` === permisoRequerido,
      )
      if (!tienePermiso) {
        return { tipo: "permiso_denegado", permiso: permisoRequerido }
      }

      if (input.alcance.tipo === "individual") {
        const erroresDeDatos = validarDatosEvento(input.tipo, input.datos)
        if (erroresDeDatos.length > 0) return { tipo: "validacion", errores: erroresDeDatos }
        return capturarIndividual(input, sesion, deps)
      }
      return capturarGrupal(input, sesion, deps)
    },
  }
}

async function capturarIndividual(
  input: EventoWizardWebInput,
  sesion: SesionAutorizada,
  deps: EventoWizardDeps,
): Promise<EventoWizardResultado> {
  if (input.alcance.tipo !== "individual") {
    return { tipo: "validacion", errores: [{ campo: "alcance", detalle: "Alcance inválido" }] }
  }
  if (input.alcance.animalId === "") {
    return { tipo: "validacion", errores: [{ campo: "animalId", detalle: "Falta el animal." }] }
  }
  const id = `ev-${randomUUID()}`
  const command: EventoWriteCommand = {
    tipo: "crear_evento_individual",
    id,
    fincaId: input.fincaId,
    usuarioId: sesion.usuarioId,
    evento: input.tipo as EventoWriteCommand["evento"],
    animalId: input.alcance.animalId,
    datos: {
      ...input.datos,
      fecha: input.datos.fecha ?? deps.reloj().toISOString().slice(0, 10),
    },
    ...(input.corrigeAId ? { corrigeAId: input.corrigeAId } : {}),
  }
  try {
    const [result] = await deps.persistirLote([command], {
      fuente: "boundary_autorizado",
      fincaId: input.fincaId,
      usuarioId: sesion.usuarioId,
    })
    if (!result) {
      return { tipo: "error", detalle: "Sin respuesta del gateway" }
    }
    return {
      tipo: "capturado",
      ids: { individualId: result.id, hijosIds: [] },
    }
  } catch (error) {
    return mapBoundaryErrorToResultado(error)
  }
}

async function capturarGrupal(
  input: EventoWizardWebInput,
  sesion: SesionAutorizada,
  deps: EventoWizardDeps,
): Promise<EventoWizardResultado> {
  if (input.alcance.tipo !== "grupal") {
    return { tipo: "validacion", errores: [{ campo: "alcance", detalle: "Alcance inválido" }] }
  }
  if (input.alcance.origen === "lote" && !input.alcance.loteId) {
    return { tipo: "validacion", errores: [{ campo: "loteId", detalle: "Falta el lote." }] }
  }
  if (input.alcance.origen === "potrero" && !input.alcance.potreroId) {
    return { tipo: "validacion", errores: [{ campo: "potreroId", detalle: "Falta el potrero." }] }
  }
  if (input.alcance.origen === "grupo" && !input.alcance.grupoId) {
    return { tipo: "validacion", errores: [{ campo: "grupoId", detalle: "Falta el grupo." }] }
  }
  if (input.alcance.animalIdsEfectivos.length === 0) {
    return {
      tipo: "validacion",
      errores: [
        { campo: "animalIdsEfectivos", detalle: "No hay animales efectivos tras exclusiones." },
      ],
    }
  }
  const alcance = input.alcance
  const validacionDatos = validarDatosGrupales(input.tipo, input.datos, alcance)
  if (validacionDatos.length > 0) return { tipo: "validacion", errores: validacionDatos }
  const cabeceraId = `rg-${randomUUID()}`
  const criterio =
    input.alcance.origen === "manual"
      ? ({ origen: "manual" } as const)
      : input.alcance.origen === "lote"
        ? ({ origen: "lote", loteId: input.alcance.loteId as string } as const)
        : input.alcance.origen === "potrero"
          ? ({ origen: "potrero", potreroId: input.alcance.potreroId as string } as const)
          : ({ origen: "grupo", grupoId: input.alcance.grupoId as string } as const)

  const cabecera: EventoWriteCommand = {
    tipo: "crear_registro_grupal",
    id: cabeceraId,
    fincaId: input.fincaId,
    usuarioId: sesion.usuarioId,
    evento: input.tipo as EventoWriteCommand["evento"],
    totalAnimales: input.alcance.animalIdsEfectivos.length,
    criterio,
    fecha: deps.reloj(),
    ...(input.corrigeAId ? { corrigeAId: input.corrigeAId } : {}),
  }
  const datosHijo = {
    ...input.datos,
    fecha: input.datos.fecha ?? deps.reloj().toISOString().slice(0, 10),
  }
  const hijos: EventoWriteCommand[] = alcance.animalIdsEfectivos.map((animalId) => ({
    tipo: "crear_hijo_grupal",
    id: `ev-${randomUUID()}`,
    fincaId: input.fincaId,
    usuarioId: sesion.usuarioId,
    evento: input.tipo as EventoWriteCommand["evento"],
    animalId,
    registroGrupalId: cabeceraId,
    datos: materializarDatos(datosHijo, alcance.excepciones?.[animalId]),
  }))

  try {
    const results = await deps.persistirLote([cabecera, ...hijos], {
      fuente: "boundary_autorizado",
      fincaId: input.fincaId,
      usuarioId: sesion.usuarioId,
    })
    if (results.length !== hijos.length + 1) {
      return { tipo: "error", detalle: "El gateway no devolvió todos los ids esperados" }
    }
    return {
      tipo: "capturado",
      ids: {
        ...(results[0]?.id ? { cabeceraId: results[0].id } : {}),
        hijosIds: results.slice(1).map((r) => r.id),
      },
    }
  } catch (error) {
    return mapBoundaryErrorToResultado(error)
  }
}

function validarDatosGrupales(
  tipo: string,
  datosComunes: Readonly<Record<string, string | number | null>>,
  alcance: Extract<EventoWizardWebInput["alcance"], { tipo: "grupal" }>,
): readonly { campo: string; detalle: string }[] {
  const excepciones = alcance.excepciones
  if (excepciones !== undefined && (typeof excepciones !== "object" || excepciones === null)) {
    return [{ campo: "excepciones", detalle: "Debe ser un objeto de excepciones por animal." }]
  }
  const idsEfectivos = new Set(alcance.animalIdsEfectivos)
  for (const [animalId, excepcion] of Object.entries(excepciones ?? {})) {
    if (!idsEfectivos.has(animalId)) {
      return [
        {
          campo: `excepciones[${animalId}]`,
          detalle: "El animal no pertenece al alcance efectivo.",
        },
      ]
    }
    if (typeof excepcion !== "object" || excepcion === null || Array.isArray(excepcion)) {
      return [{ campo: `excepciones[${animalId}]`, detalle: "Debe ser un objeto de datos." }]
    }
    const erroresDeContrato = validarCamposDatosEvento(tipo, excepcion, `excepciones[${animalId}].`)
    if (erroresDeContrato.length > 0) return erroresDeContrato
  }
  return alcance.animalIdsEfectivos.flatMap((animalId) =>
    validarDatosEvento(tipo, materializarDatos(datosComunes, excepciones?.[animalId])),
  )
}

const INDIVIDUAL_ONLY = new Set(["parto", "muerte", "condicion_corporal"])

export function materializarDatos(
  datosComunes: Readonly<Record<string, string | number | null>>,
  excepcion: Readonly<Record<string, string | number | null>> | undefined,
): Readonly<Record<string, string | number | null>> {
  if (!excepcion) return datosComunes
  const overrides = Object.fromEntries(
    Object.entries(excepcion).filter(([campo, valor]) => !Object.is(datosComunes[campo], valor)),
  )
  return { ...datosComunes, ...overrides }
}

function mapBoundaryErrorToResultado(error: unknown): EventoWizardResultado {
  if (error instanceof EventoForbiddenError) {
    if (error.motivo === "permiso_denegado") {
      return { tipo: "permiso_denegado", permiso: error.permiso ?? "desconocido" }
    }
    return { tipo: "alcance_invalido" }
  }
  if (error instanceof Error) {
    return { tipo: "error", detalle: error.message }
  }
  return { tipo: "error", detalle: "Fallo desconocido" }
}

/* -------------------------------------------------------------------------- */
/* Runtime: server function + runtime harness                                */
/* -------------------------------------------------------------------------- */

type EventoWizardRuntimeDepsFactory = () => EventoWizardDeps

let eventosWizardRuntimeDepsFactory: EventoWizardRuntimeDepsFactory | null = () =>
  createEventosWizardDeps()

export function configureEventosWizardRuntimeDeps(factory: EventoWizardRuntimeDepsFactory | null) {
  eventosWizardRuntimeDepsFactory = factory
}

export function createEventosWizardRuntimeHarness({
  depsFactory = eventosWizardRuntimeDepsFactory,
  getSession,
}: {
  readonly depsFactory?: EventoWizardRuntimeDepsFactory | null
  readonly getSession?: (fincaId?: string) => Promise<SesionAutorizada | null>
} = {}) {
  const runWithHarness = async <Result>(
    work: (harness: ReturnType<typeof createEventoWizardActionHarness>) => Promise<Result>,
  ) => {
    if (!depsFactory) {
      throw new Error(
        "Eventos wizard persistence adapters are not configured for apps/web. Register real deps with configureEventosWizardRuntimeDeps; demo harnesses are test-only.",
      )
    }
    const baseDeps = depsFactory()
    const deps: EventoWizardDeps = {
      ...baseDeps,
      ...(getSession ? { getSession } : {}),
    }
    return work(createEventoWizardActionHarness(deps))
  }
  return {
    capturar: (input: EventoWizardWebInput) => runWithHarness((harness) => harness.capturar(input)),
  }
}

function _getRuntimeHarness() {
  return createEventosWizardRuntimeHarness()
}
void _getRuntimeHarness

async function getAuthorizedSessionInternal(fincaId?: string): Promise<SesionAutorizada | null> {
  const { getAuthDeps } = await import("./auth-deps.server.js")
  const { readFincaActivaCookie, readSessionToken } = await import("./session-cookie.server.js")
  const { obtenerSesionActual } = await import("@ganaweb/aplicacion")
  const decision = await obtenerSesionActual(getAuthDeps())(
    readSessionToken(),
    null,
    fincaId ?? readFincaActivaCookie(),
  )
  return decision.tipo === "autorizado" ? decision.sesion : null
}

/**
 * Resuelve la sesión autorizable del request actual. Re-exportada para que
 * el módulo público (`eventos-wizard.ts`) la invoque via dynamic import
 * dentro de sus `createServerFn` handlers.
 */
export async function getAuthorizedSession(fincaId?: string): Promise<SesionAutorizada | null> {
  return getAuthorizedSessionInternal(fincaId)
}

/* -------------------------------------------------------------------------- */
/* Loaders: catalogos + animales por origen (Paso 2)                          */
/* -------------------------------------------------------------------------- */

export interface CatalogosAlcanceDto {
  readonly lotes: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
  readonly potreros: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
  readonly grupos: ReadonlyArray<{ readonly id: string; readonly nombre: string }>
}

export interface ListarCatalogosAlcanceResultado {
  readonly tipo: "lista" | "finca_no_autorizada"
  readonly catalogos?: CatalogosAlcanceDto
}

export interface AnimalesPorOrigenDto {
  readonly animales: ReadonlyArray<{ readonly id: string; readonly codigoAnimal: string }>
}

export interface RevisarMembresiaWebInput extends ListarAnimalesPorOrigenWebInput {
  readonly snapshotIds: readonly string[]
}

export interface RevisarMembresiaResultado {
  readonly estado: "coincide" | "cambio" | "desconocido"
  readonly animales?: ReadonlyArray<{ readonly id: string; readonly codigoAnimal: string }>
  readonly agregados?: ReadonlyArray<{ readonly id: string; readonly codigoAnimal: string }>
  /** Removed members are absent from the current query, so their code may be unavailable. */
  readonly retirados?: ReadonlyArray<{ readonly id: string; readonly codigoAnimal?: string }>
}

export interface ListarAnimalesPorOrigenWebInput {
  readonly fincaId: string
  readonly origen: "manual" | "lote" | "potrero" | "grupo"
  readonly id: string
}

function crearAdaptadores() {
  return {
    catalogos: new DrizzleCatalogoFincaAdapter(db),
    animales: new DrizzleAnimalRepository(db),
  }
}

export async function listarCatalogosAlcance(
  fincaId: string,
  sesion: SesionAutorizada | null,
): Promise<ListarCatalogosAlcanceResultado> {
  if (!sesion) return { tipo: "finca_no_autorizada" }
  if (sesion.fincaActivaId !== fincaId) return { tipo: "finca_no_autorizada" }
  const { catalogos } = crearAdaptadores()
  const [lotes, potreros, grupos] = await Promise.all([
    catalogos.listarPorFinca(fincaId, "lote"),
    catalogos.listarPorFinca(fincaId, "potrero"),
    catalogos.listarPorFinca(fincaId, "grupo"),
  ])
  return {
    tipo: "lista",
    catalogos: {
      lotes: lotes.map((l) => ({ id: l.id, nombre: l.nombre })),
      potreros: potreros.map((p) => ({ id: p.id, nombre: p.nombre })),
      grupos: grupos.map((g) => ({ id: g.id, nombre: g.nombre })),
    },
  }
}

export async function listarAnimalesPorOrigen(
  input: ListarAnimalesPorOrigenWebInput,
  sesion: SesionAutorizada | null,
): Promise<{
  readonly tipo: "lista" | "finca_no_autorizada"
  readonly animales?: ReadonlyArray<{ readonly id: string; readonly codigoAnimal: string }>
}> {
  if (!sesion) return { tipo: "finca_no_autorizada" }
  if (sesion.fincaActivaId !== input.fincaId) return { tipo: "finca_no_autorizada" }
  if (input.origen === "manual") {
    // Manual = todos los animales activos de la finca
    const { animales } = crearAdaptadores()
    const rows = await animales.listarPorFinca(input.fincaId)
    return {
      tipo: "lista",
      animales: rows.filter((r) => r.activo).map((r) => ({ id: r.id, codigoAnimal: r.codigo })),
    }
  }
  // lote | potrero | grupo: SQL directo acotado por finca + id
  const colId =
    input.origen === "lote" ? "lote_id" : input.origen === "potrero" ? "potrero_id" : "grupo_id"
  const tablaId =
    input.origen === "lote" ? "lotes" : input.origen === "potrero" ? "potreros" : "grupos"
  // Valida que el criterio pertenece a la finca activa
  const criterio = (await db.execute(
    sql`SELECT EXISTS (SELECT 1 FROM ${sql.identifier(tablaId)} WHERE id = ${input.id} AND finca_id = ${input.fincaId}) AS ok`,
  )) as unknown as Array<{ ok: boolean }>
  const ok = criterio[0]?.ok === true
  if (!ok) return { tipo: "finca_no_autorizada" }
  const result = (await db.execute(
    sql`SELECT a.id, a.codigo FROM animales a
        WHERE a.finca_id = ${input.fincaId} AND a.activo = 1 AND a.${sql.identifier(colId)} = ${input.id}
        ORDER BY a.codigo ASC`,
  )) as Array<{ id: string; codigo: string }>
  return {
    tipo: "lista",
    animales: result.map((r) => ({ id: r.id, codigoAnimal: r.codigo })),
  }
}

export async function revisarMembresiaActual(
  input: RevisarMembresiaWebInput,
  sesion: SesionAutorizada | null,
): Promise<RevisarMembresiaResultado> {
  if (!sesion || sesion.fincaActivaId !== input.fincaId || input.origen === "manual") {
    return { estado: "desconocido" }
  }
  try {
    const actual = await listarAnimalesPorOrigen(input, sesion)
    if (actual.tipo !== "lista" || !actual.animales) return { estado: "desconocido" }
    const snapshot = new Set(input.snapshotIds)
    const actualIds = new Set(actual.animales.map((animal) => animal.id))
    const agregados = actual.animales.filter((animal) => !snapshot.has(animal.id))
    const retirados = input.snapshotIds.filter((id) => !actualIds.has(id)).map((id) => ({ id }))
    return {
      estado: agregados.length === 0 && retirados.length === 0 ? "coincide" : "cambio",
      animales: actual.animales,
      ...(agregados.length > 0 ? { agregados } : {}),
      ...(retirados.length > 0 ? { retirados } : {}),
    }
  } catch {
    return { estado: "desconocido" }
  }
}

/**
 * Wrapper del lookup por código que el módulo público `eventos-wizard.ts`
 * usa via dynamic import desde su `createServerFn` action. Mantiene la
 * autorización y la búsqueda Drizzle aquí para que la ruta no toque DB.
 */
export async function buscarAnimalPorCodigoEnRuntime(data: {
  fincaId: string
  codigo: string
}): Promise<{ tipo: "encontrado"; id: string; codigoAnimal: string } | { tipo: "no_encontrado" }> {
  const sesion = await getAuthorizedSession(data.fincaId)
  if (!sesion) return { tipo: "no_encontrado" }
  if (sesion.fincaActivaId !== data.fincaId) return { tipo: "no_encontrado" }
  const { animales } = crearAdaptadores()
  const encontrado = await animales.buscarPorCodigoYFinca(data.codigo, data.fincaId)
  if (!encontrado) return { tipo: "no_encontrado" }
  return { tipo: "encontrado", id: encontrado.id, codigoAnimal: encontrado.codigo }
}
