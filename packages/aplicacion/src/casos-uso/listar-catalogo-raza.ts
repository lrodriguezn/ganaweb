import type {
  CatalogoAnimalMaestroPort,
  RazaOption,
} from "../puertos/catalogo-animal-maestro-port.js"

export interface CatalogoRazaResult {
  readonly tipo: "disponible" | "no_disponible"
  readonly options: readonly RazaOption[]
}

/**
 * Canonical raza IDs from packages/db/src/seed/seed.ts (lines 193-205).
 * The strict decoder rejects any ID not in this set.
 */
const CANONICAL_RAZA_IDS: ReadonlySet<string> = new Set([
  "raza-brahman",
  "raza-holstein",
  "raza-angus",
  "raza-brangus",
  "raza-gyr",
  "raza-normando",
  "raza-simmental",
  "raza-criollo",
  "raza-romosinuano",
  "raza-bon",
  "raza-cruce",
])

const NO_DISPONIBLE: CatalogoRazaResult = { tipo: "no_disponible", options: [] }

export async function listarCatalogoRaza(
  port: CatalogoAnimalMaestroPort<"raza", RazaOption>,
): Promise<CatalogoRazaResult> {
  try {
    const rows = await port.listarActivos("raza")
    if (rows.length === 0) return NO_DISPONIBLE

    const seen = new Set<string>()
    for (const row of rows) {
      if (!row.id || typeof row.id !== "string") return NO_DISPONIBLE
      if (!CANONICAL_RAZA_IDS.has(row.id)) return NO_DISPONIBLE
      if (seen.has(row.id)) return NO_DISPONIBLE
      seen.add(row.id)
    }

    const sorted = [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CO"))
    return { tipo: "disponible", options: sorted }
  } catch {
    return NO_DISPONIBLE
  }
}
