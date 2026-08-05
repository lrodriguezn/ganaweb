"use client"

import { useState } from "react"

import { AnimalFormScreen } from "@ganaweb/ui"
import type { AnimalFormCatalogOptions, SelectOption } from "@ganaweb/ui"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  CrearMaestroInline,
  type MaestroInlineCreable,
} from "../../../../../configuracion/crear-maestro-inline.js"
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
 * CA-UI-002 / CM-043 (issue #150): el affordance "+ Crear nuevo" queda
 * limitado a maestros POR FINCA (lugar de compra) y gateado en
 * `configuracion:crear`. Los catálogos globales (raza/color/calidad) NO
 * tienen creación desde la finca (CM-025).
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

type CreateAnimalDatos = CreateAnimalWebInput["datos"]

/**
 * Issue #188: the contract fields the create mapper fills, derived from
 * `CreateAnimalWebInput["datos"]` — a key that does not exist in the
 * contract cannot compile here. The draft below is assigned field by field
 * (no generic `Record<string, string>` spread), so TypeScript's
 * excess-property check catches any phantom key. That spread was the bug's
 * enabling cause: it let the unsuffixed FormData names `raza` / `color` /
 * `calidad` / `tipoExplotacion` / `lugarCompra` leak into `datos`, where
 * `pickCreateAnimalDatos` never reads them, silently dropping the values.
 */
type CreateAnimalMappedField =
  | "codigo"
  | "nombre"
  | "sexoKey"
  | "potreroId"
  | "sectorId"
  | "loteId"
  | "grupoId"
  | "origen"
  | "fechaNacimiento"
  | "fechaCompra"
  | "razaId"
  | "colorId"
  | "calidadId"
  | "tipoExplotacionId"
  | "lugarCompraId"
  | "madreId"
  | "padreId"
  | "precioCompra"
  | "pesoCompra"
  | "codigoArete"
  | "codigoRfid"
  | "hierroId"
  | "propietarioId"
  | "comentarios"
  | "numeroPezones"
  | "tatuado"
  | "herrado"
  | "descornado"
  | "esDeMonta"

type CreateAnimalDatosDraft = {
  readonly [K in CreateAnimalMappedField]: CreateAnimalDatos[K] | undefined
}

/**
 * Drop the draft's `undefined` entries ("field absent in the FormData") so
 * the input keeps the minimal shape the harness expects. Safe by
 * construction: every draft key is a contract key (see
 * `CreateAnimalMappedField`), and the required fields `codigo` / `nombre` /
 * `sexoKey` never arrive as `undefined` from the mapper.
 */
function compactCreateAnimalDatos(draft: CreateAnimalDatosDraft): CreateAnimalDatos {
  const datos: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(draft)) {
    if (value !== undefined) datos[key] = value
  }
  return datos as Partial<CreateAnimalDatos> as CreateAnimalDatos
}

/**
 * Issue #188: explicit field-by-field mapping from the create form's
 * FormData names to the contract keys. The form serializes the catalog
 * selectors as `raza` / `color` / `calidad` / `lugarCompra` (unsuffixed)
 * and `tipoExplotacionId` (suffixed) — see `FORM_FIELDS` in
 * `packages/ui/src/ganado/animal-crud.tsx`; the contract
 * (`CreateAnimalWebInput.datos`) and `pickCreateAnimalDatos` only read the
 * suffixed keys, so the mapper translates each one explicitly.
 */
export function buildCreateAnimalInputFromFormData(
  fincaId: string,
  formData: FormData,
): CreateAnimalWebInput {
  const draft: CreateAnimalDatosDraft = {
    codigo: requiredText(formData, "codigo"),
    nombre: requiredText(formData, "nombre"),
    sexoKey: parseSexoKey(formData.get("sexoKey")),
    potreroId: optionalText(formData, "potreroId"),
    sectorId: optionalText(formData, "sectorId"),
    loteId: optionalText(formData, "loteId"),
    grupoId: optionalText(formData, "grupoId"),
    origen: parseOrigen(formData.get("origen")),
    fechaNacimiento: optionalText(formData, "fechaNacimiento"),
    fechaCompra: optionalText(formData, "fechaCompra"),
    razaId: optionalText(formData, "raza"),
    colorId: optionalText(formData, "color"),
    calidadId: optionalText(formData, "calidad"),
    tipoExplotacionId: optionalText(formData, "tipoExplotacionId"),
    lugarCompraId: optionalText(formData, "lugarCompra"),
    madreId: optionalText(formData, "madreId"),
    padreId: optionalText(formData, "padreId"),
    precioCompra: parseEsCONumber(formData.get("precioCompra")),
    pesoCompra: parseEsCONumber(formData.get("pesoCompra")),
    // Issue #206: the form captures these 10 fields; without the explicit
    // mapping they were silently dropped before reaching the harness.
    codigoArete: optionalText(formData, "codigoArete"),
    codigoRfid: optionalText(formData, "codigoRfid"),
    hierroId: optionalText(formData, "hierroId"),
    propietarioId: optionalText(formData, "propietarioId"),
    comentarios: optionalText(formData, "comentarios"),
    numeroPezones: parseNumeroPezones(formData.get("numeroPezones")),
    tatuado: parseOptionalBoolean(formData.get("tatuado")),
    herrado: parseOptionalBoolean(formData.get("herrado")),
    descornado: parseOptionalBoolean(formData.get("descornado")),
    esDeMonta: parseOptionalBoolean(formData.get("esDeMonta")),
  }
  return { fincaId, datos: compactCreateAnimalDatos(draft) }
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
 * Translate the dominio use case's `errores` array into the UI's
 * `Record<fieldName, message>` shape at the route boundary. The dominio type is not
 * imported here (design R2: the UI package never imports the domain); we only read the
 * `campo` and `detalle` fields off each item, and we guard non-array inputs locally
 * because the use case types `errores: unknown`.
 *
 * Issue #216: an error whose `campo` has no entry in `CAMPO_TO_FIELD_KEY`
 * lands under the reserved `_form` key instead of being dropped — the form
 * renders it as a form-level alert rather than failing silently (first
 * unmapped error wins, same discipline as mapped fields).
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
    } else if (!key && fieldErrors._form === undefined) {
      fieldErrors._form = detalle
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

export function NewAnimalRouteView({
  fincaId,
  catalogs,
}: { readonly fincaId: string; readonly catalogs?: AnimalCatalogs }) {
  const navigate = useNavigate()
  // PR-5: real DB catalogs from the composite loader. If catalogs are not
  // available (loader failure), all options default to empty (no_disponible).
  const catalogOptions: AnimalFormCatalogOptions = catalogs ? catalogsToFormOptions(catalogs) : {}
  // CM-043 (issue #150): creación inline de maestros por finca desde el
  // `SelectConCreacion`. El affordance se gatea en `configuracion:crear`;
  // los catálogos globales (raza/color/calidad) no tienen creación (CM-025).
  const canCreateCatalog = readCanCreateCatalog()
  const [maestroInline, setMaestroInline] = useState<MaestroInlineCreable | null>(null)
  const [lugaresCreados, setLugaresCreados] = useState<readonly SelectOption[]>([])
  const [creacionInline, setCreacionInline] = useState<{
    readonly campo: "lugarCompra"
    readonly value: string
  } | null>(null)
  const catalogOptionsConPermisos: AnimalFormCatalogOptions = {
    ...catalogOptions,
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
