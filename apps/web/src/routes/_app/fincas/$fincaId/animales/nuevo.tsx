"use client"

import { AnimalFormScreen } from "@ganaweb/ui"
import { createFileRoute } from "@tanstack/react-router"
import { getAnimalFormCatalogOptions } from "../../../../../lib/fixtures/animal-form-catalog.js"
import {
  type CreateAnimalWebInput,
  createAnimalAction,
} from "../../../../../server/animal-actions.js"

export const Route = createFileRoute("/_app/fincas/$fincaId/animales/nuevo")({
  component: NewAnimalRoute,
})

function requiredText(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}

function optionalText(formData: FormData, name: string): string | undefined {
  const value = requiredText(formData, name)
  return value.length > 0 ? value : undefined
}

function parseSexoKey(value: FormDataEntryValue | null): 0 | 1 | 2 {
  if (value === "0") return 0
  if (value === "2") return 2
  return 1
}

export function buildCreateAnimalInputFromFormData(
  fincaId: string,
  formData: FormData,
): CreateAnimalWebInput {
  const potreroId = optionalText(formData, "potreroId")
  const sectorId = optionalText(formData, "sectorId")
  const loteId = optionalText(formData, "loteId")
  const grupoId = optionalText(formData, "grupoId")

  return {
    fincaId,
    datos: {
      codigo: requiredText(formData, "codigo"),
      nombre: requiredText(formData, "nombre"),
      sexoKey: parseSexoKey(formData.get("sexoKey")),
      ...(potreroId ? { potreroId } : {}),
      ...(sectorId ? { sectorId } : {}),
      ...(loteId ? { loteId } : {}),
      ...(grupoId ? { grupoId } : {}),
    },
  }
}

function NewAnimalRoute() {
  const { fincaId } = Route.useParams()
  // Demo catalog source. Migrate to a per-finca loader when the
  // master-data tables (origen/potrero/sector/lote/grupo) are wired
  // through a real server function.
  const catalogOptions = getAnimalFormCatalogOptions()
  const save = async (formData: FormData) => {
    try {
      await createAnimalAction({
        data: buildCreateAnimalInputFromFormData(fincaId, formData),
      })
    } finally {
      window.location.assign(`/fincas/${fincaId}/animales`)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="hidden md:block">
        <AnimalFormScreen
          mode="desktop"
          formVariant="create"
          catalogOptions={catalogOptions}
          onSave={save}
          onCancel={() => history.back()}
        />
      </div>
      <div className="md:hidden">
        <AnimalFormScreen
          mode="mobile"
          formVariant="create"
          catalogOptions={catalogOptions}
          onSave={save}
          onCancel={() => history.back()}
        />
      </div>
    </div>
  )
}
