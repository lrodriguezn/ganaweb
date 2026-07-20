import type {
  CatalogoAnimalMaestroPort,
  ColorOption,
} from "../puertos/catalogo-animal-maestro-port.js"

export interface CatalogoColorResult {
  readonly tipo: "disponible" | "no_disponible"
  readonly options: readonly ColorOption[]
}

/**
 * Canonical color IDs from packages/db/src/seed/seed.ts (lines 248-256).
 * The strict decoder rejects any ID not in this set.
 */
const CANONICAL_COLOR_IDS: ReadonlySet<string> = new Set([
  "col-negro",
  "col-blanco",
  "col-rojo",
  "col-cafe",
  "col-canela",
  "col-bayo",
  "col-overo",
  "col-pintado",
])

const NO_DISPONIBLE: CatalogoColorResult = { tipo: "no_disponible", options: [] }

export async function listarCatalogoColor(
  port: CatalogoAnimalMaestroPort<"color", ColorOption>,
): Promise<CatalogoColorResult> {
  try {
    const rows = await port.listarActivos("color")
    if (rows.length === 0) return NO_DISPONIBLE

    const seen = new Set<string>()
    for (const row of rows) {
      if (!row.id || typeof row.id !== "string") return NO_DISPONIBLE
      if (!CANONICAL_COLOR_IDS.has(row.id)) return NO_DISPONIBLE
      if (seen.has(row.id)) return NO_DISPONIBLE
      seen.add(row.id)
    }

    const sorted = [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CO"))
    return { tipo: "disponible", options: sorted }
  } catch {
    return NO_DISPONIBLE
  }
}
