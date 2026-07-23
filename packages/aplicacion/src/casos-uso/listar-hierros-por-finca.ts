import type { CatalogoFincaPort, HierroOption } from "../puertos/catalogo-finca-port.js"

export interface CatalogoHierroResult {
  readonly tipo: "disponible" | "no_disponible"
  readonly options: readonly HierroOption[]
}

const NO_DISPONIBLE: CatalogoHierroResult = { tipo: "no_disponible", options: [] }

export async function listarHierrosPorFinca(
  fincaId: string,
  port: CatalogoFincaPort<"hierro", HierroOption>,
): Promise<CatalogoHierroResult> {
  try {
    if (!fincaId || typeof fincaId !== "string") return NO_DISPONIBLE

    const rows = await port.listarPorFinca(fincaId, "hierro")
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
