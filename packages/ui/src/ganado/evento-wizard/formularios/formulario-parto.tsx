import { useState } from "react"

import type { CapturaEvento } from "../types"
import {
  CampoSelectEvento,
  CampoTextoEvento,
  MarcoFormularioEvento,
  PieFormularioEvento,
} from "./base"

/**
 * FormularioParto (matriz §2 — Reproductivo / Parto, EV-CAP-007 individual-only).
 *
 * El shell NO permite alcance grupal para este tipo (CATALOGO marca
 * `grupal: false`); el form igual valida que la captura no llegue con N>1
 * para defensa en profundidad.
 */
export interface FormularioPartoProps {
  readonly numeroAnimales: number
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
}

export function FormularioParto({ numeroAnimales, onVolver, onGuardar }: FormularioPartoProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(hoy)
  const [servicioId, setServicioId] = useState("")
  const [tipoParto, setTipoParto] = useState<"normal" | "asistido" | "cesarea">("normal")
  const [machos, setMachos] = useState("0")
  const [hembras, setHembras] = useState("0")
  const [muertos, setMuertos] = useState("0")
  const [comentarios, setComentarios] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const puedeGuardar =
    fecha !== "" &&
    numeroAnimales === 1 &&
    !guardando &&
    Number(machos) + Number(hembras) + Number(muertos) >= 0

  const handleGuardar = async () => {
    if (numeroAnimales !== 1) {
      setError("Parto solo admite alcance individual.")
      return
    }
    if (!puedeGuardar) {
      setError("Fecha y tipo de parto son obligatorios.")
      return
    }
    setError(null)
    setGuardando(true)
    try {
      const datos: CapturaEvento["datos"] = {
        fecha,
        tipoParto,
        machos: Number(machos) || 0,
        hembras: Number(hembras) || 0,
        muertos: Number(muertos) || 0,
        ...(servicioId ? { servicioId } : {}),
        ...(comentarios ? { comentarios } : {}),
      }
      await onGuardar(datos)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <MarcoFormularioEvento
      titulo="Registrar parto"
      onVolver={onVolver}
      footer={
        <PieFormularioEvento
          puedeGuardar={puedeGuardar}
          guardando={guardando}
          etiquetaBoton="Guardar parto"
          errorValidacion={error}
          onGuardar={handleGuardar}
        />
      }
    >
      <CampoTextoEvento
        id="parto-fecha"
        etiqueta="Fecha"
        type="date"
        valor={fecha}
        onCambiar={setFecha}
        requerido
      />
      <CampoTextoEvento
        id="parto-servicio"
        etiqueta="Servicio (ID)"
        valor={servicioId}
        onCambiar={setServicioId}
        descripcion="Opcional — vincula con un servicio previo"
      />
      <CampoSelectEvento
        id="parto-tipo"
        etiqueta="Tipo de parto"
        valor={tipoParto}
        onCambiar={setTipoParto}
        opciones={[
          { value: "normal", label: "Normal" },
          { value: "asistido", label: "Asistido" },
          { value: "cesarea", label: "Cesárea" },
        ]}
      />
      <div className="grid grid-cols-3 gap-3">
        <CampoTextoEvento
          id="parto-machos"
          etiqueta="Machos"
          type="number"
          inputMode="numeric"
          valor={machos}
          onCambiar={setMachos}
          min={0}
        />
        <CampoTextoEvento
          id="parto-hembras"
          etiqueta="Hembras"
          type="number"
          inputMode="numeric"
          valor={hembras}
          onCambiar={setHembras}
          min={0}
        />
        <CampoTextoEvento
          id="parto-muertos"
          etiqueta="Muertos"
          type="number"
          inputMode="numeric"
          valor={muertos}
          onCambiar={setMuertos}
          min={0}
        />
      </div>
      <CampoTextoEvento
        id="parto-comentarios"
        etiqueta="Comentarios"
        valor={comentarios}
        onCambiar={setComentarios}
        descripcion="Opcional"
      />
    </MarcoFormularioEvento>
  )
}
