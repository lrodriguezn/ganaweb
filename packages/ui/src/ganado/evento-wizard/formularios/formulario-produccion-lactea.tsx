import { useState } from "react"

import type { CapturaEvento } from "../types"
import {
  CampoTextoEvento,
  MarcoFormularioEvento,
  PieFormularioEvento,
  useCampoBorrador,
} from "./base"

/**
 * FormularioProduccionLactea (matriz §2 — Productivo / Producción láctea).
 * Campos reales: `fecha`, `cantidadAm`, `cantidadPm`, `potreroId`,
 * `sectorId`, `loteId`, `grupoId`. Solo se capturan los compartidos
 * (mañana/tarde/identificadores).
 */
export interface FormularioProduccionLacteaProps {
  readonly numeroAnimales: number
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
  readonly datosIniciales?: CapturaEvento["datos"] | undefined
  readonly onDatosChange?: ((datos: CapturaEvento["datos"]) => void) | undefined
}

export function FormularioProduccionLactea({
  numeroAnimales,
  onVolver,
  onGuardar,
  datosIniciales,
  onDatosChange,
}: FormularioProduccionLacteaProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useCampoBorrador(datosIniciales, "fecha", hoy, onDatosChange)
  const [cantidadAm, setCantidadAm] = useCampoBorrador(
    datosIniciales,
    "cantidadAm",
    "",
    onDatosChange,
  )
  const [cantidadPm, setCantidadPm] = useCampoBorrador(
    datosIniciales,
    "cantidadPm",
    "",
    onDatosChange,
  )
  const [loteId, setLoteId] = useCampoBorrador(datosIniciales, "loteId", "", onDatosChange)
  const [potreroId, setPotreroId] = useCampoBorrador(datosIniciales, "potreroId", "", onDatosChange)
  const [sectorId, setSectorId] = useCampoBorrador(datosIniciales, "sectorId", "", onDatosChange)
  const [grupoId, setGrupoId] = useCampoBorrador(datosIniciales, "grupoId", "", onDatosChange)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const am = Number(cantidadAm)
  const pm = Number(cantidadPm)
  const puedeGuardar =
    fecha !== "" &&
    cantidadAm.trim() !== "" &&
    cantidadPm.trim() !== "" &&
    Number.isFinite(am) &&
    Number.isFinite(pm) &&
    am >= 0 &&
    pm >= 0 &&
    /^\d+(\.\d{1,2})?$/.test(cantidadAm) &&
    /^\d+(\.\d{1,2})?$/.test(cantidadPm) &&
    !guardando

  const handleGuardar = async () => {
    if (!puedeGuardar) {
      setError("Fecha y cantidades AM y PM (mayores o iguales a cero) son obligatorias.")
      return
    }
    setError(null)
    setGuardando(true)
    try {
      const datos: CapturaEvento["datos"] = {
        fecha,
        cantidadAm: am,
        cantidadPm: pm,
        ...(loteId ? { loteId } : {}),
        ...(potreroId ? { potreroId } : {}),
        ...(sectorId ? { sectorId } : {}),
        ...(grupoId ? { grupoId } : {}),
      }
      await onGuardar(datos)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <MarcoFormularioEvento
      titulo="Registrar producción láctea"
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
        id="pl-fecha"
        etiqueta="Fecha"
        type="date"
        valor={fecha}
        onCambiar={setFecha}
        requerido
      />
      <div className="grid grid-cols-2 gap-3">
        <CampoTextoEvento
          id="pl-am"
          etiqueta="Cantidad AM (L)"
          type="number"
          inputMode="decimal"
          valor={cantidadAm}
          onCambiar={setCantidadAm}
          min={0}
          step={0.1}
        />
        <CampoTextoEvento
          id="pl-pm"
          etiqueta="Cantidad PM (L)"
          type="number"
          inputMode="decimal"
          valor={cantidadPm}
          onCambiar={setCantidadPm}
          min={0}
          step={0.1}
        />
      </div>
      <CampoTextoEvento
        id="pl-lote"
        etiqueta="Lote (ID)"
        valor={loteId}
        onCambiar={setLoteId}
        descripcion="Opcional"
      />
      <div className="grid grid-cols-2 gap-3">
        <CampoTextoEvento
          id="pl-potrero"
          etiqueta="Potrero (ID)"
          valor={potreroId}
          onCambiar={setPotreroId}
          descripcion="Opcional; seleccionable desde catálogo"
        />
        <CampoTextoEvento
          id="pl-sector"
          etiqueta="Sector (ID)"
          valor={sectorId}
          onCambiar={setSectorId}
          descripcion="Opcional; seleccionable desde catálogo"
        />
        <CampoTextoEvento
          id="pl-grupo"
          etiqueta="Grupo (ID)"
          valor={grupoId}
          onCambiar={setGrupoId}
          descripcion="Opcional; seleccionable desde catálogo"
        />
      </div>
    </MarcoFormularioEvento>
  )
}
