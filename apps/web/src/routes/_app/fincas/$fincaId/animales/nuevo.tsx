"use client"

import { AnimalFormScreen } from "@ganaweb/ui"
import { createFileRoute } from "@tanstack/react-router"
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

function parseSexoKey(value: FormDataEntryValue | null): 0 | 1 | 2 {
  if (value === "0") return 0
  if (value === "2") return 2
  return 1
}

export function buildCreateAnimalInputFromFormData(
  fincaId: string,
  formData: FormData,
): CreateAnimalWebInput {
  return {
    fincaId,
    datos: {
      codigo: requiredText(formData, "codigo"),
      nombre: requiredText(formData, "nombre"),
      sexoKey: parseSexoKey(formData.get("sexoKey")),
    },
  }
}

function NewAnimalRoute() {
  const { fincaId } = Route.useParams()
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
        <AnimalFormScreen mode="desktop" onSave={save} onCancel={() => history.back()} />
      </div>
      <div className="md:hidden">
        <AnimalFormScreen mode="mobile" onSave={save} onCancel={() => history.back()} />
      </div>
    </div>
  )
}
