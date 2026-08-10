import type { BorradorEvento } from "./types"

type Datos = BorradorEvento["datosComunes"]
type Excepciones = BorradorEvento["excepciones"]

export function EditorExcepciones({
  animales,
  datosComunes,
  excepciones,
  onChange,
}: {
  readonly animales: readonly { readonly id: string; readonly codigoAnimal: string }[]
  readonly datosComunes: Datos
  readonly excepciones: Excepciones
  readonly onChange: (value: Excepciones) => void
}) {
  const campos = Object.keys(datosComunes)
  const actualizar = (animalId: string, campo: string, raw: string) => {
    const common = datosComunes[campo]
    const value: string | number | null =
      typeof common === "number" ? (raw === "" ? null : Number(raw)) : raw === "" ? null : raw
    const actual = excepciones[animalId] ?? {}
    const siguiente = { ...actual }
    const igualAlComun =
      Object.is(value, common) ||
      (typeof common === "number" && raw !== "" && Number(raw) === common) ||
      (value === null && common == null)
    if (igualAlComun) delete siguiente[campo]
    else siguiente[campo] = value
    const next: Record<string, Record<string, string | number | null>> = Object.fromEntries(
      Object.entries(excepciones).map(([id, fields]) => [id, { ...fields }]),
    )
    if (Object.keys(siguiente).length === 0) delete next[animalId]
    else next[animalId] = siguiente
    onChange(next)
  }

  if (campos.length === 0) return null
  return (
    <section
      aria-label="Excepciones por animal"
      className="mx-4 mb-4 rounded-card border p-3 space-y-3"
    >
      <h3 className="font-semibold">Diferencias por animal</h3>
      <p className="text-caption text-muted-foreground">
        Solo se guardan los campos que difieren del común.
      </p>
      {animales.map((animal) => {
        const excepcion = excepciones[animal.id] ?? {}
        return (
          <details
            key={animal.id}
            open={Object.keys(excepcion).length > 0}
            className="border-t pt-2"
          >
            <summary className="cursor-pointer font-medium">{animal.codigoAnimal}</summary>
            <div className="space-y-2 pt-2">
              {campos.map((campo) => (
                <label key={campo} className="flex flex-col gap-1 text-support">
                  {campo}
                  <input
                    aria-label={`${animal.codigoAnimal}: ${campo}`}
                    value={String(excepcion[campo] ?? datosComunes[campo] ?? "")}
                    onChange={(event) => actualizar(animal.id, campo, event.target.value)}
                    className="h-10 rounded-md border border-input bg-card px-2"
                  />
                </label>
              ))}
              <p className="text-caption text-muted-foreground">
                {Object.keys(excepcion).length === 0
                  ? "Sin excepción"
                  : `Campos diferentes: ${Object.keys(excepcion).join(", ")}`}
              </p>
            </div>
          </details>
        )
      })}
    </section>
  )
}
