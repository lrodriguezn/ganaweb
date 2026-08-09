import { useEffect, useMemo, useState } from "react"

import { cn } from "../../lib/utils"
import { Button } from "../../primitives/button"
import { Input } from "../../primitives/input"
import { PillsSegmentadas } from "../../primitives/pills-segmentadas"
import type {
  BuscarAnimalPorCodigo,
  CargaAnimalesPorOrigen,
  CatalogosParaAlcance,
  OrigenSeleccionGrupal,
  Seleccion,
  TipoEventoMeta,
} from "./types"

/**
 * Paso 2 del wizard (EV-CAP-001/002/003/004/005/007): alcance individual o grupal.
 *
 * - Individual: selector por código (combobox simple) → la ruta provee
 *   `buscarAnimalPorCodigo` (cache local, jamás red).
 * - Grupal: pills `manual | lote | potrero | grupo`. Al cambiar origen/criterio
 *   se cargan los animales iniciales vía `cargarAnimalesPorOrigen` y se
 *   renderizan como chips removibles (exclusiones). El total efectivo y los IDs
 *   se devuelven en `onSeleccion`.
 * - Parto, muerte y condición corporal ocultan la opción grupal (matriz §2 y
 *   EV-CAP-007).
 */
export interface PasoAlcanceProps {
  readonly tipo: TipoEventoMeta
  readonly catalogos: CatalogosParaAlcance
  readonly animalPreseleccionado?:
    | { readonly id: string; readonly codigoAnimal: string }
    | undefined
  readonly cargarAnimalesPorOrigen: CargaAnimalesPorOrigen
  readonly buscarAnimalPorCodigo: BuscarAnimalPorCodigo
  readonly onSeleccion: (seleccion: Seleccion) => void
  readonly onVolver: () => void
}

export function PasoAlcance({
  tipo,
  catalogos,
  animalPreseleccionado,
  cargarAnimalesPorOrigen,
  buscarAnimalPorCodigo,
  onSeleccion,
  onVolver,
}: PasoAlcanceProps) {
  const permiteGrupal = tipo.grupal

  // Estado base
  const [alcance, setAlcance] = useState<"individual" | "grupal">(
    animalPreseleccionado ? "individual" : permiteGrupal ? "individual" : "individual",
  )
  const [origen, setOrigen] = useState<OrigenSeleccionGrupal>("manual")
  const [criterioId, setCriterioId] = useState<string>("")
  const [animalesCargados, setAnimalesCargados] = useState<
    readonly { readonly id: string; readonly codigoAnimal: string }[]
  >([])
  const [excluidos, setExcluidos] = useState<ReadonlySet<string>>(new Set())
  const [cargandoOrigen, setCargandoOrigen] = useState(false)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errorIndividual, setErrorIndividual] = useState<string | null>(null)

  // Individual
  const [codigoIndividual, setCodigoIndividual] = useState(
    animalPreseleccionado?.codigoAnimal ?? "",
  )
  const [animalIndividual, setAnimalIndividual] = useState<
    { readonly id: string; readonly codigoAnimal: string } | undefined
  >(animalPreseleccionado)

  // Carga inicial para manual (lista todos los animales de la finca).
  useEffect(() => {
    if (alcance !== "grupal" || origen !== "manual") return
    if (animalesCargados.length > 0) return
    setCargandoOrigen(true)
    setErrorCarga(null)
    cargarAnimalesPorOrigen("manual", "")
      .then((lista) => setAnimalesCargados(lista))
      .catch(() => setErrorCarga("No se pudieron cargar los animales."))
      .finally(() => setCargandoOrigen(false))
  }, [alcance, origen, animalesCargados.length, cargarAnimalesPorOrigen])

  // Carga al cambiar origen con criterio
  useEffect(() => {
    if (alcance !== "grupal") return
    if (origen === "manual") return
    if (criterioId === "") return
    setCargandoOrigen(true)
    setErrorCarga(null)
    setExcluidos(new Set())
    cargarAnimalesPorOrigen(origen, criterioId)
      .then((lista) => setAnimalesCargados(lista))
      .catch(() => setErrorCarga(`No se pudieron cargar animales del ${origen}.`))
      .finally(() => setCargandoOrigen(false))
  }, [alcance, origen, criterioId, cargarAnimalesPorOrigen])

  const animalesEfectivos = useMemo(
    () => animalesCargados.filter((a) => !excluidos.has(a.id)),
    [animalesCargados, excluidos],
  )

  const emitirSeleccion = (next: Seleccion) => onSeleccion(next)

  const handleBuscarIndividual = async () => {
    setErrorIndividual(null)
    const codigo = codigoIndividual.trim()
    if (codigo === "") {
      setErrorIndividual("Ingresa un código.")
      return
    }
    const encontrado = await buscarAnimalPorCodigo(codigo)
    if (!encontrado) {
      setErrorIndividual("No se encontró un animal con ese código en la finca.")
      return
    }
    setAnimalIndividual(encontrado)
    emitirSeleccion({ tipo: "individual", animalId: encontrado.id })
  }

  const handleSeleccionarIndividualExistente = (animal: {
    readonly id: string
    readonly codigoAnimal: string
  }) => {
    setAnimalIndividual(animal)
    emitirSeleccion({ tipo: "individual", animalId: animal.id })
  }

  const handleQuitarExcluido = (id: string) => {
    setExcluidos((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  const handleRevertirExcluido = (id: string) => {
    setExcluidos((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const handleConfirmarGrupal = () => {
    if (origen === "manual" && animalesCargados.length === 0) {
      setErrorCarga("No hay animales disponibles para selección manual.")
      return
    }
    if (origen !== "manual" && criterioId === "") {
      setErrorCarga(`Selecciona un ${origen}.`)
      return
    }
    const idsEfectivos = animalesEfectivos.map((a) => a.id)
    if (idsEfectivos.length === 0) {
      setErrorCarga("No quedan animales efectivos tras exclusiones.")
      return
    }
    emitirSeleccion({
      tipo: "grupal",
      origen,
      ...(origen === "lote" ? { loteId: criterioId } : {}),
      ...(origen === "potrero" ? { potreroId: criterioId } : {}),
      ...(origen === "grupo" ? { grupoId: criterioId } : {}),
      animalIdsEfectivos: idsEfectivos,
      totalAnimales: idsEfectivos.length,
    })
  }

  return (
    <div className="min-h-0 flex-1 flex flex-col">
      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 space-y-4"
        data-testid="evento-wizard-scope-scroll"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-section font-semibold">¿A quiénes?</h2>
          <button
            type="button"
            onClick={onVolver}
            className="text-support text-primary font-medium"
          >
            ‹ Cambiar tipo
          </button>
        </div>

        {permiteGrupal ? (
          <PillsSegmentadas
            id="alcance"
            label="Alcance"
            value={alcance}
            onChange={(v) => setAlcance(v as "individual" | "grupal")}
            options={[
              { value: "individual", label: "Individual" },
              { value: "grupal", label: "Grupal" },
            ]}
          />
        ) : (
          <p className="text-caption text-muted-foreground" data-testid="alcance-solo-individual">
            {tipo.label} solo admite alcance individual en esta versión.
          </p>
        )}

        {alcance === "individual" ? (
          <SeccionIndividual
            codigo={codigoIndividual}
            onCambiarCodigo={setCodigoIndividual}
            onBuscar={handleBuscarIndividual}
            error={errorIndividual}
            animal={animalIndividual}
            onAceptarPreseleccion={handleSeleccionarIndividualExistente}
            animalPreseleccionado={animalPreseleccionado}
            buscarAnimalPorCodigo={buscarAnimalPorCodigo}
          />
        ) : (
          <SeccionGrupal
            origen={origen}
            onCambiarOrigen={setOrigen}
            catalogos={catalogos}
            criterioId={criterioId}
            onCambiarCriterio={setCriterioId}
            animalesCargados={animalesCargados}
            excluidos={excluidos}
            cargando={cargandoOrigen}
            error={errorCarga}
            onQuitar={handleQuitarExcluido}
            onRevertir={handleRevertirExcluido}
            totalEfectivo={animalesEfectivos.length}
            totalCargado={animalesCargados.length}
          />
        )}
      </div>
      {alcance === "grupal" && (
        <div
          className="shrink-0 border-t bg-card p-4 pb-safe"
          data-testid="evento-wizard-scope-footer"
        >
          <Button
            type="button"
            className="w-full h-12"
            onClick={handleConfirmarGrupal}
            disabled={animalesEfectivos.length === 0}
          >
            Confirmar {animalesEfectivos.length}{" "}
            {animalesEfectivos.length === 1 ? "animal" : "animales"}
          </Button>
        </div>
      )}
    </div>
  )
}

function SeccionIndividual({
  codigo,
  onCambiarCodigo,
  onBuscar,
  error,
  animal,
  onAceptarPreseleccion,
  animalPreseleccionado,
  buscarAnimalPorCodigo,
}: {
  readonly codigo: string
  readonly onCambiarCodigo: (v: string) => void
  readonly onBuscar: () => void
  readonly error: string | null
  readonly animal: { readonly id: string; readonly codigoAnimal: string } | undefined
  readonly onAceptarPreseleccion: (a: {
    readonly id: string
    readonly codigoAnimal: string
  }) => void
  readonly animalPreseleccionado?:
    | { readonly id: string; readonly codigoAnimal: string }
    | undefined
  readonly buscarAnimalPorCodigo: BuscarAnimalPorCodigo
}) {
  if (animalPreseleccionado) {
    // Emite la selección al padre en cuanto se monte
    queueMicrotask(() => onAceptarPreseleccion(animalPreseleccionado))
    return (
      <div className="rounded-card border bg-card p-3 space-y-1">
        <p className="text-support font-medium">Animal preseleccionado</p>
        <p className="text-support text-muted-foreground">{animalPreseleccionado.codigoAnimal}</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <label htmlFor="ind-codigo" className="text-support font-medium block">
        Código del animal
      </label>
      <div className="flex gap-2">
        <Input
          id="ind-codigo"
          value={codigo}
          onChange={(e) => onCambiarCodigo(e.target.value)}
          placeholder="Ej. MT-122"
          className="h-12"
        />
        <Button type="button" className="h-12" onClick={onBuscar}>
          Buscar
        </Button>
      </div>
      {error && (
        <p className="text-caption text-peligro-600" role="alert">
          {error}
        </p>
      )}
      {animal && (
        <div className="rounded-card border bg-card p-3">
          <p className="text-support font-medium">{animal.codigoAnimal}</p>
          <p className="text-caption text-muted-foreground">{animal.id}</p>
        </div>
      )}
      {/* searchAnimal is referenced to keep TS happy if a refactor inlines it */}
      <span className="sr-only" data-buscar-fn={buscarAnimalPorCodigo.name} />
    </div>
  )
}

function SeccionGrupal({
  origen,
  onCambiarOrigen,
  catalogos,
  criterioId,
  onCambiarCriterio,
  animalesCargados,
  excluidos,
  cargando,
  error,
  onQuitar,
  onRevertir,
  totalEfectivo,
  totalCargado,
}: {
  readonly origen: OrigenSeleccionGrupal
  readonly onCambiarOrigen: (o: OrigenSeleccionGrupal) => void
  readonly catalogos: CatalogosParaAlcance
  readonly criterioId: string
  readonly onCambiarCriterio: (id: string) => void
  readonly animalesCargados: readonly { readonly id: string; readonly codigoAnimal: string }[]
  readonly excluidos: ReadonlySet<string>
  readonly cargando: boolean
  readonly error: string | null
  readonly onQuitar: (id: string) => void
  readonly onRevertir: (id: string) => void
  readonly totalEfectivo: number
  readonly totalCargado: number
}) {
  return (
    <div className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="text-support font-medium">Origen de selección</legend>
        <div role="radiogroup" className="grid grid-cols-4 gap-2">
          {(
            [
              { value: "manual", label: "Manual" },
              { value: "lote", label: "Lote" },
              { value: "potrero", label: "Potrero" },
              { value: "grupo", label: "Grupo" },
            ] as const
          ).map((opt) => {
            const activo = origen === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                // biome-ignore lint/a11y/useSemanticElements: pill radiogroup uses button-style radios (WAI-ARIA APG); same pattern as PillsSegmentadas.
                role="radio"
                aria-checked={activo}
                onClick={() => {
                  onCambiarOrigen(opt.value)
                  onCambiarCriterio("")
                }}
                className={cn(
                  "min-h-[--h-touch] rounded-card border px-2 py-1.5 text-support font-medium",
                  activo
                    ? "border-pasto-600 bg-pasto-100"
                    : "border-input bg-card text-muted-foreground",
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      {origen !== "manual" && (
        <SelectorCriterio
          origen={origen}
          opciones={
            origen === "lote"
              ? catalogos.lotes
              : origen === "potrero"
                ? catalogos.potreros
                : catalogos.grupos
          }
          criterioId={criterioId}
          onCambiarCriterio={onCambiarCriterio}
        />
      )}

      {cargando && (
        // biome-ignore lint/a11y/useSemanticElements: status announcements belong in a paragraph, not a form-associated <output>.
        <p className="text-caption text-muted-foreground" role="status">
          Cargando animales…
        </p>
      )}
      {error && (
        <p className="text-caption text-peligro-600" role="alert">
          {error}
        </p>
      )}

      {!cargando && animalesCargados.length > 0 && (
        <div className="space-y-2">
          <p className="text-support font-medium">
            {totalEfectivo} de {totalCargado} animales efectivos
          </p>
          <ul className="space-y-1.5 max-h-60 overflow-y-auto">
            {animalesCargados.map((a) => {
              const excluido = excluidos.has(a.id)
              return (
                <li
                  key={a.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-support",
                    excluido ? "opacity-60 line-through" : "",
                  )}
                >
                  <span>{a.codigoAnimal}</span>
                  {excluido ? (
                    <button
                      type="button"
                      onClick={() => onRevertir(a.id)}
                      className="text-caption text-primary font-medium"
                    >
                      Revertir
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onQuitar(a.id)}
                      className="text-caption text-peligro-600 font-medium"
                      aria-label={`Excluir ${a.codigoAnimal}`}
                    >
                      Excluir
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function SelectorCriterio({
  origen,
  opciones,
  criterioId,
  onCambiarCriterio,
}: {
  readonly origen: OrigenSeleccionGrupal
  readonly opciones: readonly { readonly id: string; readonly nombre: string }[]
  readonly criterioId: string
  readonly onCambiarCriterio: (id: string) => void
}) {
  if (opciones.length === 0) {
    return (
      // biome-ignore lint/a11y/useSemanticElements: status announcements belong in a paragraph, not a form-associated <output>.
      <p className="text-caption text-muted-foreground" role="status">
        No hay {origen}s configurados en la finca.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="criterio" className="text-support font-medium">
        {origen.charAt(0).toUpperCase() + origen.slice(1)}
      </label>
      <select
        id="criterio"
        value={criterioId}
        onChange={(e) => onCambiarCriterio(e.target.value)}
        className="flex h-12 w-full rounded-md border border-input bg-card px-3 py-2 text-support"
      >
        <option value="">Selecciona…</option>
        {opciones.map((op) => (
          <option key={op.id} value={op.id}>
            {op.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}
