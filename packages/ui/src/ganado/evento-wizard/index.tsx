import { useState } from "react"

import { cn } from "../../lib/utils"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../../primitives/drawer"
import type { AnimalResumen } from "../types"
import { metaDeTipo } from "./catalogo-tipos"
import { PasoAlcance } from "./paso-alcance"
import { PasoDatos } from "./paso-datos"
import { PasoTipo } from "./paso-tipo"
import type {
  BuscarAnimalPorCodigo,
  CapturaEvento,
  CargaAnimalesPorOrigen,
  CatalogosParaAlcance,
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

export function EventoWizard({
  open,
  onOpenChange,
  animalPreseleccionado,
  tipoPreseleccionado,
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
  const [errorServidor, setErrorServidor] = useState<string | null>(null)

  const reset = () => {
    if (!animalPreseleccionado) setSeleccion(undefined)
    if (!tipoPreseleccionado) setTipo(undefined)
    setPasoActual(pasoInicial(tipoPreseleccionado, animalPreseleccionado))
    setErrorServidor(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
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

  const handleVolverATipo = () => {
    setPasoActual("tipo")
  }
  const handleVolverAAlcance = () => {
    setPasoActual("alcance")
  }

  const handleGuardar = async (datos: Readonly<Record<string, string | number | null>>) => {
    if (!tipo || !seleccion) return
    setErrorServidor(null)
    const captura: CapturaEvento = {
      tipo,
      seleccion,
      datos,
    }
    const resultado = await onEnviar(captura)
    if (resultado.tipo === "capturado") {
      onCapturado?.(resultado)
      handleOpenChange(false)
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
        className={cn("rounded-t-sheet", pasoActual === "datos" ? "h-[90vh]" : "h-[50vh]")}
      >
        {pasoActual === "tipo" && (
          <>
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-section">¿Qué registrar?</DrawerTitle>
            </DrawerHeader>
            <PasoTipo
              tipoInicial={tipo}
              permisosEfectivos={permisosEfectivos}
              onSeleccionar={handleSeleccionTipo}
            />
          </>
        )}

        {pasoActual === "alcance" && tipo && meta && (
          <>
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-section">{meta.label}</DrawerTitle>
            </DrawerHeader>
            <PasoAlcance
              tipo={meta}
              catalogos={catalogos}
              animalPreseleccionado={
                animalPreseleccionado
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
            />
          </>
        )}

        {pasoActual === "datos" && tipo && seleccion && (
          <>
            <PasoDatos
              tipo={tipo}
              numeroAnimales={numeroAnimales}
              onVolver={handleVolverAAlcance}
              onGuardar={handleGuardar}
            />
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
