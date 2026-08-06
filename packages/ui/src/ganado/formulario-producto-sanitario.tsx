import { useState } from "react"

import { cn } from "../lib/utils"
import { Button } from "../primitives/button"
import { Input } from "../primitives/input"
import { Label } from "../primitives/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../primitives/select"

/**
 * Formulario crear/editar del producto sanitario (Issue #209, SAN-020).
 *
 * Campos del catálogo: `codigo`*, `descripcion`*, `ml_mg_por_dosis`,
 * `tipo_tratamiento` (enum §3), `precio_dosis`, `comentarios`. Los errores
 * del dominio llegan con forma `{ campo, detalle }` y se renderizan bajo su
 * campo con cableado ARIA (`aria-invalid` + `aria-describedby`).
 *
 * El formulario envía texto recortado (numéricos vacíos → null): la
 * validación y coerción pertenecen al dominio
 * (`validarDatosProductoSanitario`). Primitivas existentes (IA-003); tokens
 * del diseño, theming sin variantes de modo (SAN-080/081, T-004).
 */

/** Valores iniciales del formulario (edición); numéricos como texto. */
export interface FormularioProductoSanitarioInicial {
  readonly codigo?: string
  readonly descripcion?: string
  readonly mlMgPorDosis?: number | null
  readonly tipoTratamiento?: string
  readonly precioDosis?: number | null
  readonly comentarios?: string | null
}

export interface ErrorCampoProductoSanitario {
  readonly campo: string
  readonly detalle: string
}

export interface FormularioProductoSanitarioProps {
  readonly inicial?: FormularioProductoSanitarioInicial
  /** SAN-020: errores del dominio con forma `{ campo, detalle }`. */
  readonly errores?: readonly ErrorCampoProductoSanitario[]
  readonly procesando?: boolean
  readonly onEnviar: (datos: Readonly<Record<string, unknown>>) => void
  readonly onCancelar?: () => void
}

function aTexto(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined) return ""
  return String(valor)
}

/** SAN-020: el detalle del error bajo su campo, asociado por id (ARIA). */
function ParrafoError({
  id,
  error,
}: {
  readonly id: string
  readonly error: ErrorCampoProductoSanitario | undefined
}) {
  if (error === undefined) return null
  return (
    <p id={id} className="text-caption text-peligro-600">
      {error.detalle}
    </p>
  )
}

/** Campo de texto con etiqueta, estado de error y cableado ARIA. */
function CampoTexto({
  id,
  etiqueta,
  valor,
  onCambiar,
  error,
  procesando,
  inputMode,
  multilinea = false,
}: {
  readonly id: string
  readonly etiqueta: string
  readonly valor: string
  readonly onCambiar: (valor: string) => void
  readonly error: ErrorCampoProductoSanitario | undefined
  readonly procesando: boolean
  readonly inputMode?: "decimal"
  readonly multilinea?: boolean
}) {
  const idError = `error-${id}`
  const propiedadesAria = {
    "aria-invalid": error !== undefined,
    "aria-describedby": error !== undefined ? idError : undefined,
  }
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{etiqueta}</Label>
      {multilinea ? (
        <textarea
          id={id}
          className={cn(
            "flex min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-support",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          value={valor}
          onChange={(evento) => onCambiar(evento.target.value)}
          disabled={procesando}
          {...propiedadesAria}
        />
      ) : (
        <Input
          id={id}
          value={valor}
          onChange={(evento) => onCambiar(evento.target.value)}
          disabled={procesando}
          {...(inputMode !== undefined ? { inputMode } : {})}
          {...propiedadesAria}
        />
      )}
      <ParrafoError id={idError} error={error} />
    </div>
  )
}

/**
 * Formulario crear/editar del producto sanitario (SAN-020). Envía texto
 * recortado (los numéricos vacíos viajan como null): la validación y
 * coerción pertenecen al dominio (`validarDatosProductoSanitario`).
 */
export function FormularioProductoSanitario({
  inicial,
  errores,
  procesando = false,
  onEnviar,
  onCancelar,
}: FormularioProductoSanitarioProps) {
  const [codigo, setCodigo] = useState(inicial?.codigo ?? "")
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "")
  const [mlMgPorDosis, setMlMgPorDosis] = useState(aTexto(inicial?.mlMgPorDosis))
  const [tipoTratamiento, setTipoTratamiento] = useState(
    inicial?.tipoTratamiento ?? "no_reproductivo",
  )
  const [precioDosis, setPrecioDosis] = useState(aTexto(inicial?.precioDosis))
  const [comentarios, setComentarios] = useState(inicial?.comentarios ?? "")

  const errorDe = (campo: string) => errores?.find((errorItem) => errorItem.campo === campo)
  const errorTipo = errorDe("tipo_tratamiento")

  const enviar = () => {
    onEnviar({
      codigo: codigo.trim(),
      descripcion: descripcion.trim(),
      mlMgPorDosis: mlMgPorDosis.trim() === "" ? null : mlMgPorDosis.trim(),
      tipoTratamiento,
      precioDosis: precioDosis.trim() === "" ? null : precioDosis.trim(),
      comentarios: comentarios.trim() === "" ? null : comentarios.trim(),
    })
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        enviar()
      }}
    >
      <CampoTexto
        id="producto-sanitario-codigo"
        etiqueta="Código *"
        valor={codigo}
        onCambiar={setCodigo}
        error={errorDe("codigo")}
        procesando={procesando}
      />
      <CampoTexto
        id="producto-sanitario-descripcion"
        etiqueta="Descripción *"
        valor={descripcion}
        onCambiar={setDescripcion}
        error={errorDe("descripcion")}
        procesando={procesando}
      />

      <div className="flex flex-col gap-1">
        <Label htmlFor="producto-sanitario-tipo">Tipo de tratamiento</Label>
        <Select value={tipoTratamiento} onValueChange={setTipoTratamiento} disabled={procesando}>
          <SelectTrigger
            id="producto-sanitario-tipo"
            aria-invalid={errorTipo !== undefined}
            aria-describedby={errorTipo !== undefined ? "error-producto-sanitario-tipo" : undefined}
          >
            <SelectValue placeholder="Selecciona el tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reproductivo">Reproductivo</SelectItem>
            <SelectItem value="no_reproductivo">No reproductivo</SelectItem>
            <SelectItem value="vacuna">Vacuna</SelectItem>
          </SelectContent>
        </Select>
        <ParrafoError id="error-producto-sanitario-tipo" error={errorTipo} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          id="producto-sanitario-ml-mg"
          etiqueta="ml/mg por dosis"
          valor={mlMgPorDosis}
          onCambiar={setMlMgPorDosis}
          error={errorDe("ml_mg_por_dosis")}
          procesando={procesando}
          inputMode="decimal"
        />
        <CampoTexto
          id="producto-sanitario-precio"
          etiqueta="Precio por dosis"
          valor={precioDosis}
          onCambiar={setPrecioDosis}
          error={errorDe("precio_dosis")}
          procesando={procesando}
          inputMode="decimal"
        />
      </div>

      <CampoTexto
        id="producto-sanitario-comentarios"
        etiqueta="Comentarios"
        valor={comentarios}
        onCambiar={setComentarios}
        error={errorDe("comentarios")}
        procesando={procesando}
        multilinea
      />

      <div className="flex items-center justify-end gap-2">
        {onCancelar ? (
          <Button type="button" variant="outline" onClick={onCancelar} disabled={procesando}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={procesando}>
          {procesando ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  )
}
