import { type FormEvent, useState } from "react"

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
 * FormularioEntradaAlmacen — captura de una entrada de stock (Issue #210,
 * SAN-030). Componente presentacional reutilizable (SAN-014): la validación
 * de dominio vive en `packages/dominio`/`packages/aplicacion` (U1/U2) y los
 * errores `{campo: detalle}` llegan por props tras el round-trip al servidor
 * (patrón `fieldErrors` de animal-crud).
 *
 * Append-only (SAN-032/D-008): incluye la nota de contexto — en v1 las
 * entradas no se editan ni se anulan; las correcciones son entradas nuevas.
 */

export interface ProductoEntradaAlmacen {
  readonly id: string
  readonly codigo: string
  readonly descripcion: string
}

/** Datos que el formulario entrega al guardar (ya parseados). */
export interface DatosEntradaAlmacen {
  readonly productoId: string
  /** ISO YYYY-MM-DD. */
  readonly fecha: string
  /** Entero > 0 (SAN-030). */
  readonly dosis: number
  readonly precioPorDosis: number | null
  readonly comentario: string | null
}

export interface FormularioEntradaAlmacenProps {
  readonly productos: readonly ProductoEntradaAlmacen[]
  /**
   * Errores de campo de la última sumisión, por nombre de campo
   * (`fecha`, `dosis`, `producto`, `precio_por_dosis`). Vienen del servidor.
   */
  readonly errores?: Record<string, string>
  /** Valor inicial del campo fecha (ISO). Por defecto, hoy. */
  readonly fechaInicial?: string
  readonly onGuardar: (datos: DatosEntradaAlmacen) => void | Promise<void>
}

function hoyIso(): string {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, "0")
  const dia = String(ahora.getDate()).padStart(2, "0")
  return `${ahora.getFullYear()}-${mes}-${dia}`
}

function ErrorCampo({ id, mensaje }: { readonly id: string; readonly mensaje: string | undefined }) {
  if (!mensaje) return null
  return (
    <p id={id} role="alert" className="text-caption text-danger-600">
      {mensaje}
    </p>
  )
}

export function FormularioEntradaAlmacen({
  productos,
  errores = {},
  fechaInicial,
  onGuardar,
}: FormularioEntradaAlmacenProps) {
  const [productoId, setProductoId] = useState("")
  const [fecha, setFecha] = useState(fechaInicial ?? hoyIso())
  const [dosis, setDosis] = useState("")
  const [precio, setPrecio] = useState("")
  const [comentario, setComentario] = useState("")
  const [guardando, setGuardando] = useState(false)

  const puedeGuardar = productoId !== "" && !guardando

  const manejarEnviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!puedeGuardar) return
    setGuardando(true)
    try {
      await onGuardar({
        productoId,
        fecha,
        dosis: Number(dosis),
        precioPorDosis: precio.trim() === "" ? null : Number(precio),
        comentario: comentario.trim() === "" ? null : comentario.trim(),
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={manejarEnviar}>
      <div className="space-y-1.5">
        <Label htmlFor="entrada-producto">Producto</Label>
        <Select value={productoId} onValueChange={setProductoId}>
          <SelectTrigger
            id="entrada-producto"
            aria-invalid={errores.producto ? true : undefined}
            aria-describedby={errores.producto ? "entrada-producto-error" : undefined}
          >
            <SelectValue placeholder="Selecciona producto" />
          </SelectTrigger>
          <SelectContent>
            {productos.map((producto) => (
              <SelectItem key={producto.id} value={producto.id}>
                {producto.codigo} · {producto.descripcion}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ErrorCampo id="entrada-producto-error" mensaje={errores.producto} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="entrada-fecha">Fecha</Label>
        <Input
          id="entrada-fecha"
          type="date"
          value={fecha}
          onChange={(evento) => setFecha(evento.target.value)}
          aria-invalid={errores.fecha ? true : undefined}
          aria-describedby={errores.fecha ? "entrada-fecha-error" : undefined}
        />
        <ErrorCampo id="entrada-fecha-error" mensaje={errores.fecha} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="entrada-dosis">Dosis</Label>
        <Input
          id="entrada-dosis"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={dosis}
          onChange={(evento) => setDosis(evento.target.value)}
          aria-invalid={errores.dosis ? true : undefined}
          aria-describedby={errores.dosis ? "entrada-dosis-error" : undefined}
        />
        <ErrorCampo id="entrada-dosis-error" mensaje={errores.dosis} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="entrada-precio">Precio por dosis (opcional)</Label>
        <Input
          id="entrada-precio"
          type="number"
          inputMode="decimal"
          value={precio}
          onChange={(evento) => setPrecio(evento.target.value)}
          aria-invalid={errores.precio_por_dosis ? true : undefined}
          aria-describedby={errores.precio_por_dosis ? "entrada-precio-error" : undefined}
        />
        <ErrorCampo id="entrada-precio-error" mensaje={errores.precio_por_dosis} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="entrada-comentario">Comentario (opcional)</Label>
        <Input
          id="entrada-comentario"
          type="text"
          value={comentario}
          onChange={(evento) => setComentario(evento.target.value)}
        />
      </div>

      {/* SAN-032/D-008: nota de contexto append-only. */}
      <p className="text-caption text-muted-foreground">
        En v1 las entradas de almacén no se editan ni se anulan. Para corregir el stock, registra
        una nueva entrada.
      </p>

      <Button type="submit" disabled={!puedeGuardar}>
        {guardando ? "Registrando…" : "Registrar entrada"}
      </Button>
    </form>
  )
}
