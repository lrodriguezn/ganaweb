import { useState } from "react"

import type { CapturaEvento } from "../types"
import {
  CampoSelectEvento,
  CampoTextoEvento,
  MarcoFormularioEvento,
  PieFormularioEvento,
} from "./base"

/**
 * FormularioPesaje (EV-CAP-006/008, matriz §2 — Productivo / Pesaje).
 *
 * Campos reales de `pesos`: `fecha`, `pesoKg`, `tipoPeso`, `comentarios`.
 * El shell no re-implementa validación: el boundary `assertAllowedData` +
 * `validateAnimalScope` enforcen pertenencia de finca y campos permitidos.
 */
export interface FormularioPesajeProps {
  readonly numeroAnimales: number
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
}

export function FormularioPesaje({ numeroAnimales, onVolver, onGuardar }: FormularioPesajeProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(hoy)
  const [pesoKg, setPesoKg] = useState("")
  const [tipoPeso, setTipoPeso] = useState<"control" | "destete" | "preparto" | "postparto">(
    "control",
  )
  const [comentarios, setComentarios] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const pesoNum = Number(pesoKg)
  const puedeGuardar = fecha !== "" && Number.isFinite(pesoNum) && pesoNum > 0 && !guardando

  const handleGuardar = async () => {
    if (!puedeGuardar) {
      setError("Fecha y peso (>0) son obligatorios.")
      return
    }
    setError(null)
    setGuardando(true)
    try {
      await onGuardar({
        fecha,
        pesoKg: pesoNum,
        tipoPeso,
        ...(comentarios ? { comentarios } : {}),
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <MarcoFormularioEvento
      titulo="Registrar pesaje"
      onVolver={onVolver}
      footer={
        <PieFormularioEvento
          puedeGuardar={puedeGuardar}
          guardando={guardando}
          etiquetaBoton={`Guardar ${numeroAnimales} ${numeroAnimales === 1 ? "pesaje" : "pesajes"}`}
          errorValidacion={error}
          onGuardar={handleGuardar}
        />
      }
    >
      <CampoTextoEvento
        id="pesaje-fecha"
        etiqueta="Fecha"
        type="date"
        valor={fecha}
        onCambiar={setFecha}
        requerido
      />
      <CampoTextoEvento
        id="pesaje-peso"
        etiqueta="Peso (kg)"
        type="number"
        inputMode="decimal"
        valor={pesoKg}
        onCambiar={setPesoKg}
        requerido
        min={0}
        step={0.01}
        placeholder="Ej. 420"
      />
      <CampoSelectEvento
        id="pesaje-tipo"
        etiqueta="Tipo de peso"
        valor={tipoPeso}
        onCambiar={setTipoPeso}
        opciones={[
          { value: "control", label: "Control" },
          { value: "destete", label: "Destete" },
          { value: "preparto", label: "Preparto" },
          { value: "postparto", label: "Postparto" },
        ]}
      />
      <CampoTextoEvento
        id="pesaje-comentarios"
        etiqueta="Comentarios"
        valor={comentarios}
        onCambiar={setComentarios}
        descripcion="Opcional"
      />
    </MarcoFormularioEvento>
  )
}
