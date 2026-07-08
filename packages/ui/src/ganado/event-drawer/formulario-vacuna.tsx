import { Check, ChevronDown, Square } from "lucide-react"
import { useMemo, useState } from "react"

import { cn } from "../../lib/utils"
import { Button } from "../../primitives/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../primitives/collapsible"
import { DrawerHeader, DrawerTitle } from "../../primitives/drawer"
import { Input } from "../../primitives/input"
import { Label } from "../../primitives/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../primitives/select"
import type { AnimalResumen } from "../types"

/**
 * FormularioVacuna — paso 3 del EventDrawer para vacunas/tratamientos.
 * Spec: diseno_paginas_detallado.md §4 (variante vacuna) y
 * especificaciones_diseno_css.md §6.6.
 *
 * Patrones clave:
 * - Valor común para el lote (producto, dosis, próxima) + checkboxes por animal
 * - Productos con stock visible, leídos del catálogo LOCAL (prop, no fetch)
 * - Chips de atajo para próxima dosis (+21 días / +6 meses / +1 año)
 * - Opcionales tras "Más detalles" (Collapsible)
 * - Botón sticky con el conteo real de la selección
 */

export interface ProductoSanitario {
  id: string
  descripcion: string
  mlPorDosis?: number | null
  dosisDisponibles: number
}

const ATAJOS_PROXIMA = [
  { label: "+21 días", dias: 21 },
  { label: "+6 meses", dias: 182 },
  { label: "+1 año", dias: 365 },
] as const

export interface FormularioVacunaProps {
  animales: AnimalResumen[]
  /** Catálogo desde la réplica del dispositivo — nunca de red */
  productos?: ProductoSanitario[]
  onGuardar: (datos: {
    productoId: string
    dosis: number
    proximaDosis: string | null // ISO date
    comentarios?: string
    animalesIds: string[]
  }) => Promise<void>
  onVolver?: () => void
}

export function FormularioVacuna({
  animales,
  productos = [],
  onGuardar,
  onVolver,
}: FormularioVacunaProps) {
  const [productoId, setProductoId] = useState<string | undefined>(undefined)
  const [dosis, setDosis] = useState("1")
  const [proximaDias, setProximaDias] = useState<number | null>(182)
  const [comentarios, setComentarios] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set(animales.map((a) => a.id)))

  const producto = productos.find((p) => p.id === productoId)
  const total = seleccion.size
  const todosSeleccionados = total === animales.length

  const proximaDosisISO = useMemo(() => {
    if (proximaDias === null) return null
    const fecha = new Date()
    fecha.setDate(fecha.getDate() + proximaDias)
    return fecha.toISOString().slice(0, 10)
  }, [proximaDias])

  const toggleAnimal = (id: string) =>
    setSeleccion((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleTodos = () =>
    setSeleccion(todosSeleccionados ? new Set() : new Set(animales.map((a) => a.id)))

  const puedeGuardar = Boolean(productoId) && total > 0 && !guardando

  const handleGuardar = async () => {
    if (!productoId) return
    setGuardando(true)
    try {
      await onGuardar({
        productoId,
        dosis: Number(dosis) || 1,
        proximaDosis: proximaDosisISO,
        ...(comentarios ? { comentarios } : {}),
        animalesIds: [...seleccion],
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <DrawerHeader className="pb-2">
        <DrawerTitle className="text-section flex items-center gap-2">
          {onVolver && (
            <button
              type="button"
              onClick={onVolver}
              aria-label="Cambiar animales"
              className="text-muted-foreground"
            >
              ‹
            </button>
          )}
          Registrar vacuna
        </DrawerTitle>
      </DrawerHeader>

      {/* Cuerpo scrolleable */}
      <div className="flex-1 overflow-y-auto px-4 space-y-4">
        {/* Producto con stock visible */}
        <div className="space-y-1.5">
          <Label htmlFor="producto" className="text-support font-medium">
            Producto
          </Label>
          <Select
            {...(productoId !== undefined ? { value: productoId } : {})}
            onValueChange={setProductoId}
          >
            <SelectTrigger id="producto" className="h-12 text-body">
              <SelectValue placeholder="Elegir producto" />
            </SelectTrigger>
            <SelectContent>
              {productos.map((p) => (
                <SelectItem key={p.id} value={p.id} disabled={p.dosisDisponibles <= 0}>
                  {p.descripcion}
                  {p.dosisDisponibles <= 0 ? " — Agotado" : ` — ${p.dosisDisponibles} dosis`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Dosis: numérico de campo */}
          <div className="space-y-1.5">
            <Label htmlFor="dosis" className="text-support font-medium">
              Dosis{producto?.mlPorDosis ? ` (${producto.mlPorDosis} ml)` : ""}
            </Label>
            <Input
              id="dosis"
              inputMode="decimal"
              value={dosis}
              onChange={(e) => setDosis(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              className="h-12 text-right num text-lg"
            />
          </div>

          {/* Próxima dosis: chips de atajo */}
          <div className="space-y-1.5">
            <span className="text-support font-medium block">Próxima dosis</span>
            <div className="flex flex-wrap gap-1.5">
              {ATAJOS_PROXIMA.map(({ label, dias }) => (
                <button
                  key={dias}
                  type="button"
                  onClick={() => setProximaDias(proximaDias === dias ? null : dias)}
                  aria-pressed={proximaDias === dias}
                  className={cn(
                    "rounded-full px-2.5 py-1.5 text-caption font-medium border",
                    proximaDias === dias
                      ? "bg-pasto-100 text-pasto-700 border-pasto-600"
                      : "bg-card text-muted-foreground border-input",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Opcionales colapsados */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1 text-support text-primary font-medium">
            Más detalles
            <ChevronDown aria-hidden="true" className="size-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-1.5">
            <Label htmlFor="comentarios" className="text-support font-medium">
              Comentarios
            </Label>
            <Input
              id="comentarios"
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              className="h-12"
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Selección por animal */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-support font-medium">Animales ({animales.length})</span>
            <button
              type="button"
              onClick={toggleTodos}
              className="text-caption text-primary font-medium"
            >
              {todosSeleccionados ? "quitar todos" : "seleccionar todos"}
            </button>
          </div>
          <ul className="space-y-1.5">
            {animales.map((animal) => {
              const activo = seleccion.has(animal.id)
              return (
                <li key={animal.id}>
                  <button
                    type="button"
                    onClick={() => toggleAnimal(animal.id)}
                    aria-pressed={activo}
                    className={cn(
                      "w-full min-h-[--h-touch] rounded-lg border px-3 py-2",
                      "flex items-center justify-between text-support",
                      activo
                        ? "border-pasto-600 bg-card"
                        : "border-input bg-card text-muted-foreground",
                    )}
                  >
                    <span>
                      {animal.codigoAnimal}
                      {animal.nombreAnimal && ` · ${animal.nombreAnimal}`}
                    </span>
                    {activo ? (
                      <Check aria-hidden="true" className="size-4 text-pasto-600" />
                    ) : (
                      <Square aria-hidden="true" className="size-4 text-muted-foreground" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* Footer sticky con conteo real */}
      <div className="sticky bottom-0 border-t bg-card p-4 pb-safe">
        <Button
          className="w-full h-12 text-support font-medium"
          disabled={!puedeGuardar}
          onClick={handleGuardar}
        >
          {guardando ? "Guardando…" : `Guardar ${total} ${total === 1 ? "registro" : "registros"}`}
        </Button>
        <p className="text-center text-caption text-muted-foreground mt-1.5">
          Se sincronizará al recuperar señal
        </p>
      </div>
    </div>
  )
}
