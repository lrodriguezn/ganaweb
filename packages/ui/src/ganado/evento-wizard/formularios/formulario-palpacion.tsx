import { useState } from "react"

import type { CapturaEvento } from "../types"
import {
  CampoSelectEvento,
  CampoTextoEvento,
  MarcoFormularioEvento,
  PieFormularioEvento,
  useCampoBorrador,
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
  readonly datosIniciales?: CapturaEvento["datos"] | undefined
  readonly onDatosChange?: ((datos: CapturaEvento["datos"]) => void) | undefined
}

export function FormularioPalpacion({
  numeroAnimales,
  onVolver,
  onGuardar,
  datosIniciales,
  onDatosChange,
}: FormularioPalpacionProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useCampoBorrador(datosIniciales, "fecha", hoy, onDatosChange)
  const [servicioId, setServicioId] = useCampoBorrador(
    datosIniciales,
    "servicioId",
    "",
    onDatosChange,
  )
  const [diagnosticoId, setDiagnosticoId] = useCampoBorrador(
    datosIniciales,
    "diagnosticoId",
    "",
    onDatosChange,
  )
  const [resultado, setResultado] = useCampoBorrador(
    datosIniciales,
    "resultado",
    "pp",
    onDatosChange,
  )
  const [diasGestion, setDiasGestion] = useCampoBorrador(
    datosIniciales,
    "diasGestion",
    "",
    onDatosChange,
  )
  const [comentarios, setComentarios] = useCampoBorrador(
    datosIniciales,
    "comentarios",
    "",
    onDatosChange,
  )
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const dias = Number(diasGestion)
  const puedeGuardar =
    fecha !== "" &&
    diagnosticoId.trim() !== "" &&
    resultado !== "" &&
    diasGestion.trim() !== "" &&
    Number.isInteger(dias) &&
    dias >= 0 &&
    (resultado !== "prenada" || dias > 0) &&
    !guardando

  const handleGuardar = async () => {
    if (!puedeGuardar) return
    setError(null)
    setGuardando(true)
    try {
      const datos: CapturaEvento["datos"] = {
        fecha,
        resultado,
        ...(servicioId ? { servicioId } : {}),
        diagnosticoId,
        diasGestion: dias,
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
        descripcion="Opcional — seleccionable desde servicios"
      />
      <CampoTextoEvento
        id="palp-diag"
        etiqueta="Diagnóstico (ID)"
        valor={diagnosticoId}
        onCambiar={setDiagnosticoId}
        requerido
      />
      <CampoSelectEvento
        id="palp-resultado"
        etiqueta="Resultado"
        valor={resultado}
        onCambiar={setResultado}
        opciones={[
          { value: "pp", label: "P.P" },
          { value: "prenada", label: "Preñada" },
          { value: "ciclando", label: "Ciclando" },
          { value: "estatica", label: "Estática" },
        ]}
      />
      <CampoTextoEvento
        id="palp-dias"
        etiqueta="Días de gestación"
        type="number"
        inputMode="numeric"
        valor={diasGestion}
        onCambiar={setDiasGestion}
        requerido
        min={0}
        step={1}
        descripcion="Mayor que cero únicamente para resultado Preñada"
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
