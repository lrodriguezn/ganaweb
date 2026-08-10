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
  readonly datosIniciales?: CapturaEvento["datos"] | undefined
  readonly onDatosChange?: ((datos: CapturaEvento["datos"]) => void) | undefined
}

export function FormularioParto({
  numeroAnimales,
  onVolver,
  onGuardar,
  datosIniciales,
  onDatosChange,
}: FormularioPartoProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useCampoBorrador(datosIniciales, "fecha", hoy, onDatosChange)
  const [servicioId, setServicioId] = useCampoBorrador(
    datosIniciales,
    "servicioId",
    "",
    onDatosChange,
  )
  const [tipoParto, setTipoParto] = useCampoBorrador(
    datosIniciales,
    "tipoParto",
    "normal",
    onDatosChange,
  ) as ["normal" | "distocico" | "aborto", (valor: string) => void]
  const [machos, setMachos] = useCampoBorrador(datosIniciales, "machos", "0", onDatosChange)
  const [hembras, setHembras] = useCampoBorrador(datosIniciales, "hembras", "0", onDatosChange)
  const [muertos, setMuertos] = useCampoBorrador(datosIniciales, "muertos", "0", onDatosChange)
  const [comentarios, setComentarios] = useCampoBorrador(
    datosIniciales,
    "comentarios",
    "",
    onDatosChange,
  )
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const puedeGuardar =
    fecha !== "" &&
    numeroAnimales === 1 &&
    !guardando &&
    [machos, hembras, muertos].every((valor) => /^\d+$/.test(valor))

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
        descripcion="Opcional — seleccionable desde servicios"
      />
      <CampoSelectEvento
        id="parto-tipo"
        etiqueta="Tipo de parto"
        valor={tipoParto}
        onCambiar={setTipoParto}
        opciones={[
          { value: "normal", label: "Normal" },
          { value: "distocico", label: "Distócico" },
          { value: "aborto", label: "Aborto" },
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
          step={1}
        />
        <CampoTextoEvento
          id="parto-hembras"
          etiqueta="Hembras"
          type="number"
          inputMode="numeric"
          valor={hembras}
          onCambiar={setHembras}
          min={0}
          step={1}
        />
        <CampoTextoEvento
          id="parto-muertos"
          etiqueta="Muertos"
          type="number"
          inputMode="numeric"
          valor={muertos}
          onCambiar={setMuertos}
          min={0}
          step={1}
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
