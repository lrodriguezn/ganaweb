import { useState } from "react"

import type { CapturaEvento } from "../types"
import {
  CampoSelectEvento,
  CampoTextoEvento,
  MarcoFormularioEvento,
  PieFormularioEvento,
} from "./base"

/**
 * FormularioPalpacion (matriz §2 — Reproductivo / Palpación).
 * Campos reales: `servicioId`, `fecha`, `diagnosticoId`, `resultado`,
 * `diasGestion`, `comentarios`. El shell captura los compartidos.
 */
export interface FormularioPalpacionProps {
  readonly numeroAnimales: number
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
}

export function FormularioPalpacion({
  numeroAnimales,
  onVolver,
  onGuardar,
}: FormularioPalpacionProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(hoy)
  const [servicioId, setServicioId] = useState("")
  const [diagnosticoId, setDiagnosticoId] = useState("")
  const [resultado, setResultado] = useState<"vacia" | "prenada" | "no_aplica">("vacia")
  const [diasGestion, setDiasGestion] = useState("")
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
        resultado,
        ...(servicioId ? { servicioId } : {}),
        ...(diagnosticoId ? { diagnosticoId } : {}),
        ...(diasGestion ? { diasGestion: Number(diasGestion) } : {}),
        ...(comentarios ? { comentarios } : {}),
      }
      await onGuardar(datos)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <MarcoFormularioEvento
      titulo="Registrar palpación"
      onVolver={onVolver}
      footer={
        <PieFormularioEvento
          puedeGuardar={puedeGuardar}
          guardando={guardando}
          etiquetaBoton={`Guardar ${numeroAnimales} ${numeroAnimales === 1 ? "palpación" : "palpaciones"}`}
          errorValidacion={error}
          onGuardar={handleGuardar}
        />
      }
    >
      <CampoTextoEvento
        id="palp-fecha"
        etiqueta="Fecha"
        type="date"
        valor={fecha}
        onCambiar={setFecha}
        requerido
      />
      <CampoTextoEvento
        id="palp-servicio"
        etiqueta="Servicio (ID)"
        valor={servicioId}
        onCambiar={setServicioId}
        descripcion="Opcional — vincula con un servicio previo"
      />
      <CampoTextoEvento
        id="palp-diag"
        etiqueta="Diagnóstico (ID)"
        valor={diagnosticoId}
        onCambiar={setDiagnosticoId}
      />
      <CampoSelectEvento
        id="palp-resultado"
        etiqueta="Resultado"
        valor={resultado}
        onCambiar={setResultado}
        opciones={[
          { value: "vacia", label: "Vacía" },
          { value: "prenada", label: "Preñada" },
          { value: "no_aplica", label: "No aplica" },
        ]}
      />
      <CampoTextoEvento
        id="palp-dias"
        etiqueta="Días de gestación"
        type="number"
        inputMode="numeric"
        valor={diasGestion}
        onCambiar={setDiasGestion}
        descripcion="Si aplica (variable por animal)"
      />
      <CampoTextoEvento
        id="palp-comentarios"
        etiqueta="Comentarios"
        valor={comentarios}
        onCambiar={setComentarios}
        descripcion="Opcional"
      />
    </MarcoFormularioEvento>
  )
}
