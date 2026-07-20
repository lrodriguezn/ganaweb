import type { CatalogoFincaPort, LugarCompraOption } from "../puertos/catalogo-finca-port.js"

export interface CatalogoLugarCompraResult {
  readonly tipo: "disponible" | "no_disponible"
  readonly options: readonly LugarCompraOption[]
}

/**
 * Canonical lugarCompra IDs from packages/db/src/seed/seed.ts
 * (lines 430-432: 2 for finca-esperanza).
 * The strict decoder rejects any ID not in this set.
 *
 * PR-4: lugares_compras have NO `codigo` column (unlike potrero/sector).
 * The DTO includes `direccion` (from schema `ubicacion` column).
 */
const CANONICAL_LUGAR_COMPRA_IDS: ReadonlySet<string> = new Set(["lc-esp-feria", "lc-esp-directa"])

const NO_DISPONIBLE: CatalogoLugarCompraResult = { tipo: "no_disponible", options: [] }

export async function listarLugaresCompraPorFinca(
  fincaId: string,
  port: CatalogoFincaPort<"lugarCompra", LugarCompraOption>,
): Promise<CatalogoLugarCompraResult> {
  try {
    if (!fincaId || typeof fincaId !== "string") return NO_DISPONIBLE

    const rows = await port.listarPorFinca(fincaId, "lugarCompra")
    if (rows.length === 0) return NO_DISPONIBLE

    const seen = new Set<string>()
    for (const row of rows) {
      if (!row.id || typeof row.id !== "string") return NO_DISPONIBLE
      if (!CANONICAL_LUGAR_COMPRA_IDS.has(row.id)) return NO_DISPONIBLE
      if (seen.has(row.id)) return NO_DISPONIBLE
      seen.add(row.id)
    }

    const sorted = [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CO"))
    return { tipo: "disponible", options: sorted }
  } catch {
    return NO_DISPONIBLE
  }
}
