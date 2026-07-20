import type { CatalogoFincaPort, LoteOption } from "../puertos/catalogo-finca-port.js"

export interface CatalogoLoteResult {
  readonly tipo: "disponible" | "no_disponible"
  readonly options: readonly LoteOption[]
}

/**
 * Canonical lote IDs from packages/db/src/seed/seed.ts
 * (lines 350-352 for finca-esperanza, lines 486-488 for finca-roble).
 * The strict decoder rejects any ID not in this set.
 *
 * PR-4: lotes have NO `codigo` column (unlike potrero/sector).
 */
const CANONICAL_LOTE_IDS: ReadonlySet<string> = new Set([
  "lote-esp-2",
  "lote-esp-4",
  "lote-rob-1",
  "lote-rob-2",
])

const NO_DISPONIBLE: CatalogoLoteResult = { tipo: "no_disponible", options: [] }

export async function listarLotesPorFinca(
  fincaId: string,
  port: CatalogoFincaPort<"lote", LoteOption>,
): Promise<CatalogoLoteResult> {
  try {
    if (!fincaId || typeof fincaId !== "string") return NO_DISPONIBLE

    const rows = await port.listarPorFinca(fincaId, "lote")
    if (rows.length === 0) return NO_DISPONIBLE

    const seen = new Set<string>()
    for (const row of rows) {
      if (!row.id || typeof row.id !== "string") return NO_DISPONIBLE
      if (!CANONICAL_LOTE_IDS.has(row.id)) return NO_DISPONIBLE
      if (seen.has(row.id)) return NO_DISPONIBLE
      seen.add(row.id)
    }

    const sorted = [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CO"))
    return { tipo: "disponible", options: sorted }
  } catch {
    return NO_DISPONIBLE
  }
}
