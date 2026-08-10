import { CAMPOS_EXCEPCIONABLES, type CampoExcepcion } from "./matriz-excepciones"
import type { CatalogosParaAlcance, TipoEventoWizard } from "./types"

type Datos = Readonly<Record<string, string | number | null>>
type Excepciones = Readonly<Record<string, Readonly<Record<string, string | number | null>>>>

function valorParaControl(value: string | number | null | undefined) {
  if (value === null || value === undefined) return ""
  return String(value)
}

function convertirValor(campo: CampoExcepcion, raw: string): string | number | null {
  if (raw === "") return null
  if (campo.control === "number" || campo.valorNumerico) return Number(raw)
  return raw
}

export function EditorExcepciones({
  tipo,
  animales,
  datosComunes,
  excepciones,
  catalogos,
  onChange,
}: {
  readonly tipo: TipoEventoWizard
  readonly animales: readonly { readonly id: string; readonly codigoAnimal: string }[]
  readonly datosComunes: Datos
  readonly excepciones: Excepciones
  readonly catalogos: CatalogosParaAlcance
  readonly onChange: (value: Excepciones) => void
}) {
  const campos = CAMPOS_EXCEPCIONABLES[tipo]
  const actualizar = (animalId: string, campo: CampoExcepcion, raw: string) => {
    const value = convertirValor(campo, raw)
    const common = datosComunes[campo.campo]
    const actual = excepciones[animalId] ?? {}
    const siguiente = { ...actual }
    if (Object.is(value, common) || (value === null && common == null))
      delete siguiente[campo.campo]
    else siguiente[campo.campo] = value

    const next: Record<string, Record<string, string | number | null>> = Object.fromEntries(
      Object.entries(excepciones).map(([id, fields]) => [id, { ...fields }]),
    )
    if (Object.keys(siguiente).length === 0) delete next[animalId]
    else next[animalId] = siguiente
    onChange(next)
  }

  if (campos.length === 0 || animales.length === 0) return null
  return (
    <section
      aria-label="Excepciones por animal"
      className="mx-4 mb-4 rounded-card border p-3 space-y-3"
    >
      <h3 className="font-semibold">Diferencias por animal</h3>
      <p className="text-caption text-muted-foreground">
        Solo se guardan los campos autorizados que difieren del común.
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
              {campos.map((campo) => {
                const value = valorParaControl(
                  Object.hasOwn(excepcion, campo.campo)
                    ? excepcion[campo.campo]
                    : datosComunes[campo.campo],
                )
                const opciones = campo.catalogo ? (catalogos[campo.catalogo] ?? []) : []
                const controlId = `excepcion-${animal.id}-${campo.campo}`
                return (
                  <div key={campo.campo} className="flex flex-col gap-1 text-support">
                    <span>{campo.etiqueta}</span>
                    {campo.control === "select" ? (
                      <select
                        id={controlId}
                        aria-label={`${animal.codigoAnimal}: ${campo.campo.toLowerCase()}`}
                        value={value}
                        onChange={(event) => actualizar(animal.id, campo, event.target.value)}
                        className="h-10 rounded-md border border-input bg-card px-2"
                      >
                        {(campo.opciones ?? []).map((opcion) => (
                          <option key={opcion.value} value={opcion.value}>
                            {opcion.label}
                          </option>
                        ))}
                      </select>
                    ) : campo.control === "catalog" ? (
                      <select
                        id={controlId}
                        aria-label={`${animal.codigoAnimal}: ${campo.campo.toLowerCase()}`}
                        value={value}
                        onChange={(event) => actualizar(animal.id, campo, event.target.value)}
                        className="h-10 rounded-md border border-input bg-card px-2"
                      >
                        <option value="">Seleccionar</option>
                        {opciones.map((opcion) => (
                          <option key={opcion.id} value={opcion.id}>
                            {opcion.nombre}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={controlId}
                        aria-label={`${animal.codigoAnimal}: ${campo.campo.toLowerCase()}`}
                        type={campo.control}
                        inputMode={campo.control === "number" ? "decimal" : undefined}
                        step={campo.step}
                        value={value}
                        onChange={(event) => actualizar(animal.id, campo, event.target.value)}
                        className="h-10 rounded-md border border-input bg-card px-2"
                      />
                    )}
                  </div>
                )
              })}
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
