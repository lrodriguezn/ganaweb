import type { CatalogoFincaPort, LugarCompraOption } from "../puertos/catalogo-finca-port.js"

export interface CatalogoLugarCompraResult {
  readonly tipo: "disponible" | "no_disponible"
  readonly options: readonly LugarCompraOption[]
}

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
      if (seen.has(row.id)) return NO_DISPONIBLE
      seen.add(row.id)
    }

    const sorted = [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CO"))
    return { tipo: "disponible", options: sorted }
  } catch {
    return NO_DISPONIBLE
  }
}
