"use client"

import { useState } from "react"

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

const CAMPO_TO_FIELD_KEY: Record<string, string> = {
  codigo: "codigo",
  nombre: "nombre",
  sexo_key: "sexoKey",
  fecha_nacimiento: "fechaNacimiento",
  // fecha_compra intentionally absent — R1: no fechaCompra form field, drop per spec line 32.
  madre_id: "madre",
  padre_id: "padre",
}

/**
 * Translate the dominio use case's `errores` array into the UI's
 * `Record<fieldName, message>` shape at the route boundary. The dominio type is not
 * imported here (design R2: the UI package never imports the domain); we only read the
 * `campo` and `detalle` fields off each item, and we guard non-array inputs locally
 * because the use case types `errores: unknown`.
 */
export function buildCreateAnimalFieldErrors(errores: unknown): Record<string, string> {
  if (!Array.isArray(errores)) return {}
  const fieldErrors: Record<string, string> = {}
  for (const error of errores) {
    if (!error || typeof error !== "object") continue
    const campo = (error as { campo?: unknown }).campo
    const detalle = (error as { detalle?: unknown }).detalle
    if (typeof campo !== "string" || typeof detalle !== "string") continue
    const key = CAMPO_TO_FIELD_KEY[campo]
    if (key && fieldErrors[key] === undefined) {
      fieldErrors[key] = detalle
    }
  }
  return fieldErrors
}

function NewAnimalRoute() {
  const { fincaId } = Route.useParams()
  return <NewAnimalRouteView fincaId={fincaId} />
}

export function NewAnimalRouteView({ fincaId }: { readonly fincaId: string }) {
  // Demo catalog source. Migrate to a per-finca loader when the
  // master-data tables (origen/potrero/sector/lote/grupo) are wired
  // through a real server function.
  const catalogOptions = getAnimalFormCatalogOptions()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const save = async (formData: FormData) => {
    try {
      const result = await createAnimalAction({
        data: buildCreateAnimalInputFromFormData(fincaId, formData),
      })
      if (result.tipo === "creado") {
        window.location.assign(`/fincas/${fincaId}/animales`)
        return
      }
      if (result.tipo === "validacion") {
        setFieldErrors(buildCreateAnimalFieldErrors(result.errores))
        return
      }
      // Other tipos (permiso_denegado, no_autenticado, etc.) keep the form mounted
      // and surface a generic banner — banner is out of scope per design.md.
      setFieldErrors({})
    } catch {
      // Thrown errors (network failure, harness crash) keep the form mounted with the
      // submitted values intact. No field error is produced — a generic banner is the
      // intended UX but is out of scope for this change.
      setFieldErrors({})
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="hidden md:block">
        <AnimalFormScreen
          mode="desktop"
          formVariant="create"
          catalogOptions={catalogOptions}
          fieldErrors={fieldErrors}
          onSave={save}
          onCancel={() => history.back()}
        />
      </div>
      <div className="md:hidden">
        <AnimalFormScreen
          mode="mobile"
          formVariant="create"
          catalogOptions={catalogOptions}
          fieldErrors={fieldErrors}
          onSave={save}
          onCancel={() => history.back()}
        />
      </div>
    </div>
  )
}
