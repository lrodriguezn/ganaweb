import type { ReactNode } from "react"

import { cn } from "../../../lib/utils"
import { Button } from "../../../primitives/button"
import { Label } from "../../../primitives/label"

/**
 * Primitivas compartidas por los 11 formularios del Paso 3 (EV-CAP-006/008).
 *
 * Los formularios de dominio NO duplican reglas de sanitario/productivo/
 * reproductivo/movimientos: este módulo solo estandariza el marco visual
 * (header scrolleable + footer sticky con conteo) y un input accesible con
 * la etiqueta + mensaje de error. La validación por campo vive en el form
 * concreto (texto recortado + coerciones); la autorización/rango los
 * enforce el boundary del server (`registrarEvento`).
 */

export function MarcoFormularioEvento({
  titulo,
  onVolver,
  children,
  footer,
}: {
  readonly titulo: string
  readonly onVolver?: (() => void) | undefined
  readonly children: ReactNode
  readonly footer: ReactNode
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 pt-4">
        {onVolver && (
          <button
            type="button"
            onClick={onVolver}
            aria-label="Volver a Alcance"
            className="text-muted-foreground text-section"
          >
            Volver a Alcance
          </button>
        )}
        <h2 className="text-section font-semibold leading-none">{titulo}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">{children}</div>
      {footer}
    </div>
  )
}

export function PieFormularioEvento({
  puedeGuardar,
  guardando,
  etiquetaBoton,
  errorValidacion,
  onGuardar,
  textoSecundario = "Validado por el servidor",
}: {
  readonly puedeGuardar: boolean
  readonly guardando: boolean
  readonly etiquetaBoton: string
  readonly errorValidacion?: string | null
  readonly onGuardar: () => void
  readonly textoSecundario?: string
}) {
  return (
    <div className="sticky bottom-0 border-t bg-card p-4 pb-safe space-y-2">
      {errorValidacion && (
        <p className="text-caption text-peligro-600" role="alert">
          {errorValidacion}
        </p>
      )}
      <Button
        type="button"
        className={cn("w-full h-12 text-support font-medium")}
        disabled={!puedeGuardar || guardando}
        onClick={onGuardar}
      >
        {guardando ? "Guardando…" : etiquetaBoton}
      </Button>
      <p className="text-center text-caption text-muted-foreground">{textoSecundario}</p>
    </div>
  )
}

export function CampoTextoEvento({
  id,
  etiqueta,
  valor,
  onCambiar,
  type = "text",
  inputMode,
  requerido = false,
  placeholder,
  min,
  max,
  step,
  error,
  descripcion,
}: {
  readonly id: string
  readonly etiqueta: string
  readonly valor: string
  readonly onCambiar: (valor: string) => void
  readonly type?: "text" | "number" | "date"
  readonly inputMode?: "decimal" | "numeric"
  readonly requerido?: boolean
  readonly placeholder?: string
  readonly min?: string | number
  readonly max?: string | number
  readonly step?: string | number
  readonly error?: string | null
  readonly descripcion?: string
}) {
  const idError = `error-${id}`
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>
        {etiqueta}
        {requerido && <span aria-hidden="true"> *</span>}
      </Label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={valor}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        required={requerido}
        aria-invalid={error !== undefined && error !== null}
        aria-describedby={error ? idError : undefined}
        onChange={(event) => onCambiar(event.target.value)}
        className="flex h-12 w-full rounded-md border border-input bg-card px-3 py-2 text-support focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-[invalid=true]:border-peligro-600"
      />
      {descripcion && <p className="text-caption text-muted-foreground">{descripcion}</p>}
      {error && (
        <p id={idError} className="text-caption text-peligro-600">
          {error}
        </p>
      )}
    </div>
  )
}

export function CampoSelectEvento<TValor extends string>({
  id,
  etiqueta,
  valor,
  opciones,
  onCambiar,
  requerido = false,
  error,
  descripcion,
}: {
  readonly id: string
  readonly etiqueta: string
  readonly valor: TValor
  readonly opciones: ReadonlyArray<{ readonly value: TValor; readonly label: string }>
  readonly onCambiar: (valor: TValor) => void
  readonly requerido?: boolean
  readonly error?: string | null
  readonly descripcion?: string
}) {
  const idError = `error-${id}`
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>
        {etiqueta}
        {requerido && <span aria-hidden="true"> *</span>}
      </Label>
      <select
        id={id}
        value={valor}
        required={requerido}
        aria-invalid={error !== undefined && error !== null}
        aria-describedby={error ? idError : undefined}
        onChange={(event) => onCambiar(event.target.value as TValor)}
        className="flex h-12 w-full rounded-md border border-input bg-card px-3 py-2 text-support focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {opciones.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>
            {opcion.label}
          </option>
        ))}
      </select>
      {descripcion && <p className="text-caption text-muted-foreground">{descripcion}</p>}
      {error && (
        <p id={idError} className="text-caption text-peligro-600">
          {error}
        </p>
      )}
    </div>
  )
}
