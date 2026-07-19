import { randomUUID } from "node:crypto"
import type {
  AnimalRegistro,
  AnimalRepositoryPort,
  AnimalUseCaseDeps,
  CatalogoGlobalPort,
  SesionAnimal,
  SesionAutorizada,
} from "@ganaweb/aplicacion"
import {
  actualizarAnimal,
  crearAnimal,
  eliminarAnimal,
  listarCatalogoSexo,
  obtenerFichaAnimal,
  reactivarAnimal,
  validarImagenesAnimalMutation,
} from "@ganaweb/aplicacion"
import { createAnimalUseCaseDeps } from "@ganaweb/db/animal-infrastructure"
import { DrizzleCatalogoGlobalAdapter } from "@ganaweb/db/catalogo-global-infrastructure"
import { db } from "@ganaweb/db/client"
import type { AnimalListItem, AnimalTimelineItem } from "@ganaweb/ui"
import { createServerFn } from "@tanstack/react-start"
import {
  createAnimalE2eDeps,
  createAnimalE2eCatalogoPort,
  getAnimalE2eSession,
  isAnimalE2eEnabled,
} from "./e2e-animals-fixture.server.js"

type AnimalPermission = "ver" | "crear" | "editar" | "inactivar" | "eliminar"

export type AnimalRouteDenial =
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | { readonly tipo: "permiso_denegado"; readonly permiso: `animales:${AnimalPermission}` }

export interface AnimalRoutePermissions {
  readonly canView: boolean
  readonly canCreate: boolean
  readonly canEdit: boolean
  readonly canInactivate: boolean
  readonly canDelete: boolean
}

export interface AnimalRouteViewModel {
  readonly animales: readonly AnimalListItem[]
  readonly permissions: AnimalRoutePermissions
}

interface AnimalListFilters {
  readonly search?: string
  readonly filters?: {
    readonly salud?: string
    readonly potreroId?: string
    readonly loteId?: string
    readonly categoriaReproductiva?: string
  }
  readonly includeInactive?: boolean
  readonly includeSoldDead?: boolean
}

interface AnimalActionHarnessDeps {
  readonly deps: AnimalUseCaseDeps
  readonly getSession: () => Promise<SesionAutorizada | null>
}

interface AnimalRuntimeHarnessOptions {
  readonly depsFactory?: AnimalRuntimeDepsFactory | null
  readonly getSession?: () => Promise<SesionAutorizada | null>
  readonly catalogoSexo?: CatalogoGlobalPort
}

type AnimalListRepository = AnimalRepositoryPort & {
  readonly listarPorFinca?: (fincaId: string) => Promise<readonly AnimalRegistro[]>
}

export interface CreateAnimalWebInput {
  readonly fincaId: string
  readonly datos: {
    readonly codigo: string
    readonly nombre: string
    readonly sexoKey: string | 0 | 1 | 2 | null
    readonly potreroId?: string
    readonly sectorId?: string
    readonly loteId?: string
    readonly grupoId?: string
    /**
     * v1.3 (PR 2b) — extended fields. The web contract mirrors the fields
     * the form (PR 2a) emits and the dominio's `validarCreacionAnimal`
     * accepts (color, raza, tipoIngreso, fechaNacimiento, fechaCompra,
     * madreId, padreId). The harness's `pickCreateAnimalDatos` forwards
     * the subset the use case can type-check; the rest are kept in the web
     * contract for future PRs and for the form-to-datos symmetry the test
     * exercises.
     */
    readonly origen?: "nacido_en_finca" | "comprado"
    readonly fechaNacimiento?: string
    readonly fechaCompra?: string
    readonly razaId?: string
    readonly colorId?: string
    readonly calidadId?: string
    readonly lugarCompraId?: string
    readonly madreId?: string
    readonly padreId?: string
    readonly precioCompra?: number
    readonly pesoCompra?: number
  }
  readonly imagenes?: readonly {
    readonly id: string
    readonly mimeType: string
    readonly bytes: number
  }[]
}

export interface UpdateAnimalWebInput {
  readonly fincaId: string
  readonly animalId: string
  readonly cambios: {
    readonly codigo?: string
    readonly versionLeida: number
    /**
     * v1.3 (PR 2b) — extended edit fields. The form emits the same 11 keys
     * as the create form. The dominio's `actualizarAnimal` use case
     * currently only consumes `codigo` and `versionLeida`; the remaining 9
     * fields are kept in the web contract so the form-to-datos symmetry
     * the v1.3 spec mandates is honest at the route boundary, and future
     * PRs can extend the dominio without re-shaping the route. The
     * harness's `pickUpdateAnimalCambios` drops them at the boundary.
     */
    readonly origen?: "nacido_en_finca" | "comprado"
    readonly fechaNacimiento?: string
    readonly fechaCompra?: string
    readonly razaId?: string
    readonly colorId?: string
    readonly calidadId?: string
    readonly lugarCompraId?: string
    readonly madreId?: string
    readonly padreId?: string
    readonly precioCompra?: number
    readonly pesoCompra?: number
  }
}

interface AnimalIdWebInput {
  readonly fincaId: string
  readonly animalId: string
}

interface DeleteAnimalWebInput extends AnimalIdWebInput {
  readonly online: boolean
}

interface ReactivateAnimalWebInput extends AnimalIdWebInput {
  readonly codigo: string
}

interface AttachAnimalImageWebInput extends AnimalIdWebInput {
  readonly imagen: {
    readonly id: string
    readonly mimeType: string
    readonly bytes: number
  }
}

export type AnimalRuntimeDepsFactory = () => AnimalUseCaseDeps

let animalRuntimeDepsFactory: AnimalRuntimeDepsFactory | null = () => createAnimalUseCaseDeps(db)

export function configureAnimalRuntimeDeps(factory: AnimalRuntimeDepsFactory | null) {
  animalRuntimeDepsFactory = factory
}

function getConfiguredAnimalDeps(factory: AnimalRuntimeDepsFactory | null): AnimalUseCaseDeps {
  if (isAnimalE2eEnabled()) return createAnimalE2eDeps()
  if (!factory) {
    throw new Error(
      "Animal persistence adapters are not configured for apps/web. Register real AnimalUseCaseDeps with configureAnimalRuntimeDeps; demo harnesses are test-only.",
    )
  }
  return factory()
}

export type AnimalSexoCatalog =
  | { readonly tipo: "disponible"; readonly options: readonly { readonly label: string; readonly value: string }[] }
  | { readonly tipo: "no_disponible" }

export async function loadAnimalSexoCatalog(port: CatalogoGlobalPort): Promise<AnimalSexoCatalog> {
  try {
    const options = await listarCatalogoSexo(port)
    return { tipo: "disponible", options: options.map(({ label, value }) => ({ label, value: String(value) })) }
  } catch {
    return { tipo: "no_disponible" }
  }
}

export async function validateSubmittedSexoKey(value: unknown, port: CatalogoGlobalPort) {
  if (value !== "0" && value !== "1" && value !== "2") return null
  const catalog = await loadAnimalSexoCatalog(port)
  return catalog.tipo === "disponible" && catalog.options.some((option) => option.value === value)
    ? (Number(value) as 0 | 1 | 2)
    : null
}

function getConfiguredAnimalSexoCatalogPort(): CatalogoGlobalPort {
  return isAnimalE2eEnabled() ? createAnimalE2eCatalogoPort() : new DrizzleCatalogoGlobalAdapter(db)
}

function hasAnimalPermission(
  session: SesionAutorizada | SesionAnimal,
  action: AnimalPermission,
): boolean {
  return session.permisos.some(
    (permission) =>
      (permission.modulo === "animales" && permission.accion === action) ||
      (permission.modulo === "*" && permission.accion === "*"),
  )
}

function pickCreateAnimalDatos(datos: CreateAnimalWebInput["datos"]): {
  codigo: string
  nombre: string
  sexoKey: 0 | 1 | 2
  tipoIngreso?: "nacido_en_finca" | "comprado"
  fechaNacimiento?: Date | null
  fechaCompra?: Date | null
  color?: string | null
  raza?: string | null
  madreId?: string | null
  padreId?: string | null
} {
  if (datos.sexoKey !== 0 && datos.sexoKey !== 1 && datos.sexoKey !== 2)
    throw new Error("sexoKey must be revalidated before creating an animal")
  return {
    codigo: datos.codigo,
    nombre: datos.nombre,
    sexoKey: datos.sexoKey,
    ...(datos.origen ? { tipoIngreso: datos.origen } : {}),
    ...(datos.fechaNacimiento ? { fechaNacimiento: new Date(datos.fechaNacimiento) } : {}),
    ...(datos.fechaCompra ? { fechaCompra: new Date(datos.fechaCompra) } : {}),
    ...(datos.razaId ? { raza: datos.razaId } : {}),
    ...(datos.colorId ? { color: datos.colorId } : {}),
    ...(datos.madreId ? { madreId: datos.madreId } : {}),
    ...(datos.padreId ? { padreId: datos.padreId } : {}),
  }
}

/**
 * v1.3 (PR 2b): narrow the wider `UpdateAnimalWebInput.cambios` contract
 * down to the 2 fields the dominio's `actualizarAnimal` use case
 * currently consumes (`codigo` and `versionLeida`). The remaining 9
 * v1.3 fields stay in the web contract for the form-to-datos symmetry
 * the spec mandates; a future PR will extend the dominio to accept
 * them. Mirrors the create route's `pickCreateAnimalDatos` pattern.
 */
function pickUpdateAnimalCambios(cambios: UpdateAnimalWebInput["cambios"]): {
  readonly codigo?: string
  readonly versionLeida: number
} {
  return {
    versionLeida: cambios.versionLeida,
    ...(cambios.codigo ? { codigo: cambios.codigo } : {}),
  }
}

function hasSplitUbicacion(datos: CreateAnimalWebInput["datos"]): boolean {
  return datos.potreroId !== undefined || datos.sectorId !== undefined || datos.loteId !== undefined
}

function buildUbicacionInicial(datos: CreateAnimalWebInput["datos"]): {
  potreroId?: string
  sectorId?: string
  loteId?: string
} {
  return {
    ...(datos.potreroId !== undefined ? { potreroId: datos.potreroId } : {}),
    ...(datos.sectorId !== undefined ? { sectorId: datos.sectorId } : {}),
    ...(datos.loteId !== undefined ? { loteId: datos.loteId } : {}),
  }
}

export function resolveAnimalPermissions(session: SesionAutorizada): AnimalRoutePermissions {
  return {
    canView: hasAnimalPermission(session, "ver"),
    canCreate: hasAnimalPermission(session, "crear"),
    canEdit: hasAnimalPermission(session, "editar"),
    canInactivate: hasAnimalPermission(session, "inactivar"),
    canDelete: hasAnimalPermission(session, "eliminar"),
  }
}

export function denyAnimalRouteAccess(
  session: SesionAutorizada | null,
  fincaId: string,
  action: AnimalPermission,
): AnimalRouteDenial | null {
  if (!session) return { tipo: "no_autenticado" }
  if (session.fincaActivaId !== fincaId) return { tipo: "finca_no_autorizada" }
  if (!hasAnimalPermission(session, action)) {
    return { tipo: "permiso_denegado", permiso: `animales:${action}` }
  }
  return null
}

function toAnimalSession(session: SesionAutorizada): SesionAnimal {
  return {
    usuarioId: session.usuarioId,
    fincaActivaId: session.fincaActivaId,
    permisos: session.permisos,
  }
}

function toAnimalListItem(animal: AnimalRegistro): AnimalListItem {
  return {
    id: animal.id,
    codigoAnimal: animal.codigo,
    nombreAnimal: animal.nombre,
    estadoActual: animal.activo ? (animal.estadoActual ?? "activo") : "vendido",
    salud: "sano",
    sexo: animal.sexoKey === 1 ? "hembra" : animal.sexoKey === 0 ? "macho" : "pajuela",
    categoriaReproductiva: animal.sexoKey === 1 ? "novilla" : "no_aplica",
    fechaNacimiento: animal.fechaNacimiento ?? null,
    fechaCompra: animal.fechaCompra ?? null,
  }
}

function animalMatchesSearch(animal: AnimalRegistro, search?: string): boolean {
  const query = search?.trim().toLowerCase()
  if (!query) return true
  return [animal.codigo, animal.nombre].some((value) => value.toLowerCase().includes(query))
}

function filterAnimalList(
  animals: readonly AnimalRegistro[],
  options: AnimalListFilters,
): readonly AnimalRegistro[] {
  return animals
    .filter((animal) => options.includeInactive || animal.activo)
    .filter(
      (animal) =>
        options.includeSoldDead ||
        animal.estadoActual === undefined ||
        animal.estadoActual === "activo",
    )
    .filter((animal) => animalMatchesSearch(animal, options.search))
    .filter((animal) =>
      options.filters?.salud === undefined ? true : animal.salud === options.filters.salud,
    )
    .filter((animal) =>
      options.filters?.potreroId === undefined
        ? true
        : animal.potreroId === options.filters.potreroId,
    )
    .filter((animal) =>
      options.filters?.loteId === undefined ? true : animal.loteId === options.filters.loteId,
    )
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "es-CO"))
}

function toTimelineItem(item: {
  readonly id: string
  readonly fecha?: string
  readonly titulo?: string
}): AnimalTimelineItem {
  return {
    id: item.id,
    dominio: "manejo",
    tipo: "reubicacion",
    fecha: item.fecha ?? new Date(0).toISOString(),
    titulo: item.titulo ?? "Evento del animal",
  }
}

export function buildAnimalRouteViewModel(input: {
  readonly sesion: SesionAutorizada
  readonly animales: readonly AnimalListItem[]
}): AnimalRouteViewModel {
  return {
    animales: input.animales,
    permissions: resolveAnimalPermissions(input.sesion),
  }
}

export function createAnimalActionHarness({ deps, getSession }: AnimalActionHarnessDeps) {
  return {
    async list(input: { readonly fincaId: string } & AnimalListFilters) {
      const session = await getSession()
      if (!session) return { tipo: "no_autenticado" as const }
      const denied = denyAnimalRouteAccess(session, input.fincaId, "ver")
      if (denied) return denied

      const listed = filterAnimalList(
        await listAnimalsForFinca(deps.animales, input.fincaId),
        input,
      )
      return {
        tipo: "lista" as const,
        ...buildAnimalRouteViewModel({ sesion: session, animales: listed.map(toAnimalListItem) }),
      }
    },

    async ficha(input: AnimalIdWebInput & { readonly cursorTimeline?: string }) {
      const session = await getSession()
      if (!session) return { tipo: "no_autenticado" as const }
      const denied = denyAnimalRouteAccess(session, input.fincaId, "ver")
      if (denied) return denied

      const result = await obtenerFichaAnimal(deps)({
        sesion: toAnimalSession(session),
        animalId: input.animalId,
        ...(input.cursorTimeline ? { cursorTimeline: input.cursorTimeline } : {}),
      })
      if (result.tipo !== "ficha") return result
      return {
        tipo: "ficha" as const,
        animal: toAnimalListItem(result.animal),
        imagenes: result.imagenes,
        genealogia: result.genealogia,
        estadoBanner: result.estadoBanner,
        timeline: {
          items: result.timeline.items.map(toTimelineItem),
          ...(result.timeline.nextCursor ? { nextCursor: result.timeline.nextCursor } : {}),
        },
        permissions: resolveAnimalPermissions(session),
      }
    },

    async create(input: CreateAnimalWebInput) {
      const session = await getSession()
      if (!session) return { tipo: "no_autenticado" as const }
      const denied = denyAnimalRouteAccess(session, input.fincaId, "crear")
      if (denied) return denied

      return crearAnimal(deps)({
        sesion: toAnimalSession(session),
        datos: pickCreateAnimalDatos(input.datos),
        ...(hasSplitUbicacion(input.datos)
          ? { ubicacionInicial: buildUbicacionInicial(input.datos) }
          : {}),
        ...(input.imagenes ? { imagenes: input.imagenes } : {}),
      })
    },

    async update(input: UpdateAnimalWebInput) {
      const session = await getSession()
      if (!session) return { tipo: "no_autenticado" as const }
      const denied = denyAnimalRouteAccess(session, input.fincaId, "editar")
      if (denied) return denied

      const ownsAnimal = await deps.animales.obtenerPorIdYFinca?.(input.animalId, input.fincaId)
      if (!ownsAnimal) return { tipo: "animal_no_encontrado" as const }

      return actualizarAnimal(deps)({
        sesion: toAnimalSession(session),
        animalId: input.animalId,
        cambios: pickUpdateAnimalCambios(input.cambios),
      })
    },

    async delete(input: DeleteAnimalWebInput) {
      const session = await getSession()
      if (!session) return { tipo: "no_autenticado" as const }
      if (session.fincaActivaId !== input.fincaId) return { tipo: "finca_no_autorizada" as const }
      if (!hasAnimalPermission(session, "inactivar") && !hasAnimalPermission(session, "eliminar")) {
        return { tipo: "permiso_denegado" as const, permiso: "animales:inactivar" as const }
      }

      const ownsAnimal = await deps.animales.obtenerPorIdYFinca?.(input.animalId, input.fincaId)
      if (!ownsAnimal) return { tipo: "animal_no_encontrado" as const }

      return eliminarAnimal(deps)({
        sesion: toAnimalSession(session),
        animalId: input.animalId,
        online: input.online,
      })
    },

    async reactivate(input: ReactivateAnimalWebInput) {
      const session = await getSession()
      if (!session) return { tipo: "no_autenticado" as const }
      const denied = denyAnimalRouteAccess(session, input.fincaId, "inactivar")
      if (denied) return denied

      const ownsAnimal = await deps.animales.obtenerPorIdYFinca?.(input.animalId, input.fincaId)
      if (!ownsAnimal) return { tipo: "animal_no_encontrado" as const }

      return reactivarAnimal(deps)({
        sesion: toAnimalSession(session),
        animalId: input.animalId,
        codigo: input.codigo,
      })
    },

    async attachImage(input: AttachAnimalImageWebInput) {
      const session = await getSession()
      if (!session) return { tipo: "no_autenticado" as const }
      const denied = denyAnimalRouteAccess(session, input.fincaId, "editar")
      if (denied) return denied

      const ownsAnimal = await deps.animales.obtenerPorIdYFinca?.(input.animalId, input.fincaId)
      if (!ownsAnimal) return { tipo: "animal_no_encontrado" as const }

      const existingImages = await deps.archivos.listarImagenes(input.animalId, input.fincaId)
      const validacionImagen = validarImagenesAnimalMutation([input.imagen], existingImages.length)
      if (!validacionImagen.valido) {
        return { tipo: "validacion" as const, errores: validacionImagen.errores }
      }
      const imagenId = `imagen-${randomUUID()}`
      await deps.transacciones.run(async () => {
        await deps.archivos.vincularImagenPendiente?.({
          id: imagenId,
          fincaId: input.fincaId,
          animalId: input.animalId,
          blobId: input.imagen.id,
          mimeType: input.imagen.mimeType,
          bytes: input.imagen.bytes,
          esPrincipal: existingImages.length === 0,
          estadoSubida: "pendiente",
        })
        await deps.outbox.append({
          id: `outbox-${randomUUID()}`,
          fincaId: input.fincaId,
          tablaDestino: "animales_imagenes",
          operacion: "INSERT",
          payload: {
            animalId: input.animalId,
            imagenId,
            blobId: input.imagen.id,
            estadoSubida: "pendiente",
          },
          createdAt: new Date().toISOString(),
        })
        await deps.colaBinarios.encolar({
          id: `binario-${randomUUID()}`,
          fincaId: input.fincaId,
          animalId: input.animalId,
          blobId: input.imagen.id,
          mimeType: input.imagen.mimeType,
          bytes: input.imagen.bytes,
        })
      })

      return {
        tipo: "imagen_vinculada" as const,
        imagen: { id: imagenId, blobId: input.imagen.id, estadoSubida: "pendiente" as const },
      }
    },
  }
}

async function listAnimalsForFinca(
  repo: AnimalRepositoryPort,
  fincaId: string,
): Promise<readonly AnimalRegistro[]> {
  const listableRepo = repo as AnimalListRepository
  if (listableRepo.listarPorFinca) {
    return listableRepo.listarPorFinca(fincaId)
  }
  const knownDemo = await Promise.all([
    repo.obtenerPorIdYFinca?.("animal-1", fincaId),
    repo.obtenerPorIdYFinca?.("animal-2", fincaId),
  ])
  return knownDemo.filter((animal): animal is AnimalRegistro => Boolean(animal))
}

async function getAuthorizedSession(): Promise<SesionAutorizada | null> {
  if (isAnimalE2eEnabled()) return getAnimalE2eSession()

  const { getAuthDeps } = await import("./auth-deps.server.js")
  const { readSessionToken } = await import("./session-cookie.server.js")
  const { obtenerSesionActual } = await import("@ganaweb/aplicacion")
  const decision = await obtenerSesionActual(getAuthDeps())(readSessionToken())
  return decision.tipo === "autorizado" ? decision.sesion : null
}

export function createAnimalRuntimeHarness({
  depsFactory = animalRuntimeDepsFactory,
  getSession = getAuthorizedSession,
  catalogoSexo = getConfiguredAnimalSexoCatalogPort(),
}: AnimalRuntimeHarnessOptions = {}) {
  const runWithHarness = async <Result>(
    work: (harness: ReturnType<typeof createAnimalActionHarness>) => Promise<Result>,
  ) => work(createAnimalActionHarness({ deps: getConfiguredAnimalDeps(depsFactory), getSession }))

  return {
    list: (input: { readonly fincaId: string } & AnimalListFilters) =>
      runWithHarness((harness) => harness.list(input)),
    ficha: (input: AnimalIdWebInput & { readonly cursorTimeline?: string }) =>
      runWithHarness((harness) => harness.ficha(input)),
    sexoCatalog: () => loadAnimalSexoCatalog(catalogoSexo),
    create: async (input: CreateAnimalWebInput) => {
      const sexoKey = await validateSubmittedSexoKey(input.datos.sexoKey, catalogoSexo)
      if (sexoKey === null)
        return { tipo: "validacion" as const, errores: [{ campo: "sexo_key", detalle: "El sexo no está disponible." }] }
      return runWithHarness((harness) => harness.create({ ...input, datos: { ...input.datos, sexoKey } }))
    },
    update: (input: UpdateAnimalWebInput) => runWithHarness((harness) => harness.update(input)),
    delete: (input: DeleteAnimalWebInput) => runWithHarness((harness) => harness.delete(input)),
    reactivate: (input: ReactivateAnimalWebInput) =>
      runWithHarness((harness) => harness.reactivate(input)),
    attachImage: (input: AttachAnimalImageWebInput) =>
      runWithHarness((harness) => harness.attachImage(input)),
  }
}

function getRuntimeHarness() {
  return createAnimalRuntimeHarness()
}

export const listAnimalsAction = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string } & AnimalListFilters) => data)
  .handler(({ data }) => getRuntimeHarness().list(data))

export const getAnimalFichaAction = createServerFn({ method: "GET" })
  .validator((data: AnimalIdWebInput & { cursorTimeline?: string }) => data)
  .handler(({ data }) => getRuntimeHarness().ficha(data))

export const createAnimalAction = createServerFn({ method: "POST" })
  .validator((data: CreateAnimalWebInput) => data)
  .handler(async ({ data }) => (await getRuntimeHarness().create(data)) as never)

export const updateAnimalAction = createServerFn({ method: "POST" })
  .validator((data: UpdateAnimalWebInput) => data)
  .handler(({ data }) => getRuntimeHarness().update(data))

export const deleteAnimalAction = createServerFn({ method: "POST" })
  .validator((data: DeleteAnimalWebInput) => data)
  .handler(({ data }) => getRuntimeHarness().delete(data))

export const reactivateAnimalAction = createServerFn({ method: "POST" })
  .validator((data: ReactivateAnimalWebInput) => data)
  .handler(({ data }) => getRuntimeHarness().reactivate(data))

export const attachAnimalImageAction = createServerFn({ method: "POST" })
  .validator((data: AttachAnimalImageWebInput) => data)
  .handler(({ data }) => getRuntimeHarness().attachImage(data))
