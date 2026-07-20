/**
 * `animal-form-catalog.ts` — opciones de catálogo demo para el formulario
 * de nuevo animal. Fuente única de los selectores (origen, potrero,
 * sector, lote, grupo) en la ruta `nuevo.tsx` mientras no exista un
 * loader real por finca.
 *
 * SPEC: `openspec/changes/2026-07-14-feature-crud-animales-deficiencies/design.md`
 *       "Open Question: Confirm actual catalog option source for
 *        ingreso/origen and location masters before implementation."
 *
 * LIMITACIÓN DEMO: este fixture NO es la fuente real. La fuente real
 * debe venir de un loader por finca (p. ej. un `cargarCatalogosAnimales(fincaId)`
 * conectado a las tablas de origen/potreros/sectores/lotes/grupos). El
 * contrato de `AnimalFormCatalogOptions` NO cambia al migrar — el
 * caller sólo reemplaza la fuente.
 *
 * Etiquetas en español (es-CO). Los `value` son strings opacas que el
 * formulario reenvía tal cual al `buildCreateAnimalInputFromFormData`;
 * el servidor las trata como identificadores sin reformatear.
 */
import type { AnimalFormCatalogOptions, ComboboxOption, SelectOption } from "@ganaweb/ui"

// biome-ignore lint/correctness/noUnusedVariables: documented demo constant for the future "extended origen" caller (see `getAnimalFormCatalogOptions` below).
const ORIGEN_OPTIONS: readonly SelectOption[] = [
  { value: "nacimiento", label: "Nacimiento en finca" },
  { value: "compra-local", label: "Compra local" },
  { value: "compra-nacional", label: "Compra nacional" },
  { value: "traslado", label: "Traslado de otra finca" },
] as const

const POTRERO_OPTIONS: readonly SelectOption[] = [
  { value: "potrero-norte", label: "Potrero Norte" },
  { value: "potrero-sur", label: "Potrero Sur" },
  { value: "potrero-oriente", label: "Potrero Oriente" },
] as const

const SECTOR_OPTIONS: readonly SelectOption[] = [
  { value: "sector-cria", label: "Sector Cría" },
  { value: "sector-levante", label: "Sector Levante" },
  { value: "sector-ordeno", label: "Sector Ordeño" },
] as const

const LOTE_OPTIONS: readonly SelectOption[] = [
  { value: "lote-a", label: "Lote A" },
  { value: "lote-b", label: "Lote B" },
  { value: "lote-c", label: "Lote C" },
] as const

const GRUPO_OPTIONS: readonly SelectOption[] = [
  { value: "grupo-hato", label: "Grupo Hato General" },
  { value: "grupo-novillas", label: "Grupo Novillas" },
  { value: "grupo-vacas", label: "Grupo Vacas Producción" },
] as const

// --- v1.3 form fields (PR 2b) ---------------------------------------------
// `AnimalFormCatalogOptions.raza | color | lugarCompra` accept
// `SelectOptionWithCreate` (SelectOption + optional `meta.hex`). The base
// `SelectOption` exported from `@ganaweb/ui` does not know about `meta`,
// so we type-color the v1.3 arrays structurally to a `SelectOption` that
// allows `meta`. `as const` freezes the literal so the inferred array is
// `readonly`.

type SelectOptionWithCreateLocal = SelectOption & {
  readonly meta?: { readonly hex?: string }
}

const RAZA_OPTIONS: readonly SelectOptionWithCreateLocal[] = [
  { value: "raza-angus", label: "Angus" },
  { value: "raza-brahman", label: "Brahman" },
  { value: "raza-holstein", label: "Holstein" },
  { value: "raza-jersey", label: "Jersey" },
] as const

const COLOR_OPTIONS: readonly SelectOptionWithCreateLocal[] = [
  { value: "color-negro", label: "Negro", meta: { hex: "#1a1a1a" } },
  { value: "color-blanco", label: "Blanco", meta: { hex: "#f5f5f5" } },
  { value: "color-roano", label: "Roano", meta: { hex: "#8b6f5c" } },
  { value: "color-bay", label: "Bayo", meta: { hex: "#c8932e" } },
] as const

const CALIDAD_OPTIONS: readonly SelectOption[] = [
  { value: "calidad-extra", label: "Extra" },
  { value: "calidad-primera", label: "Primera" },
  { value: "calidad-segunda", label: "Segunda" },
] as const

const LUGAR_COMPRA_OPTIONS: readonly SelectOptionWithCreateLocal[] = [
  { value: "lugar-feria-manizales", label: "Feria de Manizales" },
  { value: "lugar-subasta-medellin", label: "Subasta Medellín" },
  { value: "lugar-finca-vendedor", label: "Finca del vendedor" },
  { value: "lugar-plaza-bogota", label: "Plaza de Bogotá" },
] as const

const MADRE_OPTIONS = [
  { value: "animal-mt-100", codigo: "MT-100", nombre: "Lola" },
  { value: "animal-mt-200", codigo: "MT-200", nombre: "Maya" },
  { value: "animal-mt-300", codigo: "MT-300", nombre: "Lucera" },
  { value: "animal-mt-400", codigo: "MT-400", nombre: "Esperanza" },
] as const satisfies readonly ComboboxOption[]

const PADRE_OPTIONS = [
  { value: "animal-toro-1", codigo: "TR-001", nombre: "Toro Cacique" },
  { value: "animal-toro-2", codigo: "TR-002", nombre: "Toro Soberano" },
  { value: "animal-pajuela-1", codigo: "PJ-100", nombre: "Pajuela Holstein" },
] as const satisfies readonly ComboboxOption[]

const CAN_CREATE_CATALOG = {
  raza: true,
  color: true,
  calidad: false,
  lugarCompra: true,
} as const

/**
 * PR-5: Retained as rollback safety. Not consumed in production by Phase 1.
 *
 * The real catalog source is now `getAnimalCatalogsAction()` which loads
 * from the DB via `loadAnimalCatalogs(fincaId, ports)`. This fixture is
 * kept so routes can be reverted to fixture-sourced options if needed.
 *
 * In production, calling this function throws to prevent accidental use.
 * Tests that import the types (AnimalFormCatalogOptions, etc.) are unaffected.
 */
export function getAnimalFormCatalogOptions(): AnimalFormCatalogOptions {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Mock catalogs not available in production. Use getAnimalCatalogsAction() instead.",
    )
  }
  return {
    // PR 2b (v1.3 spec): `origen` is intentionally NOT in the fixture.
    // The form's `useComboboxOrigen` bifurcation renders the v1.3
    // `PillsSegmentadas` (2-option radiogroup) when `catalogOptions.origen`
    // is `undefined`, which is the spec-mandated behavior. The
    // ORIGEN_OPTIONS constant above is kept as a documented demo for any
    // future "extended origen" caller that wants the combobox path.
    potrero: POTRERO_OPTIONS,
    sector: SECTOR_OPTIONS,
    lote: LOTE_OPTIONS,
    grupo: GRUPO_OPTIONS,
    raza: RAZA_OPTIONS,
    color: COLOR_OPTIONS,
    calidad: CALIDAD_OPTIONS,
    lugarCompra: LUGAR_COMPRA_OPTIONS,
    madre: MADRE_OPTIONS,
    padre: PADRE_OPTIONS,
    canCreateCatalog: CAN_CREATE_CATALOG,
  }
}
