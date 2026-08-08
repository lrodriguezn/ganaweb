import { useState } from "react"

import type { CapturaEvento } from "../types"
import { CampoTextoEvento, MarcoFormularioEvento, PieFormularioEvento } from "./base"

/**
 * FormularioProduccionLactea (matriz §2 — Productivo / Producción láctea).
 * Campos reales: `fecha`, `cantidadAm`, `cantidadPm`, `potreroId`,
 * `sectorId`, `loteId`, `grupoId`. Solo se capturan los compartidos
 * (mañana/tarde/identificadores).
 */
export interface FormularioProduccionLacteaProps {
  readonly numeroAnimales: number
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
}

export function FormularioProduccionLactea({
  numeroAnimales,
  onVolver,
  onGuardar,
}: FormularioProduccionLacteaProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(hoy)
  const [cantidadAm, setCantidadAm] = useState("")
  const [cantidadPm, setCantidadPm] = useState("")
  const [loteId, setLoteId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const am = Number(cantidadAm) || 0
  const pm = Number(cantidadPm) || 0
  const puedeGuardar = fecha !== "" && (am > 0 || pm > 0) && !guardando

  const handleGuardar = async () => {
    if (!puedeGuardar) {
      setError("Fecha y al menos un turno con cantidad > 0 son obligatorios.")
      return
    }
    setError(null)
    setGuardando(true)
    try {
      const datos: CapturaEvento["datos"] = {
        fecha,
        cantidadAm: am,
        cantidadPm: pm,
        ...(loteId ? { loteId } : {}),
      }
      await onGuardar(datos)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <MarcoFormularioEvento
      titulo="Registrar producción láctea"
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
        id="pl-fecha"
        etiqueta="Fecha"
        type="date"
        valor={fecha}
        onCambiar={setFecha}
        requerido
      />
      <div className="grid grid-cols-2 gap-3">
        <CampoTextoEvento
          id="pl-am"
          etiqueta="Cantidad AM (L)"
          type="number"
          inputMode="decimal"
          valor={cantidadAm}
          onCambiar={setCantidadAm}
          min={0}
          step={0.1}
        />
        <CampoTextoEvento
          id="pl-pm"
          etiqueta="Cantidad PM (L)"
          type="number"
          inputMode="decimal"
          valor={cantidadPm}
          onCambiar={setCantidadPm}
          min={0}
          step={0.1}
        />
      </div>
      <CampoTextoEvento
        id="pl-lote"
        etiqueta="Lote (ID)"
        valor={loteId}
        onCambiar={setLoteId}
        descripcion="Opcional"
      />
    </MarcoFormularioEvento>
  )
}
