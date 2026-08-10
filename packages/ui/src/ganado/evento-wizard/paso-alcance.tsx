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
  readonly seleccionInicial?: Seleccion | undefined
  readonly excepciones?: NonNullable<Extract<Seleccion, { tipo: "grupal" }>["excepciones"]>
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: the scope step keeps selection and recovery transitions together.
export function PasoAlcance({
  tipo,
  catalogos,
  animalPreseleccionado,
  cargarAnimalesPorOrigen,
  buscarAnimalPorCodigo,
  onSeleccion,
  onVolver,
  seleccionInicial,
  excepciones = {},
}: PasoAlcanceProps) {
  const permiteGrupal = tipo.grupal

  // Estado base
  const seleccionGrupalInicial = seleccionInicial?.tipo === "grupal" ? seleccionInicial : undefined
  const [alcance, setAlcance] = useState<"individual" | "grupal">(
    seleccionInicial?.tipo ?? "individual",
  )
  const [origen, setOrigen] = useState<OrigenSeleccionGrupal>(
    seleccionGrupalInicial?.origen ?? "manual",
  )
  const criterioInicial = seleccionGrupalInicial
    ? (seleccionGrupalInicial.loteId ??
      seleccionGrupalInicial.potreroId ??
      seleccionGrupalInicial.grupoId ??
      "")
    : ""
  const [criterioId, setCriterioId] = useState<string>(criterioInicial)
  const [origenPendiente, setOrigenPendiente] = useState<OrigenSeleccionGrupal>(
    seleccionGrupalInicial?.origen ?? "manual",
  )
  const [criterioPendiente, setCriterioPendiente] = useState<string>(criterioInicial)
  const [animalesCargados, setAnimalesCargados] = useState<
    readonly { readonly id: string; readonly codigoAnimal: string }[]
  >([])
  const [incluidos, setIncluidos] = useState<ReadonlySet<string>>(
    new Set(seleccionGrupalInicial?.animalIdsEfectivos ?? []),
  )
  const [excluidos, setExcluidos] = useState<ReadonlySet<string>>(
    new Set(seleccionGrupalInicial?.animalIdsExcluidos ?? []),
  )
  const [cargandoOrigen, setCargandoOrigen] = useState(false)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errorIndividual, setErrorIndividual] = useState<string | null>(null)
  const [origenPorConfirmar, setOrigenPorConfirmar] = useState<OrigenSeleccionGrupal | null>(null)
  const [animalPorRetirar, setAnimalPorRetirar] = useState<string | null>(null)
  const [idsPendientesRetiro, setIdsPendientesRetiro] = useState<readonly string[]>([])
  const idsRestaurados = seleccionGrupalInicial?.animalIdsEfectivos ?? []
  const idsExcluidosRestaurados = seleccionGrupalInicial?.animalIdsExcluidos ?? []

  // Individual
  const [codigoIndividual, setCodigoIndividual] = useState(
    animalPreseleccionado?.codigoAnimal ?? "",
  )
  const [animalIndividual, setAnimalIndividual] = useState<
    { readonly id: string; readonly codigoAnimal: string } | undefined
  >(
    animalPreseleccionado ??
      (seleccionInicial?.tipo === "individual"
        ? { id: seleccionInicial.animalId, codigoAnimal: "" }
        : undefined),
  )
  const [individualSeleccionado, setIndividualSeleccionado] = useState(
    Boolean(animalPreseleccionado) || seleccionInicial?.tipo === "individual",
  )

  // Manual starts empty; the loader only provides the available universe.
  useEffect(() => {
    if (alcance !== "grupal" || origen !== "manual") return
    if (animalesCargados.length > 0 || cargandoOrigen) return
    setCargandoOrigen(true)
    setErrorCarga(null)
    cargarAnimalesPorOrigen("manual", "")
      .then((lista) => {
        setAnimalesCargados(lista)
        setIncluidos(new Set(idsRestaurados))
        setExcluidos(new Set(idsExcluidosRestaurados))
      })
      .catch(() => setErrorCarga("No se pudieron cargar los animales."))
      .finally(() => setCargandoOrigen(false))
  }, [
    alcance,
    cargandoOrigen,
    origen,
    animalesCargados.length,
    cargarAnimalesPorOrigen,
    idsRestaurados,
    idsExcluidosRestaurados,
  ])

  useEffect(() => {
    if (alcance !== "grupal" || origen === "manual" || criterioId === "") return
    if (animalesCargados.length > 0 || cargandoOrigen) return
    setCargandoOrigen(true)
    setErrorCarga(null)
    cargarAnimalesPorOrigen(origen, criterioId)
      .then((lista) => {
        setAnimalesCargados(lista)
        setExcluidos(new Set(seleccionGrupalInicial?.animalIdsExcluidos ?? []))
      })
      .catch(() => setErrorCarga(`No se pudieron cargar animales del ${origen}.`))
      .finally(() => setCargandoOrigen(false))
  }, [
    alcance,
    animalesCargados.length,
    cargarAnimalesPorOrigen,
    cargandoOrigen,
    criterioId,
    origen,
    seleccionGrupalInicial?.animalIdsExcluidos,
  ])

  const animalesEfectivos = useMemo(() => {
    if (origen === "manual") return animalesCargados.filter((a) => incluidos.has(a.id))
    return animalesCargados.filter((a) => !excluidos.has(a.id))
  }, [animalesCargados, excluidos, incluidos, origen])

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
    setIndividualSeleccionado(false)
  }

  const handleSeleccionarIndividualExistente = (animal: {
    readonly id: string
    readonly codigoAnimal: string
  }) => {
    setAnimalIndividual(animal)
    setIndividualSeleccionado(true)
    emitirSeleccion({ tipo: "individual", animalId: animal.id })
  }

  const retirarAnimal = (id: string) => {
    if (origen === "manual") {
      setIncluidos((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      return
    }
    setExcluidos((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  const handleQuitarExcluido = (id: string) => {
    if (excepciones[id]) {
      setAnimalPorRetirar(id)
      return
    }
    retirarAnimal(id)
  }

  const handleRevertirExcluido = (id: string) => {
    if (origen === "manual") {
      setIncluidos((prev) => new Set(prev).add(id))
      return
    }
    setExcluidos((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const cargarNuevoOrigen = async (nuevoOrigen: OrigenSeleccionGrupal, nuevoCriterio: string) => {
    setCargandoOrigen(true)
    setErrorCarga(null)
    try {
      const lista = await cargarAnimalesPorOrigen(nuevoOrigen, nuevoCriterio)
      setOrigen(nuevoOrigen)
      setCriterioId(nuevoCriterio)
      setOrigenPendiente(nuevoOrigen)
      setCriterioPendiente(nuevoCriterio)
      setAnimalesCargados(lista)
      setIncluidos(
        nuevoOrigen === "manual"
          ? new Set(seleccionInicial?.tipo === "grupal" ? seleccionInicial.animalIdsEfectivos : [])
          : new Set(),
      )
      setExcluidos(new Set())
    } catch {
      setOrigenPendiente(origen)
      setCriterioPendiente(criterioId)
      setErrorCarga(`No se pudieron cargar animales del ${nuevoOrigen}.`)
    } finally {
      setCargandoOrigen(false)
    }
  }

  const handleCambiarOrigen = (nuevoOrigen: OrigenSeleccionGrupal) => {
    if (nuevoOrigen === origen) return
    if (animalesEfectivos.length > 0) {
      setOrigenPorConfirmar(nuevoOrigen)
      return
    }
    aplicarCambioOrigen(nuevoOrigen)
  }

  const aplicarCambioOrigen = (nuevoOrigen: OrigenSeleccionGrupal) => {
    setOrigenPendiente(nuevoOrigen)
    setCriterioPendiente("")
    if (nuevoOrigen === "manual") void cargarNuevoOrigen("manual", "")
  }

  const handleCambiarCriterio = (nuevoCriterio: string) => {
    setCriterioPendiente(nuevoCriterio)
    if (nuevoCriterio !== "") void cargarNuevoOrigen(origenPendiente, nuevoCriterio)
  }

  const handleToggleIncluido = (id: string, incluido: boolean) => {
    if (incluido) handleQuitarExcluido(id)
    else handleRevertirExcluido(id)
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: validation and snapshot creation belong to one transition.
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
      ...(excluidos.size > 0 ? { animalIdsExcluidos: [...excluidos] } : {}),
      ...(seleccionGrupalInicial?.excepciones
        ? { excepciones: seleccionGrupalInicial.excepciones }
        : {}),
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
            seleccionado={individualSeleccionado}
            onContinuar={() => {
              if (animalIndividual) {
                emitirSeleccion({ tipo: "individual", animalId: animalIndividual.id })
              }
            }}
            animalPreseleccionado={animalPreseleccionado}
            buscarAnimalPorCodigo={buscarAnimalPorCodigo}
          />
        ) : (
          <SeccionGrupal
            origen={origenPendiente}
            onCambiarOrigen={handleCambiarOrigen}
            catalogos={catalogos}
            criterioId={criterioPendiente}
            onCambiarCriterio={handleCambiarCriterio}
            animalesCargados={animalesCargados}
            incluidos={incluidos}
            excluidos={excluidos}
            cargando={cargandoOrigen}
            error={errorCarga}
            onToggle={handleToggleIncluido}
            onSeleccionarTodos={(ids) => {
              if (origen === "manual") setIncluidos((prev) => new Set([...prev, ...ids]))
              else setExcluidos((prev) => new Set([...prev].filter((id) => !ids.includes(id))))
            }}
            onQuitarTodos={(ids) => {
              const excepcionesRetiradas = ids.filter((id) => excepciones[id])
              if (excepcionesRetiradas.length > 0) {
                setIdsPendientesRetiro(excepcionesRetiradas)
                setAnimalPorRetirar(excepcionesRetiradas[0] ?? null)
                return
              }
              if (origen === "manual")
                setIncluidos((prev) => new Set([...prev].filter((id) => !ids.includes(id))))
              else setExcluidos((prev) => new Set([...prev, ...ids]))
            }}
            origenActivo={origen}
            totalEfectivo={animalesEfectivos.length}
            totalCargado={animalesCargados.length}
            origenPorConfirmar={origenPorConfirmar}
            animalPorRetirar={animalPorRetirar}
            onConfirmarRetiro={() => {
              for (const id of idsPendientesRetiro.length > 0
                ? idsPendientesRetiro
                : animalPorRetirar
                  ? [animalPorRetirar]
                  : []) {
                retirarAnimal(id)
              }
              setIdsPendientesRetiro([])
              setAnimalPorRetirar(null)
            }}
            onCancelarRetiro={() => {
              setIdsPendientesRetiro([])
              setAnimalPorRetirar(null)
            }}
            onConfirmarCambioOrigen={() => {
              if (!origenPorConfirmar) return
              aplicarCambioOrigen(origenPorConfirmar)
              setOrigenPorConfirmar(null)
            }}
            onCancelarCambioOrigen={() => setOrigenPorConfirmar(null)}
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
            Continuar con {animalesEfectivos.length}{" "}
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
  seleccionado,
  onContinuar,
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
  readonly seleccionado: boolean
  readonly onContinuar: () => void
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
          {!seleccionado && (
            <Button
              type="button"
              className="mt-2 h-10"
              onClick={() => onAceptarPreseleccion(animal)}
            >
              Seleccionar {animal.codigoAnimal}
            </Button>
          )}
        </div>
      )}
      {animal && seleccionado && (
        <Button type="button" className="w-full h-12" onClick={onContinuar}>
          Continuar con este animal
        </Button>
      )}
      {/* searchAnimal is referenced to keep TS happy if a refactor inlines it */}
      <span className="sr-only" data-buscar-fn={buscarAnimalPorCodigo.name} />
    </div>
  )
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this section keeps the complete keyboard-accessible selection workflow together.
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
  onToggle,
  onSeleccionarTodos,
  onQuitarTodos,
  origenActivo,
  incluidos,
  totalEfectivo,
  totalCargado,
  origenPorConfirmar,
  animalPorRetirar,
  onConfirmarRetiro,
  onCancelarRetiro,
  onConfirmarCambioOrigen,
  onCancelarCambioOrigen,
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
  readonly incluidos: ReadonlySet<string>
  readonly onToggle: (id: string, incluido: boolean) => void
  readonly onSeleccionarTodos: (ids: readonly string[]) => void
  readonly onQuitarTodos: (ids: readonly string[]) => void
  readonly origenActivo: OrigenSeleccionGrupal
  readonly totalEfectivo: number
  readonly totalCargado: number
  readonly origenPorConfirmar: OrigenSeleccionGrupal | null
  readonly animalPorRetirar: string | null
  readonly onConfirmarRetiro: () => void
  readonly onCancelarRetiro: () => void
  readonly onConfirmarCambioOrigen: () => void
  readonly onCancelarCambioOrigen: () => void
}) {
  const [filtro, setFiltro] = useState("")
  const [mostrarExcluidos, setMostrarExcluidos] = useState(false)
  const filtroNormalizado = filtro.trim().toLocaleLowerCase()
  const animalesVisibles = animalesCargados.filter((animal) =>
    animal.codigoAnimal.toLocaleLowerCase().includes(filtroNormalizado),
  )
  const universoFiltrado = filtroNormalizado !== ""
  const numeroExcluidos = totalCargado - totalEfectivo
  const animalesVisiblesPorEstado = animalesVisibles.filter((animal) => {
    const incluido =
      origenActivo === "manual" ? incluidos.has(animal.id) : !excluidos.has(animal.id)
    return mostrarExcluidos ? !incluido : incluido
  })

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
                onClick={() => onCambiarOrigen(opt.value)}
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
      {origenPorConfirmar && (
        <div
          className="rounded-card border border-pasto-300 bg-pasto-50 p-3 space-y-2"
          role="alert"
        >
          <p className="text-support">
            Cambiar el origen reemplazará la selección actual cuando el nuevo origen cargue
            correctamente.
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={onConfirmarCambioOrigen}>
              Cambiar origen
            </Button>
            <Button type="button" variant="outline" onClick={onCancelarCambioOrigen}>
              Conservar selección
            </Button>
          </div>
        </div>
      )}
      {animalPorRetirar && (
        <div
          className="rounded-card border border-pasto-300 bg-pasto-50 p-3 space-y-2"
          role="alert"
        >
          <p className="text-support">
            Este animal tiene una excepción. Si lo retiras, se descartarán sus diferencias.
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={onConfirmarRetiro}>
              Retirar y descartar excepción
            </Button>
            <Button type="button" variant="outline" onClick={onCancelarRetiro}>
              Conservar animal
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p className="text-caption text-peligro-600" role="alert">
          {error}
        </p>
      )}

      {origen === "manual" || criterioId !== "" ? (
        <div className="space-y-2">
          <label htmlFor="filtro-animales" className="text-support font-medium">
            Buscar animales
          </label>
          <Input
            id="filtro-animales"
            value={filtro}
            onChange={(event) => setFiltro(event.target.value)}
            placeholder="Código del animal"
            aria-describedby="filtro-animales-ayuda"
          />
          <p id="filtro-animales-ayuda" className="text-caption text-muted-foreground">
            Buscar o limpiar no cambia la selección.
          </p>
          <div className="flex flex-wrap gap-2" aria-label="Acciones de selección">
            <Button
              type="button"
              variant="outline"
              onClick={() => onSeleccionarTodos(animalesVisibles.map((a) => a.id))}
            >
              {universoFiltrado
                ? `Seleccionar los ${animalesVisibles.length} resultados`
                : "Seleccionar todos"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onQuitarTodos(animalesVisibles.map((a) => a.id))}
            >
              {universoFiltrado
                ? `Quitar los ${animalesVisibles.length} resultados`
                : "Quitar todos"}
            </Button>
          </div>
        </div>
      ) : null}

      {!cargando && animalesCargados.length > 0 && criterioId === "" && origen !== "manual" ? (
        // biome-ignore lint/a11y/useSemanticElements: status announcements belong in a paragraph, not a form-associated <output>.
        <p className="text-caption text-muted-foreground" role="status">
          Selecciona un {origen} para cargar sus animales.
        </p>
      ) : (
        !cargando &&
        animalesCargados.length > 0 && (
          <div className="space-y-2">
            <p className="text-support font-medium" aria-live="polite">
              {origenActivo === "manual"
                ? `${totalEfectivo} animales incluidos`
                : `${totalEfectivo} incluidos · ${totalCargado - totalEfectivo} excluidos`}
            </p>
            {numeroExcluidos > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setMostrarExcluidos((visible) => !visible)}
              >
                {mostrarExcluidos ? "Ocultar excluidos" : `Ver excluidos (${numeroExcluidos})`}
              </Button>
            )}
            <ul className="space-y-1.5 max-h-60 overflow-y-auto">
              {animalesVisiblesPorEstado.map((a) => {
                const incluido =
                  origenActivo === "manual" ? incluidos.has(a.id) : !excluidos.has(a.id)
                return (
                  <li
                    key={a.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-support",
                      !incluido ? "opacity-60" : "",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span>{a.codigoAnimal}</span>
                      <span
                        className="text-caption"
                        aria-label={incluido ? "Incluido" : "Excluido"}
                      >
                        {incluido ? "Incluido" : "Excluido"}
                      </span>
                    </span>
                    {!incluido ? (
                      <button
                        type="button"
                        onClick={() => onToggle(a.id, false)}
                        className="text-caption text-primary font-medium"
                      >
                        Incluir
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onToggle(a.id, true)}
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
            {animalesVisiblesPorEstado.length === 0 && (
              // biome-ignore lint/a11y/useSemanticElements: status announcements belong in a paragraph, not a form-associated <output>.
              <p className="text-caption text-muted-foreground" role="status">
                No hay resultados para esta búsqueda.
              </p>
            )}
          </div>
        )
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
