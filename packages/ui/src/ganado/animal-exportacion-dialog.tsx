import * as React from "react"

import { cn } from "../lib/utils"
import { Button } from "../primitives/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../primitives/dialog"
import { toast } from "../primitives/toast"

/**
 * AnimalExportacionDialog — presentational + stateful export flow for #111.
 *
 * Contract source: `openspec/changes/exportar-listado-animales` (LA-070/071/
 * 072/074/076, LA-040/041) and the design's resolved toast copy. The user
 * chooses a scope (`Vista actual` / `Todas`) and a format (XLSX / CSV / PDF);
 * `scope=todas` + `format=pdf` is gated by a 36-column warning that recommends
 * Excel yet still allows PDF (LA-074).
 *
 * Boundaries (Clean/Hexagonal): this component owns NO fetch/network detail.
 * The actual `fetch → blob → download` lives in the injected `exportar`
 * transport (`apps/web` route adapter); the dialog only renders the selection
 * UI and maps the transport's discriminated outcome onto non-destructive
 * states. `packages/ui` therefore never depends on `apps/web`.
 *
 * Error contract (LA-076): a 500 keeps the dialog open, shows a non-destructive
 * message, and offers `Reintentar`, which re-invokes the transport with the SAME
 * scope/format (never cleared). The active list filters are captured by the
 * transport closure, so they survive the retry too. 403/413/timeout render
 * inline (`role="alert"`); success and the 400 correction announce via toast.
 *
 * Theming: CSS tokens only — zero Tailwind dark-mode variants (T-004).
 */

export type AnimalExportacionAlcance = "vista" | "todas"
export type AnimalExportacionFormato = "xlsx" | "csv" | "pdf"

/** The user's confirmed export selection, handed to the transport. */
export type AnimalExportacionSeleccion = Readonly<{
  alcance: AnimalExportacionAlcance
  formato: AnimalExportacionFormato
}>

/**
 * UI-facing outcome of the injected transport. Mirrors the route adapter's
 * `ResultadoExportacionDesktop` discriminated union but stays free of the
 * #107 `ApiErrorDto` so `packages/ui` never imports web/network contracts.
 */
export type ResultadoExportacionDialog =
  | { readonly tipo: "exito" }
  | { readonly tipo: "consulta_invalida"; readonly motivo: string }
  | { readonly tipo: "sin_acceso" }
  | { readonly tipo: "demasiados_resultados" }
  | { readonly tipo: "timeout" }
  | { readonly tipo: "error_servidor" }

/** Injected download transport (web owns the real fetch/blob/download). */
export type AnimalExportacionTransporte = (
  seleccion: AnimalExportacionSeleccion,
) => Promise<ResultadoExportacionDialog>

export interface AnimalExportacionDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly exportar: AnimalExportacionTransporte
}

// ---- Exact user-facing copy (design.md "Resolved Open Questions") --------
const COPIA = {
  titulo: "Exportar animales",
  descripcion: "Elige el alcance y el formato del archivo.",
  etiquetaAlcance: "Alcance",
  etiquetaFormato: "Formato",
  alcanceVista: "Vista actual",
  alcanceTodas: "Todas",
  advertenciaPdf: "El PDF con 36 columnas puede ser difícil de leer. Te recomendamos Excel.",
  continuarPdf: "Continuar con PDF",
  usarExcel: "Usar Excel",
  exportar: "Exportar",
  exportando: "Exportando…",
  cancelar: "Cancelar",
  reintentar: "Reintentar",
  sinAcceso: "No tienes permiso para exportar en esta finca.",
  demasiadosTitulo: "Demasiados resultados",
  demasiadosMensaje: "Afina los filtros para reducir los animales.",
  timeoutTitulo: "La exportación tardó demasiado",
  timeoutMensaje: "Reduce los filtros o el alcance.",
  errorTitulo: "No se pudo exportar",
  errorMensaje: "Ocurrió un error al generar el archivo.",
  correccionTitulo: "Parámetros de la consulta corregidos",
  exitoTitulo: "Exportación lista",
  exitoMensaje: "El archivo se descargó correctamente.",
} as const

const OPCIONES_ALCANCE: readonly { value: AnimalExportacionAlcance; label: string }[] = [
  { value: "vista", label: COPIA.alcanceVista },
  { value: "todas", label: COPIA.alcanceTodas },
]

const OPCIONES_FORMATO: readonly { value: AnimalExportacionFormato; label: string }[] = [
  { value: "xlsx", label: "XLSX" },
  { value: "csv", label: "CSV" },
  { value: "pdf", label: "PDF" },
]

type FaseDialog = "configurando" | "advertencia" | "exportando" | "error"

/** Outcomes rendered inline (`role="alert"`) rather than announced as a toast. */
type ErrorInlineDialog = Exclude<
  ResultadoExportacionDialog,
  { tipo: "exito" } | { tipo: "consulta_invalida" }
>

function esErrorInline(error: ResultadoExportacionDialog): error is ErrorInlineDialog {
  return (
    error.tipo === "sin_acceso" ||
    error.tipo === "demasiados_resultados" ||
    error.tipo === "timeout" ||
    error.tipo === "error_servidor"
  )
}

/** Inline (non-toast) error copy keyed by the transport outcome. */
function copiaError(error: ErrorInlineDialog): { titulo: string | null; mensaje: string } {
  switch (error.tipo) {
    case "sin_acceso":
      return { titulo: null, mensaje: COPIA.sinAcceso }
    case "demasiados_resultados":
      return { titulo: COPIA.demasiadosTitulo, mensaje: COPIA.demasiadosMensaje }
    case "timeout":
      return { titulo: COPIA.timeoutTitulo, mensaje: COPIA.timeoutMensaje }
    case "error_servidor":
      return { titulo: COPIA.errorTitulo, mensaje: COPIA.errorMensaje }
  }
}

function AlertaError({ error }: { error: ErrorInlineDialog }) {
  const { titulo, mensaje } = copiaError(error)
  return (
    <div role="alert" className="rounded-card border border-destructive/40 bg-destructive/10 p-3">
      {titulo ? <p className="text-support font-semibold">{titulo}</p> : null}
      <p className={cn("text-support text-muted-foreground", titulo && "mt-1")}>{mensaje}</p>
    </div>
  )
}

export function AnimalExportacionDialog({
  open,
  onOpenChange,
  exportar,
}: AnimalExportacionDialogProps) {
  const [alcance, setAlcance] = React.useState<AnimalExportacionAlcance>("vista")
  const [formato, setFormato] = React.useState<AnimalExportacionFormato>("xlsx")
  const [fase, setFase] = React.useState<FaseDialog>("configurando")
  const [error, setError] = React.useState<ResultadoExportacionDialog | null>(null)

  const ejecutar = React.useCallback(
    async (seleccion: AnimalExportacionSeleccion) => {
      setFase("exportando")
      setError(null)
      const resultado = await exportar(seleccion)
      switch (resultado.tipo) {
        case "exito":
          toast({ title: COPIA.exitoTitulo, description: COPIA.exitoMensaje })
          onOpenChange(false)
          return
        case "consulta_invalida":
          // LA-040: announce the correction; the last valid table stays put.
          toast({ title: COPIA.correccionTitulo, description: resultado.motivo })
          setFase("configurando")
          return
        default:
          // 403/413/timeout/500 keep the dialog open, non-destructive (LA-076).
          setError(resultado)
          setFase("error")
      }
    },
    [exportar, onOpenChange],
  )

  const confirmar = () => {
    // LA-074: gate the hard-to-read 36-column PDF before exporting.
    if (alcance === "todas" && formato === "pdf") {
      setFase("advertencia")
      return
    }
    void ejecutar({ alcance, formato })
  }

  const continuarConPdf = () => void ejecutar({ alcance, formato: "pdf" })
  const usarExcel = () => {
    setFormato("xlsx")
    void ejecutar({ alcance, formato: "xlsx" })
  }
  const reintentar = () => void ejecutar({ alcance, formato })

  const exportando = fase === "exportando"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{COPIA.titulo}</DialogTitle>
          <DialogDescription>{COPIA.descripcion}</DialogDescription>
        </DialogHeader>

        {fase === "advertencia" ? (
          <div className="grid gap-4">
            <p className="rounded-card border border-border bg-muted p-3 text-support">
              {COPIA.advertenciaPdf}
            </p>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={continuarConPdf}>
                {COPIA.continuarPdf}
              </Button>
              <Button type="button" onClick={usarExcel}>
                {COPIA.usarExcel}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-support">
                {COPIA.etiquetaAlcance}
                <select
                  aria-label={COPIA.etiquetaAlcance}
                  value={alcance}
                  disabled={exportando}
                  onChange={(event) => setAlcance(event.target.value as AnimalExportacionAlcance)}
                >
                  {OPCIONES_ALCANCE.map((opcion) => (
                    <option key={opcion.value} value={opcion.value}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-support">
                {COPIA.etiquetaFormato}
                <select
                  aria-label={COPIA.etiquetaFormato}
                  value={formato}
                  disabled={exportando}
                  onChange={(event) => setFormato(event.target.value as AnimalExportacionFormato)}
                >
                  {OPCIONES_FORMATO.map((opcion) => (
                    <option key={opcion.value} value={opcion.value}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {fase === "error" && error && esErrorInline(error) ? (
              <AlertaError error={error} />
            ) : null}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                {COPIA.cancelar}
              </Button>
              {fase === "error" && error?.tipo === "error_servidor" ? (
                <Button type="button" onClick={reintentar}>
                  {COPIA.reintentar}
                </Button>
              ) : (
                <Button type="button" disabled={exportando} onClick={confirmar}>
                  {exportando ? COPIA.exportando : COPIA.exportar}
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
