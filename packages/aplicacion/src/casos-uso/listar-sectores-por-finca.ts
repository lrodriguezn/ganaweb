import type { CatalogoFincaPort, SectorOption } from "../puertos/catalogo-finca-port.js"

export interface CatalogoSectorResult {
  readonly tipo: "disponible" | "no_disponible"
  readonly options: readonly SectorOption[]
}

/**
 * Canonical sector IDs from packages/db/src/seed/seed.ts
 * (lines 466-472: 3 for finca-esperanza, 2 for finca-roble).
 * The strict decoder rejects any ID not in this set.
 */
const CANONICAL_SECTOR_IDS: ReadonlySet<string> = new Set([
  "sec-esp-a",
  "sec-esp-b",
  "sec-esp-c",
  "sec-rob-a",
  "sec-rob-b",
])

const NO_DISPONIBLE: CatalogoSectorResult = { tipo: "no_disponible", options: [] }

export async function listarSectoresPorFinca(
  fincaId: string,
  port: CatalogoFincaPort<"sector", SectorOption>,
): Promise<CatalogoSectorResult> {
  try {
    if (!fincaId || typeof fincaId !== "string") return NO_DISPONIBLE

    const rows = await port.listarPorFinca(fincaId, "sector")
    if (rows.length === 0) return NO_DISPONIBLE

    const seen = new Set<string>()
    for (const row of rows) {
      if (!row.id || typeof row.id !== "string") return NO_DISPONIBLE
      if (!CANONICAL_SECTOR_IDS.has(row.id)) return NO_DISPONIBLE
      if (seen.has(row.id)) return NO_DISPONIBLE
      seen.add(row.id)
    }

    const sorted = [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CO"))
    return { tipo: "disponible", options: sorted }
  } catch {
    return NO_DISPONIBLE
  }
}
