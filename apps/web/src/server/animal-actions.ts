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
