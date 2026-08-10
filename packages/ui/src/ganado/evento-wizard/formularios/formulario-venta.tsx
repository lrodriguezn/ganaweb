import { useState } from "react"

import type { CapturaEvento } from "../types"
import {
  CampoTextoEvento,
  MarcoFormularioEvento,
  PieFormularioEvento,
  useCampoBorrador,
} from "./base"

/**
 * FormularioVenta (matriz §2 — Movimientos / Venta).
 * Campos reales: `fecha`, `motivoVentaId`, `lugarVentaId`, `pesoVentaKg`,
 * `precio`, `comprador`, `comentarios`.
 */
export interface FormularioVentaProps {
  readonly numeroAnimales: number
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
  readonly datosIniciales?: CapturaEvento["datos"] | undefined
  readonly onDatosChange?: ((datos: CapturaEvento["datos"]) => void) | undefined
}

export function FormularioVenta({
  numeroAnimales,
  onVolver,
  onGuardar,
  datosIniciales,
  onDatosChange,
}: FormularioVentaProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useCampoBorrador(datosIniciales, "fecha", hoy, onDatosChange)
  const [motivoVentaId, setMotivoVentaId] = useCampoBorrador(
    datosIniciales,
    "motivoVentaId",
    "",
    onDatosChange,
  )
  const [lugarVentaId, setLugarVentaId] = useCampoBorrador(
    datosIniciales,
    "lugarVentaId",
    "",
    onDatosChange,
  )
  const [pesoVentaKg, setPesoVentaKg] = useCampoBorrador(
    datosIniciales,
    "pesoVentaKg",
    "",
    onDatosChange,
  )
  const [precio, setPrecio] = useCampoBorrador(datosIniciales, "precio", "", onDatosChange)
  const [comprador, setComprador] = useCampoBorrador(datosIniciales, "comprador", "", onDatosChange)
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
    motivoVentaId.trim() !== "" &&
    lugarVentaId.trim() !== "" &&
    comprador.trim() !== "" &&
    Number(pesoVentaKg) > 0 &&
    /^\d+(\.\d{1,2})?$/.test(pesoVentaKg) &&
    Number(precio) >= 0 &&
    /^\d+(\.\d{1,2})?$/.test(precio) &&
    !guardando

  const handleGuardar = async () => {
    if (!puedeGuardar) return
    setError(null)
    setGuardando(true)
    try {
      const datos: CapturaEvento["datos"] = {
        fecha,
        motivoVentaId,
        lugarVentaId,
        pesoVentaKg: Number(pesoVentaKg),
        precio: Number(precio),
        comprador,
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
          requerido
          descripcion="Seleccionable desde catálogo"
        />
        <CampoTextoEvento
          id="ven-lugar"
          etiqueta="Lugar (ID)"
          valor={lugarVentaId}
          onCambiar={setLugarVentaId}
          requerido
          descripcion="Seleccionable desde catálogo"
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
          requerido
          min={0}
          step={0.01}
        />
        <CampoTextoEvento
          id="ven-precio"
          etiqueta="Precio"
          type="number"
          inputMode="decimal"
          valor={precio}
          onCambiar={setPrecio}
          requerido
          min={0}
          step={0.01}
        />
      </div>
      <CampoTextoEvento
        id="ven-comprador"
        etiqueta="Comprador"
        valor={comprador}
        onCambiar={setComprador}
        requerido
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
