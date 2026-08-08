import { useState } from "react"

import type { CapturaEvento } from "../types"
import {
  CampoSelectEvento,
  CampoTextoEvento,
  MarcoFormularioEvento,
  PieFormularioEvento,
} from "./base"

/**
 * FormularioServicio (matriz §2 — Reproductivo / Servicio).
 *
 * Campos reales: `fecha`, `tipo` (monta/inseminacion), `padreId`/`pajuelaId`,
 * `inseminadorId`, `tipoInseminacion`, `dosis`, `precio`, `efectivo`,
 * `observaciones`. El shell captura los compartidos y deja la validación
 * (p.ej. padre XOR pajuela) al server de dominio vía `assertAllowedData`.
 */
export interface FormularioServicioProps {
  readonly numeroAnimales: number
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
}

export function FormularioServicio({
  numeroAnimales,
  onVolver,
  onGuardar,
}: FormularioServicioProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(hoy)
  const [tipo, setTipo] = useState<"monta" | "inseminacion">("inseminacion")
  const [padrePajuelaId, setPadrePajuelaId] = useState("")
  const [inseminadorId, setInseminadorId] = useState("")
  const [dosis, setDosis] = useState("1")
  const [observaciones, setObservaciones] = useState("")
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
        tipo,
        dosis: Number(dosis) || 1,
        ...(padrePajuelaId ? { [tipo === "monta" ? "padreId" : "pajuelaId"]: padrePajuelaId } : {}),
        ...(inseminadorId ? { inseminadorId } : {}),
        ...(observaciones ? { observaciones } : {}),
      }
      await onGuardar(datos)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <MarcoFormularioEvento
      titulo="Registrar servicio"
      onVolver={onVolver}
      footer={
        <PieFormularioEvento
          puedeGuardar={puedeGuardar}
          guardando={guardando}
          etiquetaBoton={`Guardar ${numeroAnimales} ${numeroAnimales === 1 ? "servicio" : "servicios"}`}
          errorValidacion={error}
          onGuardar={handleGuardar}
        />
      }
    >
      <CampoTextoEvento
        id="srv-fecha"
        etiqueta="Fecha"
        type="date"
        valor={fecha}
        onCambiar={setFecha}
        requerido
      />
      <CampoSelectEvento
        id="srv-tipo"
        etiqueta="Tipo"
        valor={tipo}
        onCambiar={setTipo}
        opciones={[
          { value: "inseminacion", label: "Inseminación" },
          { value: "monta", label: "Monta natural" },
        ]}
      />
      <CampoTextoEvento
        id="srv-padre"
        etiqueta={tipo === "monta" ? "Padre (ID)" : "Pajuela (ID)"}
        valor={padrePajuelaId}
        onCambiar={setPadrePajuelaId}
        descripcion="Opcional — el server valida pertenencia a la finca"
      />
      <CampoTextoEvento
        id="srv-inseminador"
        etiqueta="Inseminador (ID)"
        valor={inseminadorId}
        onCambiar={setInseminadorId}
        descripcion="Opcional"
      />
      <CampoTextoEvento
        id="srv-dosis"
        etiqueta="Dosis"
        type="number"
        inputMode="decimal"
        valor={dosis}
        onCambiar={setDosis}
        min={0}
        step={0.1}
      />
      <CampoTextoEvento
        id="srv-obs"
        etiqueta="Observaciones"
        valor={observaciones}
        onCambiar={setObservaciones}
        descripcion="Opcional — se captura por animal si varía"
      />
    </MarcoFormularioEvento>
  )
}
