"use client"

import { useState } from "react"

import {
  type AnimalCurrentLocation,
  type AnimalFormCatalogOptions,
  type AnimalFormInitialValues,
  AnimalFormScreen,
} from "@ganaweb/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { parseEsCONumber } from "../../../../../../lib/parsers/es-co-number.js"
import {
  type AnimalCatalogs,
  type AnimalSexoCatalog,
  type UpdateAnimalWebInput,
  getAnimalCatalogsAction,
  getAnimalFichaAction,
  getAnimalSexoCatalogAction,
  updateAnimalAction,
} from "../../../../../../server/animal-actions.js"
import { Route as AppRoute } from "../../../../../_app.js"

export const Route = createFileRoute("/_app/fincas/$fincaId/animales/$animalId/editar")({
  component: EditAnimalRoute,
  loader: async ({ params }) => {
    const [data, sexoCatalog, catalogs] = await Promise.all([
      loadEditAnimalInitialValues({ fincaId: params.fincaId, animalId: params.animalId }),
      getAnimalSexoCatalogAction(),
      getAnimalCatalogsAction({
        data: { fincaId: params.fincaId, excludedIds: [params.animalId] },
      }),
    ])
    return { ...data, sexoCatalog, catalogs }
  },
})

interface AnimalFichaLike {
  readonly tipo?: unknown
  readonly animal?: {
    readonly id?: string
    readonly codigoAnimal?: string
    readonly nombreAnimal?: string
    readonly sexo?: "macho" | "hembra" | "pajuela"
    readonly fechaNacimiento?: number | null
    readonly fechaCompra?: number | null
  }
}

export interface EditAnimalLoaderData {
  readonly initialValues: AnimalFormInitialValues
  readonly currentLocation: AnimalCurrentLocation
  readonly sexoCatalog?: AnimalSexoCatalog
  readonly catalogs?: AnimalCatalogs
}

/**
 * Translate the `getAnimalFichaAction` server function's return value into
 * the loader's typed shape. If the ficha is a denial (no_autenticado,
 * permiso_denegado, finca_no_autorizada, animal_no_encontrado, etc.) or
 * the server returned a non-ficha shape, return a minimal demo
 * `initialValues` so the form can render with empty fields rather than
 * crashing. The v1.3 catalog ids (razaId, colorId, etc.) are demo
 * defaults; a per-finca loader will source them from the actual animal
 * record.
 */
export function mapAnimalFichaToLoaderData(ficha: unknown): EditAnimalLoaderData {
  if (!ficha || typeof ficha !== "object") {
    return { initialValues: {}, currentLocation: {} }
  }
  const fichaTyped = ficha as AnimalFichaLike
  if (fichaTyped.tipo !== "ficha") {
    return { initialValues: {}, currentLocation: {} }
  }
  const animal = fichaTyped.animal
  if (!animal) {
    return { initialValues: {}, currentLocation: {} }
  }
  const sexoKey: 0 | 1 | 2 = animal.sexo === "hembra" ? 1 : animal.sexo === "macho" ? 0 : 2
  const epochToIso = (epoch: number | null | undefined) =>
    epoch ? new Date(epoch * 1000).toISOString().slice(0, 10) : ""
  return {
    initialValues: {
      // NOTE: PR 2a locked the form, so `AnimalFormInitialValues` does
      // not declare `codigo` / `nombre` (the form's `renderAnimalFormField`
      // falls through to `<Field defaultValue={...}>` for those two
      // names and the type intentionally omits them). A future PR will
      // extend the form type to pre-populate codigo/nombre on edit.
      sexoKey,
      origen: "nacido_en_finca",
      fechaNacimiento: epochToIso(animal.fechaNacimiento),
      fechaCompra: epochToIso(animal.fechaCompra),
      razaId: "raza-angus",
      colorId: "color-negro",
      calidadId: "calidad-extra",
      lugarCompraId: "lugar-feria-manizales",
      madreId: "",
      padreId: "",
      precioCompra: "",
      pesoCompra: "",
    },
    currentLocation: {
      potrero: "Potrero Norte",
      sector: "Sector Cría",
      lote: "Lote A",
      grupo: "Grupo Hato General",
    },
  }
}

async function loadEditAnimalInitialValues({
  fincaId,
  animalId,
}: {
  readonly fincaId: string
  readonly animalId: string
}): Promise<EditAnimalLoaderData> {
  try {
    const ficha = await getAnimalFichaAction({ data: { fincaId, animalId } })
    return mapAnimalFichaToLoaderData(ficha)
  } catch {
    // A thrown loader (network / harness misconfig) keeps the form
    // mounted with empty fields rather than 500-ing the page.
    return { initialValues: {}, currentLocation: {} }
  }
}

function optionalText(formData: FormData, name: string): string | undefined {
  const value = formData.get(name)
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseOrigen(value: FormDataEntryValue | null): "nacido_en_finca" | "comprado" | undefined {
  if (value === "nacido_en_finca") return "nacido_en_finca"
  if (value === "comprado") return "comprado"
  return undefined
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
 * PR 2b (CA-UPD-001): translate the v1.3 edit form's 11 keys into the
 * dominio's `DatosActualizacionAnimal.cambios` shape. Mirrors the create
 * route's mapper: only non-empty keys are included so the dominio sees
 * "not provided" rather than empty strings (e.g. the CA-UI-007 toggle
 * may have mounted the `comprado` block but left the inputs blank; those
 * values must NOT travel to the harness as empty strings).
 *
 * The 11 v1.3 form keys are:
 *   origen         → cambios.origen
 *   fechaNacimiento→ cambios.fechaNacimiento
 *   fechaCompra    → cambios.fechaCompra
 *   raza           → cambios.razaId
 *   color          → cambios.colorId
 *   calidad        → cambios.calidadId
 *   lugarCompra    → cambios.lugarCompraId
 *   madreId        → cambios.madreId
 *   padreId        → cambios.padreId
 *   precioCompra   → cambios.precioCompra  (es-CO formatted → number)
 *   pesoCompra     → cambios.pesoCompra    (es-CO formatted → number)
 *
 * `versionLeida` and `codigo` are preserved (codigo is the CA-UPD-001
 * immutable-when-animal-has-events field; the form's `currentAnimalId`
 * enables the disable+hint in `AnimalFormScreen`).
 */
export function buildUpdateAnimalInputFromFormData(
  fincaId: string,
  animalId: string,
  formData: FormData,
): UpdateAnimalWebInput {
  const codigo = optionalText(formData, "codigo")
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
    animalId,
    cambios: {
      versionLeida: Number(formData.get("versionLeida") ?? 1),
      ...(codigo ? { codigo } : {}),
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

/**
 * Translate the dominio's `errores` array into the UI's
 * `Record<fieldName, message>` shape at the route boundary. Mirrors
 * `buildCreateAnimalFieldErrors` in `nuevo.tsx` — the dominio's
 * `validarActualizacionAnimal` emits the same `{ campo, detalle }`
 * shape, and the form's `fieldErrors` prop is keyed by the form's
 * `name` attribute. First error wins per field so the user sees the
 * first message the use case raised.
 */
export function buildUpdateAnimalFieldErrors(errores: unknown): Record<string, string> {
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
 * Map the composite loader's AnimalCatalogs to the form's catalog option shape.
 * Mirrors the function in nuevo.tsx — madre/padre carry {value, codigo, nombre}
 * for the ComboboxBuscable.
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
    hierro: extract(catalogs.hierro),
    propietario: extract(catalogs.propietario),
    madre: extractParent(catalogs.madre),
    padre: extractParent(catalogs.padre),
  }
}

function EditAnimalRoute() {
  const { fincaId, animalId } = Route.useParams()
  const navigate = useNavigate()
  const loaderData = Route.useLoaderData() as EditAnimalLoaderData
  const initialValues = loaderData.initialValues
  const currentLocation = loaderData.currentLocation
  const catalogOptions: AnimalFormCatalogOptions = loaderData.catalogs
    ? catalogsToFormOptions(loaderData.catalogs)
    : {}
  const canCreateCatalog = readCanCreateCatalog()
  const catalogOptionsConPermisos: AnimalFormCatalogOptions = {
    ...catalogOptions,
    sexo: loaderData.sexoCatalog?.tipo === "disponible" ? loaderData.sexoCatalog.options : [],
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
      const result = await updateAnimalAction({
        data: buildUpdateAnimalInputFromFormData(fincaId, animalId, formData),
      })
      if (result && typeof result === "object" && "tipo" in result) {
        if (result.tipo === "actualizado") {
          void navigate({ to: `/fincas/${fincaId}/animales` })
          return
        }
        if (result.tipo === "validacion") {
          setFieldErrors(buildUpdateAnimalFieldErrors((result as { errores?: unknown }).errores))
          return
        }
      }
      // Other tipos (permiso_denegado, no_autenticado, no_encontrado, etc.)
      // keep the form mounted and clear any prior field errors.
      setFieldErrors({})
    } catch {
      setFieldErrors({})
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <AnimalFormScreen
        formVariant="edit"
        currentLocation={currentLocation}
        initialValues={initialValues}
        catalogOptions={catalogOptionsConPermisos}
        fieldErrors={fieldErrors}
        onSave={save}
        onCancel={() => history.back()}
        currentAnimalId={animalId}
      />
    </div>
  )
}
