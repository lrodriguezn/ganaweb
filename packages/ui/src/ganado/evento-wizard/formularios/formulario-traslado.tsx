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
 * FormularioTraslado (matriz §2 — Movimientos / Traslado).
 * Campos reales: `potreroId`, `sectorId`, `loteId`, `grupoId`, `fecha`,
 * `motivo`.
 */
export interface FormularioTrasladoProps {
  readonly numeroAnimales: number
  readonly catalogos?: CatalogosParaAlcance
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
  readonly datosIniciales?: CapturaEvento["datos"] | undefined
  readonly onDatosChange?: ((datos: CapturaEvento["datos"]) => void) | undefined
}

export function FormularioTraslado({
  numeroAnimales,
  catalogos = { lotes: [], potreros: [], grupos: [] },
  onVolver,
  onGuardar,
  datosIniciales,
  onDatosChange,
}: FormularioTrasladoProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useCampoBorrador(datosIniciales, "fecha", hoy, onDatosChange)
  const [potreroId, setPotreroId] = useCampoBorrador(datosIniciales, "potreroId", "", onDatosChange)
  const [sectorId, setSectorId] = useCampoBorrador(datosIniciales, "sectorId", "", onDatosChange)
  const [loteId, setLoteId] = useCampoBorrador(datosIniciales, "loteId", "", onDatosChange)
  const [grupoId, setGrupoId] = useCampoBorrador(datosIniciales, "grupoId", "", onDatosChange)
  const [motivo, setMotivo] = useCampoBorrador(datosIniciales, "motivo", "", onDatosChange)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const puedeGuardar =
    fecha !== "" &&
    potreroId.trim() !== "" &&
    sectorId.trim() !== "" &&
    loteId.trim() !== "" &&
    grupoId.trim() !== "" &&
    motivo.trim() !== "" &&
    !guardando

  const handleGuardar = async () => {
    if (!puedeGuardar) return
    setError(null)
    setGuardando(true)
    try {
      const datos: CapturaEvento["datos"] = {
        fecha,
        potreroId,
        sectorId,
        loteId,
        grupoId,
        motivo,
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
        <CampoCatalogoEvento
          id="tra-potrero"
          etiqueta="Potrero"
          valor={potreroId}
          onCambiar={setPotreroId}
          opciones={catalogos.potreros}
          requerido
        />
        <CampoCatalogoEvento
          id="tra-sector"
          etiqueta="Sector"
          valor={sectorId}
          onCambiar={setSectorId}
          opciones={catalogos.sectores ?? []}
          requerido
        />
        <CampoCatalogoEvento
          id="tra-lote"
          etiqueta="Lote"
          valor={loteId}
          onCambiar={setLoteId}
          opciones={catalogos.lotes}
          requerido
        />
        <CampoCatalogoEvento
          id="tra-grupo"
          etiqueta="Grupo"
          valor={grupoId}
          onCambiar={setGrupoId}
          opciones={catalogos.grupos}
          requerido
        />
      </div>
      <CampoTextoEvento
        id="tra-motivo"
        etiqueta="Motivo"
        valor={motivo}
        onCambiar={setMotivo}
        requerido
      />
    </MarcoFormularioEvento>
  )
}
