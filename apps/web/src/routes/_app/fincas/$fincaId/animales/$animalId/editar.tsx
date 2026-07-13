import { AnimalFormScreen } from "@ganaweb/ui"
import { createFileRoute } from "@tanstack/react-router"
import {
  type UpdateAnimalWebInput,
  updateAnimalAction,
} from "../../../../../../server/animal-actions.js"

export const Route = createFileRoute("/_app/fincas/$fincaId/animales/$animalId/editar")({
  component: EditAnimalRoute,
})

function readText(formData: FormData, name: string): string | undefined {
  const value = formData.get(name)
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function buildUpdateAnimalInputFromFormData(
  fincaId: string,
  animalId: string,
  formData: FormData,
): UpdateAnimalWebInput {
  const codigo = readText(formData, "codigo")
  return {
    fincaId,
    animalId,
    cambios: {
      versionLeida: Number(formData.get("versionLeida") ?? 1),
      ...(codigo ? { codigo } : {}),
    },
  }
}

function EditAnimalRoute() {
  const { fincaId, animalId } = Route.useParams()
  const save = async (formData: FormData) => {
    await updateAnimalAction({
      data: buildUpdateAnimalInputFromFormData(fincaId, animalId, formData),
    })
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
