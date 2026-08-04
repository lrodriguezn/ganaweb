/**
 * Creación inline contextual de maestros (issue #150, CM-043).
 *
 * Diálogo mínimo para crear un maestro POR FINCA desde los formularios de
 * animales (`SelectConCreacion`): sólo los campos requeridos de la familia
 * (nombre). Usa la MISMA server function y el MISMO permiso
 * (`configuracion:crear`) que el CRUD — sin permiso el affordance no se
 * renderiza (el gating lo aplica el formulario de animales).
 *
 * Alcance cableado (ver nuevo.tsx/editar.tsx): `lugarCompra`, único maestro
 * por finca que hoy usa `SelectConCreacion` en el formulario de animales.
 * Los catálogos GLOBALES (raza/color/calidad) NO tienen creación (CM-025).
 */

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label } from "@ganaweb/ui"
import { useState } from "react"
import { crearMaestroAction } from "../server/configuracion-actions.js"

export type MaestroInlineCreable = "propietarios" | "hierros" | "lugares_compras"

const TITULOS: Readonly<Record<MaestroInlineCreable, string>> = {
  propietarios: "Nuevo propietario",
  hierros: "Nuevo hierro",
  lugares_compras: "Nuevo lugar de compra",
}

export interface RegistroMaestroCreado {
  readonly id: string
  readonly nombre: string
}

export interface CrearMaestroInlineProps {
  readonly fincaId: string
  readonly maestro: MaestroInlineCreable
  readonly onCerrar: () => void
  /** Recibe el registro creado para agregarlo al selector y seleccionarlo. */
  readonly onCreado: (registro: RegistroMaestroCreado) => void
}

export function CrearMaestroInline({
  fincaId,
  maestro,
  onCerrar,
  onCreado,
}: CrearMaestroInlineProps) {
  const [nombre, setNombre] = useState("")
  const [errorNombre, setErrorNombre] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    setGuardando(true)
    setErrorNombre(null)
    const respuesta = await crearMaestroAction({
      data: { fincaId, maestro, datos: { nombre } },
    }).catch(() => ({ tipo: "error", detalle: "No se pudo crear el registro." }) as const)
    setGuardando(false)

    if (respuesta.tipo === "creado") {
      onCreado({ id: respuesta.id, nombre: nombre.trim() })
      return
    }
    if (respuesta.tipo === "validacion") {
      const primero = respuesta.errores.find((error) => error.campo === "nombre")
      setErrorNombre(primero?.detalle ?? "Revisa los datos ingresados.")
      return
    }
    if (respuesta.tipo === "conflicto") {
      setErrorNombre("Ya existe un registro con ese nombre.")
      return
    }
    if (respuesta.tipo === "permiso_denegado") {
      setErrorNombre("No tienes permiso para crear registros.")
      return
    }
    setErrorNombre("detalle" in respuesta ? respuesta.detalle : "No se pudo crear el registro.")
  }

  const idCampo = `crear-inline-${maestro}-nombre`
  return (
    <Dialog open onOpenChange={(abierto) => !abierto && !guardando && onCerrar()}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{TITULOS[maestro]}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(evento) => {
            evento.preventDefault()
            void guardar()
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={idCampo}>
              Nombre<span aria-hidden="true"> *</span>
            </Label>
            <Input
              id={idCampo}
              name="nombre"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              {...(errorNombre
                ? { "aria-invalid": "true" as const, "aria-describedby": `${idCampo}-error` }
                : {})}
            />
            {errorNombre ? (
              <p id={`${idCampo}-error`} role="alert" className="text-caption text-danger-600">
                {errorNombre}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando…" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
