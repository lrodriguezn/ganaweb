import { useState } from "react"

import type { CapturaEvento } from "../types"
import {
  CampoSelectEvento,
  CampoTextoEvento,
  MarcoFormularioEvento,
  PieFormularioEvento,
} from "./base"

/**
 * FormularioAplicacionSanitaria (matriz §2 — Sanidad / Aplicación).
 *
 * El shell delega la captura al form de sanidad (#211, ya aprobado) en
 * producción. Esta versión mínima es un SHIM de captura — los campos reales
 * `productoId`, `dosis`, `precioDosis`, `proximaDosis`, `comentarios` se
 * mapean al command `crear_evento_individual` o `crear_hijo_grupal` con
 * `evento: "aplicacion_sanitaria"`. La validación RN-002/RN-040/RN-042 la
 * enforce el dominio (`validarFechaEventoSanidad`, etc.).
 */
export interface FormularioAplicacionSanitariaProps {
  readonly numeroAnimales: number
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
}

export function FormularioAplicacionSanitaria({
  numeroAnimales,
  onVolver,
  onGuardar,
}: FormularioAplicacionSanitariaProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(hoy)
  const [productoId, setProductoId] = useState("")
  const [dosis, setDosis] = useState("1")
  const [precioDosis, setPrecioDosis] = useState("")
  const [proximaDosis, setProximaDosis] = useState("")
  const [comentarios, setComentarios] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const puedeGuardar = fecha !== "" && productoId.trim() !== "" && Number(dosis) > 0 && !guardando

  const handleGuardar = async () => {
    if (!puedeGuardar) {
      setError("Producto, fecha y dosis (>0) son obligatorios.")
      return
    }
    setError(null)
    setGuardando(true)
    try {
      const datos: CapturaEvento["datos"] = {
        fecha,
        productoId: productoId.trim(),
        dosis: Number(dosis),
        precioDosis: precioDosis ? Number(precioDosis) : null,
        proximaDosis: proximaDosis || null,
        ...(comentarios ? { comentarios } : {}),
      }
      await onGuardar(datos)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <MarcoFormularioEvento
      titulo="Registrar aplicación sanitaria"
      onVolver={onVolver}
      footer={
        <PieFormularioEvento
          puedeGuardar={puedeGuardar}
          guardando={guardando}
          etiquetaBoton={`Guardar ${numeroAnimales} ${numeroAnimales === 1 ? "aplicación" : "aplicaciones"}`}
          errorValidacion={error}
          onGuardar={handleGuardar}
        />
      }
    >
      <CampoTextoEvento
        id="san-fecha"
        etiqueta="Fecha"
        type="date"
        valor={fecha}
        onCambiar={setFecha}
        requerido
      />
      <CampoTextoEvento
        id="san-producto"
        etiqueta="Producto (ID)"
        valor={productoId}
        onCambiar={setProductoId}
        requerido
        descripcion="Validado contra el catálogo de la finca"
      />
      <div className="grid grid-cols-2 gap-3">
        <CampoTextoEvento
          id="san-dosis"
          etiqueta="Dosis"
          type="number"
          inputMode="decimal"
          valor={dosis}
          onCambiar={setDosis}
          requerido
          min={0}
          step={0.1}
        />
        <CampoTextoEvento
          id="san-precio"
          etiqueta="Precio/dosis"
          type="number"
          inputMode="decimal"
          valor={precioDosis}
          onCambiar={setPrecioDosis}
          min={0}
          step={0.01}
          descripcion="Snapshot del catálogo (RN-040)"
        />
      </div>
      <CampoTextoEvento
        id="san-proxima"
        etiqueta="Próxima dosis"
        type="date"
        valor={proximaDosis}
        onCambiar={setProximaDosis}
        descripcion="Opcional — alimenta KPI-09 de refuerzos"
      />
      <CampoTextoEvento
        id="san-comentarios"
        etiqueta="Comentarios"
        valor={comentarios}
        onCambiar={setComentarios}
        descripcion="Opcional"
      />
    </MarcoFormularioEvento>
  )
}
