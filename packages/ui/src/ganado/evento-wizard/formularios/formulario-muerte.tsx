import { useState } from "react"

import type { CapturaEvento, CatalogosParaAlcance } from "../types"
import {
  CampoCatalogoEvento,
  CampoTextoEvento,
  MarcoFormularioEvento,
  PieFormularioEvento,
  useCampoBorrador,
} from "./base"

/**
 * FormularioMuerte (matriz §2 — Movimientos / Muerte).
 * EV-CA-007: grupal bloqueado hasta migrar `registro_grupal_id`.
 * Campos reales: `fecha`, `causaMuerteId`, `comentarios`.
 */
export interface FormularioMuerteProps {
  readonly numeroAnimales: number
  readonly catalogos?: CatalogosParaAlcance
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
  readonly datosIniciales?: CapturaEvento["datos"] | undefined
  readonly onDatosChange?: ((datos: CapturaEvento["datos"]) => void) | undefined
}

export function FormularioMuerte({
  numeroAnimales,
  catalogos = { lotes: [], potreros: [], grupos: [] },
  onVolver,
  onGuardar,
  datosIniciales,
  onDatosChange,
}: FormularioMuerteProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useCampoBorrador(datosIniciales, "fecha", hoy, onDatosChange)
  const [causaMuerteId, setCausaMuerteId] = useCampoBorrador(
    datosIniciales,
    "causaMuerteId",
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

  const puedeGuardar = fecha !== "" && causaMuerteId.trim() !== "" && !guardando

  const handleGuardar = async () => {
    if (!puedeGuardar) return
    setError(null)
    setGuardando(true)
    try {
      const datos: CapturaEvento["datos"] = {
        fecha,
        causaMuerteId,
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
      <CampoCatalogoEvento
        id="mue-causa"
        etiqueta="Causa de muerte"
        valor={causaMuerteId}
        onCambiar={setCausaMuerteId}
        opciones={catalogos.causasMuerte ?? []}
        requerido
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
