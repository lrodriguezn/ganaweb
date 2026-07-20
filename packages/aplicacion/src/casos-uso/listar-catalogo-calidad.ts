import type {
  CalidadOption,
  CatalogoAnimalMaestroPort,
} from "../puertos/catalogo-animal-maestro-port.js"

export interface CatalogoCalidadResult {
  readonly tipo: "disponible" | "no_disponible"
  readonly options: readonly CalidadOption[]
}

/**
 * Canonical calidad IDs from packages/db/src/seed/seed.ts (lines 238-242).
 * The strict decoder rejects any ID not in this set.
 */
const CANONICAL_CALIDAD_IDS: ReadonlySet<string> = new Set([
  "cal-excelente",
  "cal-bueno",
  "cal-regular",
  "cal-descarte",
])

const NO_DISPONIBLE: CatalogoCalidadResult = { tipo: "no_disponible", options: [] }

export async function listarCatalogoCalidad(
  port: CatalogoAnimalMaestroPort<"calidad", CalidadOption>,
): Promise<CatalogoCalidadResult> {
  try {
    const rows = await port.listarActivos("calidad")
    if (rows.length === 0) return NO_DISPONIBLE

    const seen = new Set<string>()
    for (const row of rows) {
      if (!row.id || typeof row.id !== "string") return NO_DISPONIBLE
      if (!CANONICAL_CALIDAD_IDS.has(row.id)) return NO_DISPONIBLE
      if (seen.has(row.id)) return NO_DISPONIBLE
      seen.add(row.id)
    }

    const sorted = [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CO"))
    return { tipo: "disponible", options: sorted }
  } catch {
    return NO_DISPONIBLE
  }
}
