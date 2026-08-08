import { useState } from "react"

import type { CapturaEvento } from "../types"
import { CampoTextoEvento, MarcoFormularioEvento, PieFormularioEvento } from "./base"

/**
 * FormularioVenta (matriz §2 — Movimientos / Venta).
 * Campos reales: `fecha`, `motivoVentaId`, `lugarVentaId`, `pesoVentaKg`,
 * `precio`, `comprador`, `comentarios`.
 */
export interface FormularioVentaProps {
  readonly numeroAnimales: number
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
}

export function FormularioVenta({ numeroAnimales, onVolver, onGuardar }: FormularioVentaProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(hoy)
  const [motivoVentaId, setMotivoVentaId] = useState("")
  const [lugarVentaId, setLugarVentaId] = useState("")
  const [pesoVentaKg, setPesoVentaKg] = useState("")
  const [precio, setPrecio] = useState("")
  const [comprador, setComprador] = useState("")
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
        ...(motivoVentaId ? { motivoVentaId } : {}),
        ...(lugarVentaId ? { lugarVentaId } : {}),
        ...(pesoVentaKg ? { pesoVentaKg: Number(pesoVentaKg) } : {}),
        ...(precio ? { precio: Number(precio) } : {}),
        ...(comprador ? { comprador } : {}),
        ...(comentarios ? { comentarios } : {}),
      }
      await onGuardar(datos)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <MarcoFormularioEvento
      titulo="Registrar venta"
      onVolver={onVolver}
      footer={
        <PieFormularioEvento
          puedeGuardar={puedeGuardar}
          guardando={guardando}
          etiquetaBoton={`Guardar ${numeroAnimales} ${numeroAnimales === 1 ? "venta" : "ventas"}`}
          errorValidacion={error}
          onGuardar={handleGuardar}
        />
      }
    >
      <CampoTextoEvento
        id="ven-fecha"
        etiqueta="Fecha"
        type="date"
        valor={fecha}
        onCambiar={setFecha}
        requerido
      />
      <div className="grid grid-cols-2 gap-3">
        <CampoTextoEvento
          id="ven-motivo"
          etiqueta="Motivo (ID)"
          valor={motivoVentaId}
          onCambiar={setMotivoVentaId}
        />
        <CampoTextoEvento
          id="ven-lugar"
          etiqueta="Lugar (ID)"
          valor={lugarVentaId}
          onCambiar={setLugarVentaId}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CampoTextoEvento
          id="ven-peso"
          etiqueta="Peso (kg)"
          type="number"
          inputMode="decimal"
          valor={pesoVentaKg}
          onCambiar={setPesoVentaKg}
          min={0}
          step={0.1}
        />
        <CampoTextoEvento
          id="ven-precio"
          etiqueta="Precio"
          type="number"
          inputMode="decimal"
          valor={precio}
          onCambiar={setPrecio}
          min={0}
          step={0.01}
        />
      </div>
      <CampoTextoEvento
        id="ven-comprador"
        etiqueta="Comprador"
        valor={comprador}
        onCambiar={setComprador}
      />
      <CampoTextoEvento
        id="ven-comentarios"
        etiqueta="Comentarios"
        valor={comentarios}
        onCambiar={setComentarios}
        descripcion="Opcional"
      />
    </MarcoFormularioEvento>
  )
}
