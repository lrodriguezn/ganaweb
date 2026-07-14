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
import type { AnimalFormCatalogOptions, SelectOption } from "@ganaweb/ui"

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

/**
 * Devuelve las opciones de catálogo demo. La función (en lugar de una
 * constante exportada) deja la puerta abierta a un loader real
 * `await cargarCatalogosAnimales(fincaId)` sin tocar al caller.
 */
export function getAnimalFormCatalogOptions(): AnimalFormCatalogOptions {
  return {
    origen: ORIGEN_OPTIONS,
    potrero: POTRERO_OPTIONS,
    sector: SECTOR_OPTIONS,
    lote: LOTE_OPTIONS,
    grupo: GRUPO_OPTIONS,
  }
}
