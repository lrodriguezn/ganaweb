import type { CatalogoFincaPort, PropietarioOption } from "../puertos/catalogo-finca-port.js"

export interface CatalogoPropietarioResult {
  readonly tipo: "disponible" | "no_disponible"
  readonly options: readonly PropietarioOption[]
}

const NO_DISPONIBLE: CatalogoPropietarioResult = { tipo: "no_disponible", options: [] }

export async function listarPropietariosPorFinca(
  fincaId: string,
  port: CatalogoFincaPort<"propietario", PropietarioOption>,
): Promise<CatalogoPropietarioResult> {
  try {
    if (!fincaId || typeof fincaId !== "string") return NO_DISPONIBLE

    const rows = await port.listarPorFinca(fincaId, "propietario")
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
