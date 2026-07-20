import type { CatalogoFincaPort, PotreroOption } from "../puertos/catalogo-finca-port.js"

export interface CatalogoPotreroResult {
  readonly tipo: "disponible" | "no_disponible"
  readonly options: readonly PotreroOption[]
}

/**
 * Canonical potrero IDs from packages/db/src/seed/seed.ts
 * (lines 341-345 for finca-esperanza, lines 479-483 for finca-roble).
 * The strict decoder rejects any ID not in this set.
 */
const CANONICAL_POTRERO_IDS: ReadonlySet<string> = new Set([
  "pot-esp-1",
  "pot-esp-3",
  "pot-esp-5",
  "pot-rob-1",
  "pot-rob-2",
  "pot-rob-3",
])

const NO_DISPONIBLE: CatalogoPotreroResult = { tipo: "no_disponible", options: [] }

export async function listarPotrerosPorFinca(
  fincaId: string,
  port: CatalogoFincaPort<"potrero", PotreroOption>,
): Promise<CatalogoPotreroResult> {
  try {
    if (!fincaId || typeof fincaId !== "string") return NO_DISPONIBLE

    const rows = await port.listarPorFinca(fincaId, "potrero")
    if (rows.length === 0) return NO_DISPONIBLE

    const seen = new Set<string>()
    for (const row of rows) {
      if (!row.id || typeof row.id !== "string") return NO_DISPONIBLE
      if (!CANONICAL_POTRERO_IDS.has(row.id)) return NO_DISPONIBLE
      if (seen.has(row.id)) return NO_DISPONIBLE
      seen.add(row.id)
    }

    const sorted = [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CO"))
    return { tipo: "disponible", options: sorted }
  } catch {
    return NO_DISPONIBLE
  }
}
