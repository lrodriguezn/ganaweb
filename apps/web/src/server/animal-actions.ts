import { createServerFn } from "@tanstack/react-start"

export interface CreateAnimalWebInput {
  readonly fincaId: string
  readonly datos: {
    readonly codigo: string
    readonly nombre: string
    readonly sexoKey: string | null
    readonly potreroId?: string
    readonly sectorId?: string
    readonly loteId?: string
    readonly grupoId?: string
    /**
     * v1.3 (PR 2b) — extended fields. The form submits raw FormData strings
     * for these (id, ISO date, es-CO numeric, segmented-control value). The
     * route mapper normalizes them before they reach the harness.
     *
     * - `origen` is the segmented-control value (`"nacido_en_finca"` |
     *   `"comprado"`); the mapper translates to the dominio's `tipoIngreso`.
     * - `precioCompra` / `pesoCompra` are es-CO-formatted numbers; the mapper
     *   parses to JS `number`. The harness currently only forwards
     *   `codigo`, `nombre`, `sexoKey` so these are not yet seen by the
     *   dominio — a future PR will extend `pickCreateAnimalDatos`.
     */
    readonly origen?: "nacido_en_finca" | "comprado"
    readonly fechaNacimiento?: string
    readonly fechaCompra?: string
    readonly razaId?: string
    readonly colorId?: string
    readonly calidadId?: string
    readonly hierroId?: string
    readonly propietarioId?: string
    readonly lugarCompraId?: string
    readonly madreId?: string
    readonly padreId?: string
    readonly precioCompra?: number
    readonly pesoCompra?: number
    readonly comentarios?: string
    readonly codigoArete?: string
    readonly codigoRfid?: string
    readonly tipoExplotacionId?: string
    readonly tatuado?: boolean
    readonly herrado?: boolean
    readonly descornado?: boolean
    readonly esDeMonta?: boolean
    readonly numeroPezones?: number
  }
  readonly imagenes?: readonly {
    readonly id: string
    readonly mimeType: string
    readonly bytes: number
  }[]
}

export type AnimalSexoCatalog =
  | {
      readonly tipo: "disponible"
      readonly options: readonly { readonly label: string; readonly value: string }[]
    }
  | { readonly tipo: "no_disponible" }

export interface UpdateAnimalWebInput {
  readonly fincaId: string
  readonly animalId: string
  readonly cambios: {
    readonly codigo?: string
    readonly nombre?: string
    readonly sexoKey?: string | 0 | 1 | 2
    readonly versionLeida: number
    /**
     * v1.3 (PR 2b) — extended edit fields. The form emits the same 11
     * keys as the create form so the create and update routes share a
     * single `buildXxxAnimalInputFromFormData` shape. The dominio's
     * `actualizarAnimal` use case currently only consumes `codigo` and
     * `versionLeida`; the remaining 9 fields are kept in the web
     * contract for form-to-datos symmetry, matching the create route's
     * pattern. See `animal-actions.server.ts:pickUpdateAnimalCambios`.
     */
    readonly origen?: "nacido_en_finca" | "comprado"
    readonly fechaNacimiento?: string
    readonly fechaCompra?: string
    readonly razaId?: string
    readonly colorId?: string
    readonly calidadId?: string
    readonly hierroId?: string
    readonly propietarioId?: string
    readonly lugarCompraId?: string
    readonly madreId?: string
    readonly padreId?: string
    readonly precioCompra?: number
    readonly pesoCompra?: number
    readonly comentarios?: string
    readonly codigoArete?: string
    readonly codigoRfid?: string
    readonly tipoExplotacionId?: string
    readonly tatuado?: boolean
    readonly herrado?: boolean
    readonly descornado?: boolean
    readonly esDeMonta?: boolean
    readonly numeroPezones?: number
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

/**
 * Serializable surface of `harness.create()` — the harness's internal union
 * includes `{ tipo: "validacion"; errores: unknown }` (see
 * `packages/aplicacion/src/casos-uso/animales/index.ts:359`), and `unknown` is
 * not serializable across TanStack Start's `createServerFn` boundary. This local
 * type mirrors the actual JSON-serializable shape: `errores` is always an array
 * of `{ campo, detalle, regla? }` from the dominio use case's
 * `ErrorValidacionAnimal`. Declared here because the web package is forbidden
 * from importing `packages/dominio` directly (dependency-cruiser).
 */
export type CreateAnimalServerResult =
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | { readonly tipo: "no_autorizado" }
  | {
      readonly tipo: "permiso_denegado"
      readonly permiso:
        | "animales:ver"
        | "animales:crear"
        | "animales:editar"
        | "animales:inactivar"
        | "animales:eliminar"
    }
  | {
      readonly tipo: "creado"
      readonly animalId: string
      readonly imagenes?: readonly {
        readonly id: string
        readonly blobId: string
        readonly estadoSubida: "pendiente"
      }[]
    }
  | {
      readonly tipo: "validacion"
      readonly errores: readonly {
        readonly campo: string
        readonly detalle: string
        readonly regla?: string
      }[]
    }
  | { readonly tipo: "transaccion_fallida"; readonly razon: string }

async function getRuntimeHarness() {
  const { createAnimalRuntimeHarness } = await import("./animal-actions.server.js")
  return createAnimalRuntimeHarness()
}

export const listAnimalsAction = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(async ({ data }) => (await getRuntimeHarness()).list(data))

/**
 * Issue #156: client-safe exposure of the mobile animal list first-page
 * resolver (#155 contract) for the route loader. Mirrors the visual-permission
 * action — the handler dynamically imports the server resolver so this module
 * stays bundleable for the client. Fail closed (LM-RBAC-01/02): any denial or
 * failure resolves `{ tipo: "permiso_denegado" }`, never a thrown loader.
 */
export const getAnimalMobileListAction = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(async ({ data }) => {
    const { resolverListadoMobileServer } = await import("./animal-mobile-list.server.js")
    return resolverListadoMobileServer(data.fincaId)
  })

export type { ResultadoListadoMobileServer } from "./animal-mobile-list.server.js"

/**
 * #108 (PR 3): client-safe exposure of the fail-closed visual permission
 * projection for the desktop animal list (LA-RBAC-02/03). Mirrors the
 * `listAnimalsAction` pattern — the handler dynamically imports the server
 * resolver so this module stays bundleable for the client, while the PR 1
 * server-side twin in `animal-actions.server.ts` remains intact. Presentation
 * only (LA-RBAC-05): hides actions, never authorizes a request.
 */
export const getAnimalListadoVisualPermissionsAction = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(async ({ data }) => {
    const { resolverPermisosVisualesListado } = await import(
      "./animal-listado-permissions.server.js"
    )
    return resolverPermisosVisualesListado(data.fincaId)
  })

/**
 * #110 (PR 2): client-safe exposure of the per-user/per-finca animal-list
 * preferences for the route loader. Mirrors the visual-permission action — the
 * handler dynamically imports the server resolver so this module stays
 * bundleable for the client. Fail-closed (PE-001–003): an unauthorized or
 * failed resolution returns `{ tipo: "error" }` and the route uses 29/25
 * defaults with a retryable warning.
 */
export const getAnimalListadoPreferenciasAction = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(async ({ data }) => {
    const { resolverPreferenciasListadoServer } = await import(
      "./animal-list-preferences.server.js"
    )
    return resolverPreferenciasListadoServer(data.fincaId)
  })

export const getAnimalSexoCatalogAction = createServerFn({ method: "GET" }).handler(
  async () => (await (await getRuntimeHarness()).sexoCatalog()) as AnimalSexoCatalog,
)

/**
 * PR-5: Composite catalog action. Loads all 9 catalogs (sexo + 3 maestro +
 * 5 finca-scoped) via Promise.allSettled. Returns AnimalCatalogs with each
 * catalog wrapped in {tipo: "disponible" | "no_disponible"}.
 */
export type { AnimalCatalogResult, AnimalCatalogs } from "./animal-actions.server.js"

export const getAnimalCatalogsAction = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string; excludedIds?: readonly string[] }) => data)
  .handler(async ({ data }) =>
    (await getRuntimeHarness()).allCatalogs(data.fincaId, data.excludedIds),
  )

export const getAnimalFichaAction = createServerFn({ method: "GET" })
  .validator((data: AnimalIdWebInput & { cursorTimeline?: string }) => data)
  .handler(async ({ data }) => (await getRuntimeHarness()).ficha(data))

export const createAnimalAction = createServerFn({ method: "POST" })
  .validator((data: CreateAnimalWebInput) => data)
  .handler(
    async ({ data }) =>
      (await (await getRuntimeHarness()).create(data)) as CreateAnimalServerResult,
  )

export const updateAnimalAction = createServerFn({ method: "POST" })
  .validator((data: UpdateAnimalWebInput) => data)
  .handler(async ({ data }) => (await getRuntimeHarness()).update(data))

export const deleteAnimalAction = createServerFn({ method: "POST" })
  .validator((data: DeleteAnimalWebInput) => data)
  .handler(async ({ data }) => (await getRuntimeHarness()).delete(data))

export const reactivateAnimalAction = createServerFn({ method: "POST" })
  .validator((data: ReactivateAnimalWebInput) => data)
  .handler(async ({ data }) => (await getRuntimeHarness()).reactivate(data))

export const attachAnimalImageAction = createServerFn({ method: "POST" })
  .validator((data: AttachAnimalImageWebInput) => data)
  .handler(async ({ data }) => (await getRuntimeHarness()).attachImage(data))
