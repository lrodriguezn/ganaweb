import { useState } from "react"

import type { CapturaEvento } from "../types"
import { CampoTextoEvento, MarcoFormularioEvento, PieFormularioEvento } from "./base"

/**
 * FormularioCondicionCorporal (matriz §2 — Productivo / Condición corporal).
 * EV-CA-007: grupal bloqueado hasta migrar `registro_grupal_id` (matriz §2).
 * Campos reales: `condicionId`, `puntaje`, `fecha`.
 */
export interface FormularioCondicionCorporalProps {
  readonly numeroAnimales: number
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
}

export function FormularioCondicionCorporal({
  numeroAnimales,
  onVolver,
  onGuardar,
}: FormularioCondicionCorporalProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(hoy)
  const [condicionId, setCondicionId] = useState("")
  const [puntaje, setPuntaje] = useState("3")
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const puntajeNum = Number(puntaje)
  const puedeGuardar = fecha !== "" && puntajeNum >= 1 && puntajeNum <= 5 && !guardando

  const handleGuardar = async () => {
    if (!puedeGuardar) {
      setError("Fecha y puntaje (1-5) son obligatorios.")
      return
    }
    setError(null)
    setGuardando(true)
    try {
      const datos: CapturaEvento["datos"] = {
        fecha,
        puntaje: puntajeNum,
        ...(condicionId ? { condicionId } : {}),
      }
      await onGuardar(datos)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <MarcoFormularioEvento
      titulo="Registrar condición corporal"
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
        id="cc-fecha"
        etiqueta="Fecha"
        type="date"
        valor={fecha}
        onCambiar={setFecha}
        requerido
      />
      <CampoTextoEvento
        id="cc-condicion"
        etiqueta="Condición (ID)"
        valor={condicionId}
        onCambiar={setCondicionId}
        descripcion="Catálogo de condición corporal"
      />
      <CampoTextoEvento
        id="cc-puntaje"
        etiqueta="Puntaje (1-5)"
        type="number"
        inputMode="numeric"
        valor={puntaje}
        onCambiar={setPuntaje}
        requerido
        min={1}
        max={5}
        step={0.5}
      />
    </MarcoFormularioEvento>
  )
}
