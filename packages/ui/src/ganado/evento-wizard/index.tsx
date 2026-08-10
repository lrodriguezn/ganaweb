import { useEffect, useState } from "react"

import { cn } from "../../lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../primitives/alert-dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../../primitives/drawer"
import type { AnimalResumen } from "../types"
import { metaDeTipo } from "./catalogo-tipos"
import { EditorExcepciones } from "./editor-excepciones"
import { PasoAlcance } from "./paso-alcance"
import { PasoDatos } from "./paso-datos"
import { PasoTipo } from "./paso-tipo"
import { RevisionRiesgo } from "./revision-riesgo"
import type {
  BorradorEvento,
  BuscarAnimalPorCodigo,
  CapturaEvento,
  CargaAnimalesPorOrigen,
  CatalogosParaAlcance,
  DominioEventoWizard,
  EventoWizardPoliticaRiesgo,
  PermisosEfectivosPorDominio,
  ResultadoMembresiaActual,
  RevisarMembresiaActual,
  Seleccion,
  TipoEventoWizard,
} from "./types"

/**
 * EventoWizard — shell de captura de eventos Tipo → Alcance → Datos
 * (Issue #229, EV-CAP-001..005/007).
 *
 * No duplica reglas de dominio: el shell se limita a orquestar los 3 pasos y
 * delegar la autorización, el RBAC, el rango de finca, la validación de
 * campos, y la transacción atómica al server
 * (`apps/web/src/server/eventos-wizard.server.ts`).
 *
 * Reutilización con EventDrawer (issue #167 slice 1): el `EventDrawer` legado
 * se conserva en `event-drawer/` por compatibilidad; este wizard lo reemplaza
 * para ficha y para Eventos (CA-010 — mismo formulario desde ficha y Eventos).
 */
export interface EventoWizardProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly fincaId: string
  /** Animal preseleccionado desde la ficha → salta al paso 2 con individual. */
  readonly animalPreseleccionado?: AnimalResumen
  /** Tipo preseleccionado desde tarjeta → salta al paso 2 respetando selección. */
  readonly tipoPreseleccionado?: TipoEventoWizard
  /** Categoría inicial desde Eventos → filtra el selector sin elegir un tipo. */
  readonly categoriaInicial?: DominioEventoWizard
  readonly corrigeAId?: string
  /** Permisos efectivos por dominio. El server los revalida. */
  readonly permisosEfectivos: PermisosEfectivosPorDominio
  readonly catalogos: CatalogosParaAlcance
  readonly cargarAnimalesPorOrigen: CargaAnimalesPorOrigen
  readonly buscarAnimalPorCodigo: BuscarAnimalPorCodigo
  /** Devuelve el resultado del server al cliente. */
  readonly onCapturado?: (resultado: ResultadoCapturaEvento) => void
  /** Server invocado al confirmar el paso 3. */
  readonly onEnviar: (captura: CapturaEvento) => Promise<ResultadoCapturaEvento>
  readonly politicaRiesgo: EventoWizardPoliticaRiesgo
  readonly revisarMembresiaActual?: RevisarMembresiaActual
}

export type ResultadoCapturaEvento =
  | { readonly tipo: "capturado"; readonly ids: ResultadoIds }
  | { readonly tipo: "no_autenticado" }
  | { readonly tipo: "finca_no_autorizada" }
  | { readonly tipo: "permiso_denegado"; readonly permiso: string }
  | { readonly tipo: "validacion"; readonly errores: readonly { campo: string; detalle: string }[] }
  | { readonly tipo: "alcance_invalido" }
  | { readonly tipo: "error"; readonly detalle: string }

export interface ResultadoIds {
  readonly cabeceraId?: string
  readonly individualId?: string
  readonly hijosIds: readonly string[]
}

type Paso = "tipo" | "alcance" | "datos" | "revision"

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: the shell owns the complete wizard transition state.
export function EventoWizard({
  open,
  onOpenChange,
  animalPreseleccionado,
  tipoPreseleccionado,
  categoriaInicial,
  corrigeAId,
  permisosEfectivos,
  catalogos,
  cargarAnimalesPorOrigen,
  buscarAnimalPorCodigo,
  onCapturado,
  onEnviar,
  politicaRiesgo,
  revisarMembresiaActual,
}: EventoWizardProps) {
  const [tipo, setTipo] = useState<TipoEventoWizard | undefined>(tipoPreseleccionado)
  const [seleccion, setSeleccion] = useState<Seleccion | undefined>(
    animalPreseleccionado ? { tipo: "individual", animalId: animalPreseleccionado.id } : undefined,
  )
  const [pasoActual, setPasoActual] = useState<Paso>(
    pasoInicial(tipoPreseleccionado, animalPreseleccionado),
  )
  const [categoriaContextual, setCategoriaContextual] = useState<DominioEventoWizard | undefined>(
    categoriaInicial,
  )
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const [datosComunes, setDatosComunes] = useState<BorradorEvento["datosComunes"]>({})
  const [excepciones, setExcepciones] = useState<BorradorEvento["excepciones"]>({})
  const [capturaPendiente, setCapturaPendiente] = useState<CapturaEvento | null>(null)
  const [hayCambiosPendientes, setHayCambiosPendientes] = useState(false)
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const [membresia, setMembresia] = useState<ResultadoMembresiaActual | null>(null)
  const [cargandoMembresia, setCargandoMembresia] = useState(false)

  useEffect(() => {
    if (open) setCategoriaContextual(categoriaInicial)
  }, [categoriaInicial, open])

  const reset = () => {
    if (!animalPreseleccionado) setSeleccion(undefined)
    if (!tipoPreseleccionado) setTipo(undefined)
    setPasoActual(pasoInicial(tipoPreseleccionado, animalPreseleccionado))
    setCategoriaContextual(categoriaInicial)
    setErrorServidor(null)
    setDatosComunes({})
    setExcepciones({})
    setCapturaPendiente(null)
    setHayCambiosPendientes(false)
    setConfirmarCierre(false)
    setMembresia(null)
    setCargandoMembresia(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (hayCambiosPendientes) {
        setConfirmarCierre(true)
        return
      }
      reset()
    }
    onOpenChange(next)
  }

  const handleSeleccionTipo = (nuevo: TipoEventoWizard) => {
    setHayCambiosPendientes(true)
    setCapturaPendiente(null)
    setTipo(nuevo)
    // Si ya hay selección previa (de un tipo anterior) Y el nuevo tipo
    // permite grupal/individual, mantenemos la selección; si no, limpiamos.
    const meta = metaDeTipo(nuevo)
    if (seleccion?.tipo === "grupal" && !meta.grupal) {
      setSeleccion(undefined)
    }
    if (seleccion?.tipo === "individual" && !animalPreseleccionado) {
      // individual elegida manualmente podría ser inválida para parto; el form
      // lo advertirá. Mantenemos y dejamos que la validación lo recoja.
    }
    setPasoActual(animalPreseleccionado ? "datos" : "alcance")
  }

  const handleSeleccionAlcance = (next: Seleccion) => {
    setHayCambiosPendientes(true)
    setCapturaPendiente(null)
    if (next.tipo === "grupal") {
      const ids = new Set(next.animalIdsEfectivos)
      setExcepciones(
        Object.fromEntries(Object.entries(excepciones).filter(([animalId]) => ids.has(animalId))),
      )
    } else {
      setExcepciones({})
    }
    setSeleccion(next)
    setPasoActual("datos")
  }

  const descartarBorrador = () => {
    reset()
    onOpenChange(false)
  }

  const handleVolverATipo = () => {
    setPasoActual("tipo")
  }
  const handleVolverAAlcance = () => {
    setCapturaPendiente(null)
    if (seleccion?.tipo === "grupal") setSeleccion({ ...seleccion, excepciones })
    setPasoActual("alcance")
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: server result mapping is intentionally centralized at the UI boundary.
  const handleGuardar = async (datos: Readonly<Record<string, string | number | null>>) => {
    if (!tipo || !seleccion) return
    setErrorServidor(null)
    const captura: CapturaEvento = {
      tipo,
      seleccion:
        seleccion.tipo === "grupal" && Object.keys(excepciones).length > 0
          ? { ...seleccion, excepciones }
          : seleccion,
      datos: { ...datosComunes, ...datos },
      ...(corrigeAId ? { corrigeAId } : {}),
    }
    setCapturaPendiente(captura)
    const criterios = criteriosDeRiesgo(tipo, seleccion, excepciones, politicaRiesgo, corrigeAId)
    let resultadoMembresia: ResultadoMembresiaActual = { estado: "coincide" }
    if (seleccion.tipo === "grupal" && seleccion.origen !== "manual") {
      setCargandoMembresia(true)
      resultadoMembresia = revisarMembresiaActual
        ? await revisarMembresiaActual(
            seleccion.origen,
            criterioIdDeSeleccion(seleccion),
            seleccion.animalIdsEfectivos,
          ).catch(() => ({ estado: "desconocido" as const }))
        : { estado: "desconocido" as const }
      setMembresia(resultadoMembresia)
      setCargandoMembresia(false)
    }
    if (
      criterios.length > 0 ||
      resultadoMembresia.estado === "cambio" ||
      resultadoMembresia.estado === "desconocido"
    ) {
      setPasoActual("revision")
      return
    }
    await enviarCaptura(captura)
  }

  const enviarCaptura = async (captura: CapturaEvento) => {
    const resultado = await onEnviar(captura)
    if (resultado.tipo === "capturado") {
      setDatosComunes({})
      onCapturado?.(resultado)
      reset()
      onOpenChange(false)
      return
    }
    if (resultado.tipo === "permiso_denegado") {
      setErrorServidor(`No tienes permiso para crear en este dominio (${resultado.permiso}).`)
      return
    }
    if (resultado.tipo === "alcance_invalido") {
      setErrorServidor("Algún animal no pertenece a la finca activa.")
      return
    }
    if (resultado.tipo === "validacion") {
      setErrorServidor(resultado.errores.map((e) => `${e.campo}: ${e.detalle}`).join(" · "))
      return
    }
    if (resultado.tipo === "finca_no_autorizada") {
      setErrorServidor("La finca activa no coincide con la del evento.")
      return
    }
    if (resultado.tipo === "no_autenticado") {
      setErrorServidor("Tu sesión expiró. Inicia sesión nuevamente.")
      return
    }
    setErrorServidor(resultado.detalle)
  }

  const meta = tipo ? metaDeTipo(tipo) : undefined
  const numeroAnimales = seleccion?.tipo === "grupal" ? seleccion.totalAnimales : seleccion ? 1 : 0
  const permisosFaltantes = tipo && meta ? !permisosEfectivos[meta.dominio] : false

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent
        className={cn(
          "rounded-t-sheet",
          pasoActual === "tipo" || pasoActual === "alcance"
            ? "h-[90dvh] max-h-[760px] sm:mt-0 sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:w-[min(720px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card sm:h-[min(760px,calc(100dvh-2rem))]"
            : pasoActual === "datos"
              ? "h-[90vh]"
              : "h-[50vh]",
        )}
      >
        <button
          type="button"
          aria-label="Cerrar wizard"
          onClick={() => handleOpenChange(false)}
          className="absolute right-4 top-3 z-10 text-support text-muted-foreground"
        >
          Cerrar
        </button>
        {pasoActual === "tipo" && (
          <>
            <DrawerHeader className="shrink-0 pb-2">
              <DrawerTitle className="text-section">¿Qué registrar?</DrawerTitle>
              <PasoIndicador pasoActual={pasoActual} />
            </DrawerHeader>
            <PasoTipo
              tipoInicial={tipo}
              categoriaContextual={categoriaContextual}
              permisosEfectivos={permisosEfectivos}
              onSeleccionar={handleSeleccionTipo}
              onVerTodosTipos={() => setCategoriaContextual(undefined)}
            />
          </>
        )}

        {pasoActual === "alcance" && tipo && meta && (
          <>
            <DrawerHeader className="shrink-0 pb-2">
              <DrawerTitle className="text-section">{meta.label}</DrawerTitle>
              <PasoIndicador pasoActual={pasoActual} />
            </DrawerHeader>
            <PasoAlcance
              tipo={meta}
              catalogos={catalogos}
              animalPreseleccionado={
                animalPreseleccionado && !seleccion
                  ? {
                      id: animalPreseleccionado.id,
                      codigoAnimal: animalPreseleccionado.codigoAnimal,
                    }
                  : undefined
              }
              cargarAnimalesPorOrigen={cargarAnimalesPorOrigen}
              buscarAnimalPorCodigo={buscarAnimalPorCodigo}
              onSeleccion={handleSeleccionAlcance}
              onVolver={handleVolverATipo}
              seleccionInicial={
                seleccion?.tipo === "grupal" ? { ...seleccion, excepciones } : seleccion
              }
              excepciones={excepciones}
            />
          </>
        )}

        {pasoActual === "datos" && tipo && seleccion && (
          <>
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 px-4 pt-3">
                <PasoIndicador pasoActual={pasoActual} />
              </div>
              <PasoDatos
                tipo={tipo}
                numeroAnimales={numeroAnimales}
                onVolver={handleVolverAAlcance}
                onGuardar={handleGuardar}
                datosIniciales={datosComunes}
                onDatosChange={(datos) => {
                  setHayCambiosPendientes(true)
                  setCapturaPendiente(null)
                  setDatosComunes((actual) => {
                    const next = { ...actual, ...datos }
                    setExcepciones((current) => {
                      const cleaned: Record<string, Record<string, string | number | null>> = {}
                      for (const [animalId, exception] of Object.entries(current)) {
                        const remaining = Object.fromEntries(
                          Object.entries(exception).filter(
                            ([field, value]) => !Object.is(value, next[field]),
                          ),
                        )
                        if (Object.keys(remaining).length > 0) cleaned[animalId] = remaining
                      }
                      return cleaned
                    })
                    return next
                  })
                }}
              />
              {seleccion.tipo === "grupal" && (
                <EditorExcepciones
                  animales={
                    seleccion.animales ??
                    seleccion.animalIdsEfectivos.map((id) => ({ id, codigoAnimal: id }))
                  }
                  datosComunes={datosComunes}
                  excepciones={excepciones}
                  onChange={(next) => {
                    setHayCambiosPendientes(true)
                    setExcepciones(next)
                  }}
                />
              )}
            </div>
            {errorServidor && (
              <p
                className="text-caption text-peligro-600 px-4 pb-2"
                role="alert"
                data-testid="evento-wizard-error"
              >
                {errorServidor}
              </p>
            )}
            {permisosFaltantes && (
              <p
                className="text-caption text-peligro-600 px-4 pb-2"
                role="alert"
                data-testid="evento-wizard-permiso-faltante"
              >
                No tienes permiso de creación en este dominio. El envío se bloqueará.
              </p>
            )}
          </>
        )}
        {pasoActual === "revision" && tipo && seleccion && capturaPendiente && (
          <RevisionRiesgo
            tipo={metaDeTipo(tipo)}
            seleccion={capturaPendiente.seleccion}
            catalogos={catalogos}
            datosCapturados={capturaPendiente.datos}
            excepciones={
              capturaPendiente.seleccion.tipo === "grupal"
                ? (capturaPendiente.seleccion.excepciones ?? {})
                : {}
            }
            criterios={criteriosDeRiesgo(
              tipo,
              seleccion,
              excepciones,
              politicaRiesgo,
              corrigeAId,
            ).concat(
              membresia?.estado === "cambio"
                ? ["cambio de membresía detectado"]
                : membresia?.estado === "desconocido"
                  ? ["membresía no verificable"]
                  : [],
            )}
            membresia={membresia}
            cargandoMembresia={cargandoMembresia}
            onMantenerSnapshot={() => {
              if (membresia?.estado !== "cambio" || (membresia.retirados?.length ?? 0) > 0) return
              setMembresia({ estado: "coincide" })
            }}
            onActualizarAlcance={() => {
              if (membresia?.estado === "desconocido") {
                setCapturaPendiente(null)
                setMembresia(null)
                setPasoActual("alcance")
                return
              }
              if (
                membresia?.estado !== "cambio" ||
                seleccion.tipo !== "grupal" ||
                !membresia.animales
              )
                return
              const retirados = new Set(membresia.retirados?.map((animal) => animal.id) ?? [])
              const excluidos = (seleccion.animalIdsExcluidos ?? []).filter(
                (id) => !retirados.has(id),
              )
              const ids = membresia.animales
                .filter((animal) => !excluidos.includes(animal.id))
                .map((animal) => animal.id)
              setExcepciones((actual) =>
                Object.fromEntries(Object.entries(actual).filter(([id]) => ids.includes(id))),
              )
              setSeleccion({
                ...seleccion,
                animales: membresia.animales,
                animalIdsEfectivos: ids,
                totalAnimales: ids.length,
                animalIdsExcluidos: excluidos,
              })
              setCapturaPendiente(null)
              setMembresia(null)
              setPasoActual("alcance")
            }}
            onConfirmar={() => {
              if (!capturaPendiente) return
              void enviarCaptura(capturaPendiente)
            }}
          />
        )}
      </DrawerContent>
      <AlertDialog open={confirmarCierre} onOpenChange={setConfirmarCierre}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar el wizard?</AlertDialogTitle>
            <AlertDialogDescription>
              Hay cambios pendientes. Puedes continuar editando o descartar el borrador completo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={descartarBorrador}>Descartar borrador</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Drawer>
  )
}

function pasoInicial(
  tipoPreseleccionado: TipoEventoWizard | undefined,
  animalPreseleccionado: AnimalResumen | undefined,
): Paso {
  if (tipoPreseleccionado) return animalPreseleccionado ? "datos" : "alcance"
  return "tipo"
}

function PasoIndicador({ pasoActual }: { readonly pasoActual: Paso }) {
  const pasos: readonly { id: Paso; label: string }[] = [
    { id: "tipo", label: "Tipo" },
    { id: "alcance", label: "Alcance" },
    { id: "datos", label: "Datos" },
  ]

  return (
    <ol
      aria-label="Progreso del registro de evento"
      className="flex items-center gap-2 text-caption text-muted-foreground"
      data-testid="evento-wizard-step-indicator"
    >
      {pasos.map((paso, index) => (
        <li key={paso.id} className="flex items-center gap-2">
          <span
            aria-current={paso.id === pasoActual ? "step" : undefined}
            className={paso.id === pasoActual ? "font-semibold text-foreground" : undefined}
          >
            {index + 1}. {paso.label}
          </span>
          {index < pasos.length - 1 && <span aria-hidden="true">/</span>}
        </li>
      ))}
    </ol>
  )
}

function criterioIdDeSeleccion(seleccion: Extract<Seleccion, { tipo: "grupal" }>) {
  return seleccion.origen === "lote"
    ? (seleccion.loteId ?? "")
    : seleccion.origen === "potrero"
      ? (seleccion.potreroId ?? "")
      : (seleccion.grupoId ?? "")
}

export function criteriosDeRiesgo(
  tipo: TipoEventoWizard,
  seleccion: Seleccion,
  excepciones: Readonly<Record<string, unknown>>,
  politicaRiesgo: EventoWizardPoliticaRiesgo,
  corrigeAId: string | undefined,
) {
  const criterios: string[] = []
  if (politicaRiesgo.tiposSensibles.includes(tipo))
    criterios.push("tipo sensible según la política")
  if (corrigeAId) criterios.push("corrección de un evento existente")
  if (Object.keys(excepciones).length > 0) criterios.push("excepciones por animal")
  if (
    seleccion.tipo === "grupal" &&
    politicaRiesgo.umbralGrupoGrande !== undefined &&
    seleccion.totalAnimales > politicaRiesgo.umbralGrupoGrande
  ) {
    criterios.push("grupo grande según configuración")
  }
  return criterios
}
