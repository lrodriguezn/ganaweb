"use client"

import { useState } from "react"

import { AnimalFormScreen } from "@ganaweb/ui"
import type { AnimalFormCatalogOptions } from "@ganaweb/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { parseEsCONumber } from "../../../../../lib/parsers/es-co-number.js"
import {
  type AnimalCatalogs,
  type CreateAnimalWebInput,
  createAnimalAction,
  getAnimalCatalogsAction,
} from "../../../../../server/animal-actions.js"
import { Route as AppRoute } from "../../../../_app.js"

export const Route = createFileRoute("/_app/fincas/$fincaId/animales/nuevo")({
  component: NewAnimalRoute,
  loader: async ({ params }) => {
    const [catalogs] = await Promise.all([
      getAnimalCatalogsAction({ data: { fincaId: params.fincaId } }),
    ])
    return { catalogs }
  },
})

/**
 * CA-UI-002: the "+ Crear nuevo" affordance on Raza / Color / Lugar de
 * compra is gated on the user having `configuracion:crear`. Calidad
 * never exposes the affordance per the v1.3 spec.
 */
function hasConfiguracionCrear(
  permisos: readonly { readonly modulo: string; readonly accion: string }[],
): boolean {
  return permisos.some(
    (permiso) => permiso.modulo === "configuracion" && permiso.accion === "crear",
  )
}

function requiredText(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}

function optionalText(formData: FormData, name: string): string | undefined {
  const value = requiredText(formData, name)
  return value.length > 0 ? value : undefined
}

function parseSexoKey(value: FormDataEntryValue | null): string | null {
  return value === "0" || value === "1" || value === "2" ? value : null
}

function parseOrigen(value: FormDataEntryValue | null): "nacido_en_finca" | "comprado" | undefined {
  if (value === "nacido_en_finca") return "nacido_en_finca"
  if (value === "comprado") return "comprado"
  return undefined
}

export function buildCreateAnimalInputFromFormData(
  fincaId: string,
  formData: FormData,
): CreateAnimalWebInput {
  const potreroId = optionalText(formData, "potreroId")
  const sectorId = optionalText(formData, "sectorId")
  const loteId = optionalText(formData, "loteId")
  const grupoId = optionalText(formData, "grupoId")
  const origen = parseOrigen(formData.get("origen"))
  const fechaNacimiento = optionalText(formData, "fechaNacimiento")
  const fechaCompra = optionalText(formData, "fechaCompra")
  const razaId = optionalText(formData, "raza")
  const colorId = optionalText(formData, "color")
  const calidadId = optionalText(formData, "calidad")
  const lugarCompraId = optionalText(formData, "lugarCompra")
  const madreId = optionalText(formData, "madreId")
  const padreId = optionalText(formData, "padreId")
  const precioCompra = parseEsCONumber(formData.get("precioCompra"))
  const pesoCompra = parseEsCONumber(formData.get("pesoCompra"))

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
      ...(origen ? { origen } : {}),
      ...(fechaNacimiento ? { fechaNacimiento } : {}),
      ...(fechaCompra ? { fechaCompra } : {}),
      ...(razaId ? { razaId } : {}),
      ...(colorId ? { colorId } : {}),
      ...(calidadId ? { calidadId } : {}),
      ...(lugarCompraId ? { lugarCompraId } : {}),
      ...(madreId ? { madreId } : {}),
      ...(padreId ? { padreId } : {}),
      ...(precioCompra !== undefined ? { precioCompra } : {}),
      ...(pesoCompra !== undefined ? { pesoCompra } : {}),
    },
  }
}

const CAMPO_TO_FIELD_KEY: Record<string, string> = {
  codigo: "codigo",
  nombre: "nombre",
  sexo_key: "sexoKey",
  fecha_nacimiento: "fechaNacimiento",
  fecha_compra: "fechaCompra",
  madre_id: "madre",
  padre_id: "padre",
  raza: "raza",
  color: "color",
  calidad: "calidad",
  lugar_compra: "lugarCompra",
  precio_compra: "precioCompra",
  peso_compra: "pesoCompra",
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
  const { catalogs } = Route.useLoaderData()
  return <NewAnimalRouteView fincaId={fincaId} catalogs={catalogs} />
}

/**
 * Read the parent `_app` route context to gate `+ Crear nuevo` on
 * `configuracion:crear`. Wrapped in try/catch so a unit-test render
 * without a `<RouterProvider>` (e.g. `apps/web/tests/animal-create-e2e`)
 * falls back to "all false" instead of crashing the component tree.
 */
function readCanCreateCatalog(): boolean {
  try {
    const { sesion } = AppRoute.useRouteContext()
    return hasConfiguracionCrear(sesion.permisos)
  } catch {
    return false
  }
}

/**
 * PR-5: Transform the composite AnimalCatalogs (from loadAnimalCatalogs) into
 * the AnimalFormCatalogOptions shape that AnimalFormScreen expects.
 * For each catalog: "disponible" → the options array; "no_disponible" → [].
 *
 * Replaces the mock getAnimalFormCatalogOptions() fixture. The mock is
 * retained in animal-form-catalog.ts as a rollback stub (throws in prod).
 */
function catalogsToFormOptions(catalogs: AnimalCatalogs): AnimalFormCatalogOptions {
  const extract = (catalog: {
    tipo: string
    options: readonly { value: string; label: string; meta?: { hex?: string } }[]
  }) => (catalog.tipo === "disponible" ? catalog.options : [])
  const extractParent = (catalog: {
    tipo: string
    options: readonly { value: string; codigo?: string; nombre?: string }[]
  }) =>
    catalog.tipo === "disponible"
      ? catalog.options.map((o) => ({
          value: o.value,
          codigo: o.codigo ?? "",
          nombre: o.nombre ?? "",
        }))
      : []
  return {
    sexo: extract(catalogs.sexo),
    raza: extract(catalogs.raza),
    color: extract(catalogs.color),
    calidad: extract(catalogs.calidad),
    potrero: extract(catalogs.potrero),
    sector: extract(catalogs.sector),
    lote: extract(catalogs.lote),
    grupo: extract(catalogs.grupo),
    lugarCompra: extract(catalogs.lugarCompra),
    madre: extractParent(catalogs.madre),
    padre: extractParent(catalogs.padre),
  }
}

export function NewAnimalRouteView({
  fincaId,
  catalogs,
}: { readonly fincaId: string; readonly catalogs?: AnimalCatalogs }) {
  const navigate = useNavigate()
  // PR-5: real DB catalogs from the composite loader. If catalogs are not
  // available (loader failure), all options default to empty (no_disponible).
  const catalogOptions: AnimalFormCatalogOptions = catalogs ? catalogsToFormOptions(catalogs) : {}
  // The "+ Crear nuevo" affordance on Raza / Color / Lugar de compra is
  // gated on the user having `configuracion:crear`. The parent `_app` route
  // resolves the session in its `beforeLoad`; the canCreateCatalog default
  // stays "all false" so a misconfigured parent never accidentally grants
  // catalog creation. A real loader would read this from the session.
  const canCreateCatalog = readCanCreateCatalog()
  const catalogOptionsConPermisos: AnimalFormCatalogOptions = {
    ...catalogOptions,
    canCreateCatalog: {
      raza: canCreateCatalog,
      color: canCreateCatalog,
      calidad: false,
      lugarCompra: canCreateCatalog,
    },
  }
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const save = async (formData: FormData) => {
    try {
      const result = await createAnimalAction({
        data: buildCreateAnimalInputFromFormData(fincaId, formData),
      })
      if (result.tipo === "creado") {
        void navigate({ to: `/fincas/${fincaId}/animales` })
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
      <AnimalFormScreen
        formVariant="create"
        catalogOptions={catalogOptionsConPermisos}
        fieldErrors={fieldErrors}
        onSave={save}
        onCancel={() => history.back()}
      />
    </div>
  )
}
