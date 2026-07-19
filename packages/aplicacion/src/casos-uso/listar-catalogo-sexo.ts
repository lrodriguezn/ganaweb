import type { CatalogoGlobalPort, CatalogoRaw } from "../puertos/catalogo-global-port.js"

export interface SexoCatalogoOption {
  readonly label: string
  readonly value: 0 | 1 | 2
}

export class CatalogoSexoInvalidoError extends Error {
  readonly code = "CATALOGO_SEXO_INVALIDO"

  constructor(readonly rowId?: string) {
    super("El catálogo de sexo no está disponible.")
    this.name = "CatalogoSexoInvalidoError"
  }
}

function decodeSexo(row: CatalogoRaw): 0 | 1 | 2 {
  if (row.value === "0") return 0
  if (row.value === "1") return 1
  if (row.value === "2") return 2
  throw new CatalogoSexoInvalidoError(row.id)
}

export async function listarCatalogoSexo(
  port: CatalogoGlobalPort,
): Promise<readonly SexoCatalogoOption[]> {
  const rows = await port.listarActivos("sexo")
  if (rows.length === 0) throw new CatalogoSexoInvalidoError()

  const values = new Set<number>()
  const options = rows.map((row) => {
    const value = decodeSexo(row)
    if (values.has(value)) throw new CatalogoSexoInvalidoError(row.id)
    values.add(value)
    return { label: row.key, value, id: row.id }
  })

  return options
    .sort((a, b) => a.value - b.value || a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
    .map(({ label, value }) => ({ label, value }))
}
