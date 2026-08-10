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
import { PasoAlcance } from "./paso-alcance"
import { PasoDatos } from "./paso-datos"
import { PasoTipo } from "./paso-tipo"
import type {
  BorradorEvento,
  BuscarAnimalPorCodigo,
  CapturaEvento,
  CargaAnimalesPorOrigen,
  CatalogosParaAlcance,
  DominioEventoWizard,
  PermisosEfectivosPorDominio,
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

type Paso = "tipo" | "alcance" | "datos"

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
  const [confirmarCierre, setConfirmarCierre] = useState(false)

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
    setConfirmarCierre(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (tipo || seleccion || Object.keys(datosComunes).length > 0) {
        setConfirmarCierre(true)
        return
      }
      reset()
    }
    onOpenChange(next)
  }

  const handleSeleccionTipo = (nuevo: TipoEventoWizard) => {
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
    setPasoActual("alcance")
  }

  const handleSeleccionAlcance = (next: Seleccion) => {
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
    setPasoActual("alcance")
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: server result mapping is intentionally centralized at the UI boundary.
  const handleGuardar = async (datos: Readonly<Record<string, string | number | null>>) => {
    if (!tipo || !seleccion) return
    setErrorServidor(null)
    const captura: CapturaEvento = {
      tipo,
      seleccion,
      datos: { ...datosComunes, ...datos },
      ...(corrigeAId ? { corrigeAId } : {}),
    }
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
            ? "h-[90dvh] max-h-[760px] sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:w-[min(720px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card sm:h-[85dvh]"
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
              seleccionInicial={seleccion}
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
                onDatosChange={setDatosComunes}
              />
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
