import { useState } from "react"

import type { CapturaEvento } from "../types"
import { CampoTextoEvento, MarcoFormularioEvento, PieFormularioEvento } from "./base"

/**
 * FormularioTraslado (matriz §2 — Movimientos / Traslado).
 * Campos reales: `potreroId`, `sectorId`, `loteId`, `grupoId`, `fecha`,
 * `motivo`.
 */
export interface FormularioTrasladoProps {
  readonly numeroAnimales: number
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
}

export function FormularioTraslado({
  numeroAnimales,
  onVolver,
  onGuardar,
}: FormularioTrasladoProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(hoy)
  const [potreroId, setPotreroId] = useState("")
  const [sectorId, setSectorId] = useState("")
  const [loteId, setLoteId] = useState("")
  const [grupoId, setGrupoId] = useState("")
  const [motivo, setMotivo] = useState("")
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
        ...(potreroId ? { potreroId } : {}),
        ...(sectorId ? { sectorId } : {}),
        ...(loteId ? { loteId } : {}),
        ...(grupoId ? { grupoId } : {}),
        ...(motivo ? { motivo } : {}),
      }
      await onGuardar(datos)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <MarcoFormularioEvento
      titulo="Registrar traslado"
      onVolver={onVolver}
      footer={
        <PieFormularioEvento
          puedeGuardar={puedeGuardar}
          guardando={guardando}
          etiquetaBoton={`Guardar ${numeroAnimales} ${numeroAnimales === 1 ? "traslado" : "traslados"}`}
          errorValidacion={error}
          onGuardar={handleGuardar}
        />
      }
    >
      <CampoTextoEvento
        id="tra-fecha"
        etiqueta="Fecha"
        type="date"
        valor={fecha}
        onCambiar={setFecha}
        requerido
      />
      <div className="grid grid-cols-2 gap-3">
        <CampoTextoEvento
          id="tra-potrero"
          etiqueta="Potrero (ID)"
          valor={potreroId}
          onCambiar={setPotreroId}
        />
        <CampoTextoEvento
          id="tra-sector"
          etiqueta="Sector (ID)"
          valor={sectorId}
          onCambiar={setSectorId}
        />
        <CampoTextoEvento id="tra-lote" etiqueta="Lote (ID)" valor={loteId} onCambiar={setLoteId} />
        <CampoTextoEvento
          id="tra-grupo"
          etiqueta="Grupo (ID)"
          valor={grupoId}
          onCambiar={setGrupoId}
        />
      </div>
      <CampoTextoEvento
        id="tra-motivo"
        etiqueta="Motivo"
        valor={motivo}
        onCambiar={setMotivo}
        descripcion="Opcional"
      />
    </MarcoFormularioEvento>
  )
}
