import { useState } from "react"

import type { CapturaEvento } from "../types"
import { CampoTextoEvento, MarcoFormularioEvento, PieFormularioEvento } from "./base"

/**
 * FormularioMuerte (matriz §2 — Movimientos / Muerte).
 * EV-CA-007: grupal bloqueado hasta migrar `registro_grupal_id`.
 * Campos reales: `fecha`, `causaMuerteId`, `comentarios`.
 */
export interface FormularioMuerteProps {
  readonly numeroAnimales: number
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
}

export function FormularioMuerte({ numeroAnimales, onVolver, onGuardar }: FormularioMuerteProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(hoy)
  const [causaMuerteId, setCausaMuerteId] = useState("")
  const [comentarios, setComentarios] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const puedeGuardar = fecha !== "" && !guardando

  const handleGuardar = async () => {
    if (!puedeGuardar) return
    setError(null)
    setGuardando(true)
    try {
      const datos: CapturaEvento["datos"] = {
        fecha,
        ...(causaMuerteId ? { causaMuerteId } : {}),
        ...(comentarios ? { comentarios } : {}),
      }
      await onGuardar(datos)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <MarcoFormularioEvento
      titulo="Registrar muerte"
      onVolver={onVolver}
      footer={
        <PieFormularioEvento
          puedeGuardar={puedeGuardar}
          guardando={guardando}
          etiquetaBoton={`Guardar ${numeroAnimales} ${numeroAnimales === 1 ? "registro" : "registros"}`}
          errorValidacion={error}
          onGuardar={handleGuardar}
        />
      }
    >
      <CampoTextoEvento
        id="mue-fecha"
        etiqueta="Fecha"
        type="date"
        valor={fecha}
        onCambiar={setFecha}
        requerido
      />
      <CampoTextoEvento
        id="mue-causa"
        etiqueta="Causa de muerte (ID)"
        valor={causaMuerteId}
        onCambiar={setCausaMuerteId}
        descripcion="Catálogo de causas"
      />
      <CampoTextoEvento
        id="mue-comentarios"
        etiqueta="Comentarios"
        valor={comentarios}
        onCambiar={setComentarios}
        descripcion="Opcional"
      />
    </MarcoFormularioEvento>
  )
}
