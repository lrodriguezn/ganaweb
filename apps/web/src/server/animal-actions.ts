import { createServerFn } from "@tanstack/react-start"

export interface CreateAnimalWebInput {
  readonly fincaId: string
  readonly datos: {
    readonly codigo: string
    readonly nombre: string
    readonly sexoKey: 0 | 1 | 2
    readonly potreroId?: string
    readonly sectorId?: string
    readonly loteId?: string
    readonly grupoId?: string
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
  readonly cambios: { readonly codigo?: string; readonly versionLeida: number }
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

async function getRuntimeHarness() {
  const { createAnimalRuntimeHarness } = await import("./animal-actions.server.js")
  return createAnimalRuntimeHarness()
}

export const listAnimalsAction = createServerFn({ method: "GET" })
  .validator((data: { fincaId: string }) => data)
  .handler(async ({ data }) => (await getRuntimeHarness()).list(data))

export const getAnimalFichaAction = createServerFn({ method: "GET" })
  .validator((data: AnimalIdWebInput & { cursorTimeline?: string }) => data)
  .handler(async ({ data }) => (await getRuntimeHarness()).ficha(data))

export const createAnimalAction = createServerFn({ method: "POST" })
  .validator((data: CreateAnimalWebInput) => data)
  .handler(async ({ data }) => {
    const { addAnimalE2eRecord, isAnimalE2eEnabled } = await import(
      "./e2e-animals-fixture.server.js"
    )
    if (isAnimalE2eEnabled()) {
      addAnimalE2eRecord({
        fincaId: data.fincaId,
        codigo: data.datos.codigo,
        nombre: data.datos.nombre,
        sexoKey: data.datos.sexoKey,
      })
      return { tipo: "creado" as const }
    }

    const result = await (await getRuntimeHarness()).create(data)
    return result
  })

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
