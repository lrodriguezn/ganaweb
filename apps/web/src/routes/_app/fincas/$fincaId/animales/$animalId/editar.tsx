"use client"

import { useState } from "react"

import {
  type AnimalCurrentLocation,
  type AnimalFormCatalogOptions,
  type AnimalFormInitialValues,
  AnimalFormScreen,
  type SelectOption,
} from "@ganaweb/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  CrearMaestroInline,
  type MaestroInlineCreable,
} from "../../../../../../configuracion/crear-maestro-inline.js"
import { formatEsCONumber, parseEsCONumber } from "../../../../../../lib/parsers/es-co-number.js"
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
    readonly razaId?: string | null
    readonly colorId?: string | null
    readonly calidadAnimalId?: string | null
    readonly tipoExplotacionId?: string | null
    readonly hierroId?: string | null
    readonly propietarioId?: string | null
    readonly madreId?: string | null
    readonly padreId?: string | null
    readonly precioCompra?: number | null
    readonly pesoCompra?: number | null
    readonly tipoIngresoId?: number | null
    // Issue #206: columnas reales precargables que faltaban en la cadena
    // ficha → loader (ausente = el animal no tiene el dato).
    readonly codigoArete?: string | null
    readonly comentarios?: string | null
    readonly codigoRfid?: string | null
    readonly tatuado?: boolean | null
    readonly herrado?: boolean | null
    readonly descornado?: boolean | null
    readonly esDeMonta?: boolean | null
    readonly numeroPezones?: number | null
    readonly potrero?: string | null
    readonly sector?: string | null
    readonly lote?: string | null
  }
  readonly resumen?: { readonly grupo?: string | null }
}

export interface EditAnimalLoaderData {
  readonly initialValues: AnimalFormInitialValues
  readonly currentLocation: AnimalCurrentLocation
  readonly sexoCatalog?: AnimalSexoCatalog
  readonly catalogs?: AnimalCatalogs
}

/**
 * Translate the `getAnimalFichaAction` server function's return value into
 * the loader's typed shape (issue #201): the edit form preloads the REAL
 * values of the animal. If the ficha is a denial (no_autenticado,
 * permiso_denegado, finca_no_autorizada, animal_no_encontrado, etc.) or
 * the server returned a non-ficha shape, return empty `initialValues` so
 * the form renders with empty fields rather than crashing.
 *
 * Ausent values stay absent/empty — NEVER fabricated:
 * - `lugarCompraId` is never preloaded: the `animales` table has no
 *   `lugar_compra_id` column (the create flow never persisted it), so any
 *   value here would be invented.
 * - `origen` is not persisted by the web create/edit flows (dominio only
 *   uses it for validation; `tipo_ingreso_id` is written by the seed). It
 *   is derived from real data: `tipo_ingreso_id = 1` or a present
 *   `fecha_compra` → "comprado". Without evidence the safest default is
 *   "nacido_en_finca" (the form's own default; origen never travels to the
 *   update mapper, so it cannot corrupt data).
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: field mapper with many optional real-data fields
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
  const origen: "nacido_en_finca" | "comprado" =
    animal.tipoIngresoId === 1 || animal.fechaCompra != null ? "comprado" : "nacido_en_finca"
  const initialValues: AnimalFormInitialValues = {
    sexoKey,
    origen,
    fechaNacimiento: epochToIso(animal.fechaNacimiento),
    fechaCompra: epochToIso(animal.fechaCompra),
    precioCompra: formatEsCONumber(animal.precioCompra ?? null),
    pesoCompra: formatEsCONumber(animal.pesoCompra ?? null),
    ...(animal.codigoAnimal ? { codigo: animal.codigoAnimal } : {}),
    ...(animal.nombreAnimal ? { nombre: animal.nombreAnimal } : {}),
    ...(animal.razaId ? { razaId: animal.razaId } : {}),
    ...(animal.colorId ? { colorId: animal.colorId } : {}),
    ...(animal.calidadAnimalId ? { calidadId: animal.calidadAnimalId } : {}),
    ...(animal.tipoExplotacionId ? { tipoExplotacionId: animal.tipoExplotacionId } : {}),
    ...(animal.hierroId ? { hierroId: animal.hierroId } : {}),
    ...(animal.propietarioId ? { propietarioId: animal.propietarioId } : {}),
    ...(animal.madreId ? { madreId: animal.madreId } : {}),
    ...(animal.padreId ? { padreId: animal.padreId } : {}),
    ...(animal.codigoRfid ? { codigoRfid: animal.codigoRfid } : {}),
    // Issue #206: codigoArete/comentarios also pre-load their real value.
    ...(animal.codigoArete ? { codigoArete: animal.codigoArete } : {}),
    ...(animal.comentarios ? { comentarios: animal.comentarios } : {}),
    ...(typeof animal.tatuado === "boolean" ? { tatuado: animal.tatuado } : {}),
    ...(typeof animal.herrado === "boolean" ? { herrado: animal.herrado } : {}),
    ...(typeof animal.descornado === "boolean" ? { descornado: animal.descornado } : {}),
    ...(typeof animal.esDeMonta === "boolean" ? { esDeMonta: animal.esDeMonta } : {}),
    ...(typeof animal.numeroPezones === "number" ? { numeroPezones: animal.numeroPezones } : {}),
  }
  const currentLocation: AnimalCurrentLocation = {
    ...(animal.potrero ? { potrero: animal.potrero } : {}),
    ...(animal.sector ? { sector: animal.sector } : {}),
    ...(animal.lote ? { lote: animal.lote } : {}),
    ...(fichaTyped.resumen?.grupo ? { grupo: fichaTyped.resumen.grupo } : {}),
  }
  return { initialValues, currentLocation }
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

/**
 * Issue #206: the form renders each boolean as a hidden input that ALWAYS
 * submits `"true"` or `"false"` (`renderBooleanField` in
 * `packages/ui/src/ganado/animal-crud.tsx` — it is NOT a checkbox). Both
 * values must travel: an explicit `false` is what lets the user uncheck a
 * previously checked box on edit. Anything else → absent.
 */
function parseOptionalBoolean(value: FormDataEntryValue | null): boolean | undefined {
  if (value === "true") return true
  if (value === "false") return false
  return undefined
}

/** Issue #206: `numeroPezones` is a plain text input; empty/NaN stays absent. */
function parseNumeroPezones(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string") return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
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
  tipo_explotacion_id: "tipoExplotacionId",
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
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: field mapper with many optional form fields
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
  const tipoExplotacionId = optionalText(formData, "tipoExplotacionId")
  const lugarCompraId = optionalText(formData, "lugarCompra")
  const madreId = optionalText(formData, "madreId")
  const padreId = optionalText(formData, "padreId")
  const precioCompra = parseEsCONumber(formData.get("precioCompra"))
  const pesoCompra = parseEsCONumber(formData.get("pesoCompra"))
  // Issue #206: the form captures these 10 fields; without the explicit
  // mapping they were silently dropped before reaching the harness.
  const codigoArete = optionalText(formData, "codigoArete")
  const codigoRfid = optionalText(formData, "codigoRfid")
  const hierroId = optionalText(formData, "hierroId")
  const propietarioId = optionalText(formData, "propietarioId")
  const comentarios = optionalText(formData, "comentarios")
  const numeroPezones = parseNumeroPezones(formData.get("numeroPezones"))
  const tatuado = parseOptionalBoolean(formData.get("tatuado"))
  const herrado = parseOptionalBoolean(formData.get("herrado"))
  const descornado = parseOptionalBoolean(formData.get("descornado"))
  const esDeMonta = parseOptionalBoolean(formData.get("esDeMonta"))

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
      ...(tipoExplotacionId ? { tipoExplotacionId } : {}),
      ...(lugarCompraId ? { lugarCompraId } : {}),
      ...(madreId ? { madreId } : {}),
      ...(padreId ? { padreId } : {}),
      ...(precioCompra !== undefined ? { precioCompra } : {}),
      ...(pesoCompra !== undefined ? { pesoCompra } : {}),
      ...(codigoArete ? { codigoArete } : {}),
      ...(codigoRfid ? { codigoRfid } : {}),
      ...(hierroId ? { hierroId } : {}),
      ...(propietarioId ? { propietarioId } : {}),
      ...(comentarios ? { comentarios } : {}),
      ...(numeroPezones !== undefined ? { numeroPezones } : {}),
      // Booleans use `!== undefined` so an explicit false also travels.
      ...(tatuado !== undefined ? { tatuado } : {}),
      ...(herrado !== undefined ? { herrado } : {}),
      ...(descornado !== undefined ? { descornado } : {}),
      ...(esDeMonta !== undefined ? { esDeMonta } : {}),
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
    tipoExplotacion: extract(catalogs.tipoExplotacion),
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
  // CM-043 (issue #150): creación inline de maestros por finca; globales sin
  // creación (CM-025).
  const [maestroInline, setMaestroInline] = useState<MaestroInlineCreable | null>(null)
  const [lugaresCreados, setLugaresCreados] = useState<readonly SelectOption[]>([])
  const [creacionInline, setCreacionInline] = useState<{
    readonly campo: "lugarCompra"
    readonly value: string
  } | null>(null)
  const catalogOptionsConPermisos: AnimalFormCatalogOptions = {
    ...catalogOptions,
    sexo: loaderData.sexoCatalog?.tipo === "disponible" ? loaderData.sexoCatalog.options : [],
    lugarCompra: [...(catalogOptions.lugarCompra ?? []), ...lugaresCreados],
    canCreateCatalog: {
      raza: false,
      color: false,
      calidad: false,
      lugarCompra: canCreateCatalog,
    },
    onCreateCatalog: { lugarCompra: () => setMaestroInline("lugares_compras") },
    ...(creacionInline ? { creacionInline } : {}),
  }
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const save = async (formData: FormData) => {
    try {
      const result = await updateAnimalAction({
        data: buildUpdateAnimalInputFromFormData(fincaId, animalId, formData),
      })
      if (result && typeof result === "object" && "tipo" in result) {
        if (result.tipo === "actualizado") {
          // redesign-ficha-animal: a successful edit returns to the animal's
          // ficha, not the list (spec: Edit Save Returns to Ficha).
          void navigate({ to: `/fincas/${fincaId}/animales/${animalId}` })
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
      {maestroInline ? (
        <CrearMaestroInline
          fincaId={fincaId}
          maestro={maestroInline}
          onCerrar={() => setMaestroInline(null)}
          onCreado={(registro) => {
            setLugaresCreados((previos) => [
              ...previos,
              { value: registro.id, label: registro.nombre },
            ])
            setCreacionInline({ campo: "lugarCompra", value: registro.id })
            setMaestroInline(null)
          }}
        />
      ) : null}
    </div>
  )
}
