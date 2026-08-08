import { useState } from "react"

import type { CapturaEvento } from "../types"
import {
  CampoSelectEvento,
  CampoTextoEvento,
  MarcoFormularioEvento,
  PieFormularioEvento,
} from "./base"

/**
 * FormularioRevisionVeterinaria (matriz §2 — Sanidad / Revisión).
 * Campos reales: `fecha`, `diagnosticoId`, `tipoDiagnostico`,
 * `celoPresentado`, `comentarios`, `veterinarioId`.
 */
export interface FormularioRevisionVeterinariaProps {
  readonly numeroAnimales: number
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
}

export function FormularioRevisionVeterinaria({
  numeroAnimales,
  onVolver,
  onGuardar,
}: FormularioRevisionVeterinariaProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(hoy)
  const [veterinarioId, setVeterinarioId] = useState("")
  const [diagnosticoId, setDiagnosticoId] = useState("")
  const [tipoDiagnostico, setTipoDiagnostico] = useState<"reproductivo" | "general" | "otro">(
    "general",
  )
  const [celoPresentado, setCeloPresentado] = useState<"si" | "no" | "no_aplica">("no_aplica")
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
        tipoDiagnostico,
        celoPresentado,
        ...(veterinarioId ? { veterinarioId } : {}),
        ...(diagnosticoId ? { diagnosticoId } : {}),
        ...(comentarios ? { comentarios } : {}),
      }
      await onGuardar(datos)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <MarcoFormularioEvento
      titulo="Registrar revisión veterinaria"
      onVolver={onVolver}
      footer={
        <PieFormularioEvento
          puedeGuardar={puedeGuardar}
          guardando={guardando}
          etiquetaBoton={`Guardar ${numeroAnimales} ${numeroAnimales === 1 ? "revisión" : "revisiones"}`}
          errorValidacion={error}
          onGuardar={handleGuardar}
        />
      }
    >
      <CampoTextoEvento
        id="rev-fecha"
        etiqueta="Fecha"
        type="date"
        valor={fecha}
        onCambiar={setFecha}
        requerido
      />
      <CampoTextoEvento
        id="rev-vet"
        etiqueta="Veterinario (ID)"
        valor={veterinarioId}
        onCambiar={setVeterinarioId}
        descripcion="Opcional"
      />
      <CampoTextoEvento
        id="rev-diag"
        etiqueta="Diagnóstico (ID)"
        valor={diagnosticoId}
        onCambiar={setDiagnosticoId}
      />
      <CampoSelectEvento
        id="rev-tipo-diag"
        etiqueta="Tipo de diagnóstico"
        valor={tipoDiagnostico}
        onCambiar={setTipoDiagnostico}
        opciones={[
          { value: "general", label: "General" },
          { value: "reproductivo", label: "Reproductivo" },
          { value: "otro", label: "Otro" },
        ]}
      />
      <CampoSelectEvento
        id="rev-celo"
        etiqueta="¿Celo presentado?"
        valor={celoPresentado}
        onCambiar={setCeloPresentado}
        opciones={[
          { value: "no_aplica", label: "No aplica" },
          { value: "si", label: "Sí" },
          { value: "no", label: "No" },
        ]}
      />
      <CampoTextoEvento
        id="rev-comentarios"
        etiqueta="Comentarios"
        valor={comentarios}
        onCambiar={setComentarios}
        descripcion="Opcional"
      />
    </MarcoFormularioEvento>
  )
}
