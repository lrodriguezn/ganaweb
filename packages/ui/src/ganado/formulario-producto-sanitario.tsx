import { useState } from "react"

import { cn } from "../lib/utils"
import { Button } from "../primitives/button"
import { Input } from "../primitives/input"
import { Label } from "../primitives/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../primitives/select"

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

export interface FormularioProductoSanitarioProps {
  readonly inicial?: FormularioProductoSanitarioInicial
  /** SAN-020: errores del dominio con forma `{ campo, detalle }`. */
  readonly errores?: readonly { readonly campo: string; readonly detalle: string }[]
  readonly procesando?: boolean
  readonly onEnviar: (datos: Readonly<Record<string, unknown>>) => void
  readonly onCancelar?: () => void
}

function aTexto(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined) return ""
  return String(valor)
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
  const [tipoTratamiento, setTipoTratamiento] = useState(inicial?.tipoTratamiento ?? "no_reproductivo")
  const [precioDosis, setPrecioDosis] = useState(aTexto(inicial?.precioDosis))
  const [comentarios, setComentarios] = useState(inicial?.comentarios ?? "")

  const errorDe = (campo: string) => errores?.find((errorItem) => errorItem.campo === campo)

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
      <div className="flex flex-col gap-1">
        <Label htmlFor="producto-sanitario-codigo">Código *</Label>
        <Input
          id="producto-sanitario-codigo"
          value={codigo}
          onChange={(evento) => setCodigo(evento.target.value)}
          aria-invalid={errorDe("codigo") !== undefined}
          aria-describedby={errorDe("codigo") ? "error-codigo" : undefined}
          disabled={procesando}
        />
        {errorDe("codigo") ? (
          <p id="error-codigo" className="text-caption text-peligro-600">
            {errorDe("codigo")?.detalle}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="producto-sanitario-descripcion">Descripción *</Label>
        <Input
          id="producto-sanitario-descripcion"
          value={descripcion}
          onChange={(evento) => setDescripcion(evento.target.value)}
          aria-invalid={errorDe("descripcion") !== undefined}
          aria-describedby={errorDe("descripcion") ? "error-descripcion" : undefined}
          disabled={procesando}
        />
        {errorDe("descripcion") ? (
          <p id="error-descripcion" className="text-caption text-peligro-600">
            {errorDe("descripcion")?.detalle}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="producto-sanitario-tipo">Tipo de tratamiento</Label>
        <Select value={tipoTratamiento} onValueChange={setTipoTratamiento} disabled={procesando}>
          <SelectTrigger
            id="producto-sanitario-tipo"
            aria-invalid={errorDe("tipo_tratamiento") !== undefined}
            aria-describedby={errorDe("tipo_tratamiento") ? "error-tipo" : undefined}
          >
            <SelectValue placeholder="Selecciona el tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reproductivo">Reproductivo</SelectItem>
            <SelectItem value="no_reproductivo">No reproductivo</SelectItem>
            <SelectItem value="vacuna">Vacuna</SelectItem>
          </SelectContent>
        </Select>
        {errorDe("tipo_tratamiento") ? (
          <p id="error-tipo" className="text-caption text-peligro-600">
            {errorDe("tipo_tratamiento")?.detalle}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="producto-sanitario-ml-mg">ml/mg por dosis</Label>
          <Input
            id="producto-sanitario-ml-mg"
            inputMode="decimal"
            value={mlMgPorDosis}
            onChange={(evento) => setMlMgPorDosis(evento.target.value)}
            aria-invalid={errorDe("ml_mg_por_dosis") !== undefined}
            aria-describedby={errorDe("ml_mg_por_dosis") ? "error-ml-mg" : undefined}
            disabled={procesando}
          />
          {errorDe("ml_mg_por_dosis") ? (
            <p id="error-ml-mg" className="text-caption text-peligro-600">
              {errorDe("ml_mg_por_dosis")?.detalle}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="producto-sanitario-precio">Precio por dosis</Label>
          <Input
            id="producto-sanitario-precio"
            inputMode="decimal"
            value={precioDosis}
            onChange={(evento) => setPrecioDosis(evento.target.value)}
            aria-invalid={errorDe("precio_dosis") !== undefined}
            aria-describedby={errorDe("precio_dosis") ? "error-precio" : undefined}
            disabled={procesando}
          />
          {errorDe("precio_dosis") ? (
            <p id="error-precio" className="text-caption text-peligro-600">
              {errorDe("precio_dosis")?.detalle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="producto-sanitario-comentarios">Comentarios</Label>
        <textarea
          id="producto-sanitario-comentarios"
          className={cn(
            "flex min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-support",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          value={comentarios}
          onChange={(evento) => setComentarios(evento.target.value)}
          aria-invalid={errorDe("comentarios") !== undefined}
          aria-describedby={errorDe("comentarios") ? "error-comentarios" : undefined}
          disabled={procesando}
        />
        {errorDe("comentarios") ? (
          <p id="error-comentarios" className="text-caption text-peligro-600">
            {errorDe("comentarios")?.detalle}
          </p>
        ) : null}
      </div>

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
