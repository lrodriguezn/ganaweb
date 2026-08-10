import { useState } from "react"

import type { CapturaEvento } from "../types"
import {
  CampoSelectEvento,
  CampoTextoEvento,
  MarcoFormularioEvento,
  PieFormularioEvento,
} from "./base"

/**
 * FormularioPesaje (EV-CAP-006/008, matriz §2 — Productivo / Pesaje).
 *
 * Campos reales de `pesos`: `fecha`, `pesoKg`, `tipoPeso`, `comentarios`.
 * El shell no re-implementa validación: el boundary `assertAllowedData` +
 * `validateAnimalScope` enforcen pertenencia de finca y campos permitidos.
 */
export interface FormularioPesajeProps {
  readonly numeroAnimales: number
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
  readonly datosIniciales?: CapturaEvento["datos"] | undefined
  readonly onDatosChange?: ((datos: CapturaEvento["datos"]) => void) | undefined
}

export function FormularioPesaje({
  numeroAnimales,
  onVolver,
  onGuardar,
  datosIniciales,
  onDatosChange,
}: FormularioPesajeProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(String(datosIniciales?.fecha ?? hoy))
  const [pesoKg, setPesoKg] = useState(String(datosIniciales?.pesoKg ?? ""))
  const [tipoPeso, setTipoPeso] = useState<"control" | "compra" | "venta">(
    (datosIniciales?.tipoPeso as "control" | "compra" | "venta") ?? "control",
  )
  const [comentarios, setComentarios] = useState(String(datosIniciales?.comentarios ?? ""))
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const pesoNum = Number(pesoKg)
  const puedeGuardar =
    fecha !== "" &&
    Number.isFinite(pesoNum) &&
    pesoNum > 0 &&
    /^\d+(\.\d{1,2})?$/.test(pesoKg) &&
    !guardando

  const actualizar = (datos: CapturaEvento["datos"]) => onDatosChange?.(datos)
  const cambiarFecha = (valor: string) => {
    setFecha(valor)
    actualizar({
      fecha: valor,
      pesoKg: Number(pesoKg) || null,
      tipoPeso,
      comentarios: comentarios || null,
    })
  }
  const cambiarPeso = (valor: string) => {
    setPesoKg(valor)
    actualizar({ fecha, pesoKg: Number(valor) || null, tipoPeso, comentarios: comentarios || null })
  }
  const cambiarTipoPeso = (valor: "control" | "compra" | "venta") => {
    setTipoPeso(valor)
    actualizar({
      fecha,
      pesoKg: Number(pesoKg) || null,
      tipoPeso: valor,
      comentarios: comentarios || null,
    })
  }
  const cambiarComentarios = (valor: string) => {
    setComentarios(valor)
    actualizar({ fecha, pesoKg: Number(pesoKg) || null, tipoPeso, comentarios: valor || null })
  }

  const handleGuardar = async () => {
    if (!puedeGuardar) {
      setError("Fecha y peso (>0) son obligatorios.")
      return
    }
    setError(null)
    setGuardando(true)
    try {
      await onGuardar({
        fecha,
        pesoKg: pesoNum,
        tipoPeso,
        ...(comentarios ? { comentarios } : {}),
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <MarcoFormularioEvento
      titulo="Registrar pesaje"
      onVolver={onVolver}
      footer={
        <PieFormularioEvento
          puedeGuardar={puedeGuardar}
          guardando={guardando}
          etiquetaBoton={`Guardar ${numeroAnimales} ${numeroAnimales === 1 ? "pesaje" : "pesajes"}`}
          errorValidacion={error}
          onGuardar={handleGuardar}
        />
      }
    >
      <CampoTextoEvento
        id="pesaje-fecha"
        etiqueta="Fecha"
        type="date"
        valor={fecha}
        onCambiar={cambiarFecha}
        requerido
      />
      <CampoTextoEvento
        id="pesaje-peso"
        etiqueta="Peso (kg)"
        type="number"
        inputMode="decimal"
        valor={pesoKg}
        onCambiar={cambiarPeso}
        requerido
        min={0}
        step={0.01}
        placeholder="Ej. 420"
      />
      <CampoSelectEvento
        id="pesaje-tipo"
        etiqueta="Tipo de peso"
        valor={tipoPeso}
        onCambiar={cambiarTipoPeso}
        opciones={[
          { value: "control", label: "Control" },
          { value: "compra", label: "Compra" },
          { value: "venta", label: "Venta" },
        ]}
      />
      <CampoTextoEvento
        id="pesaje-comentarios"
        etiqueta="Comentarios"
        valor={comentarios}
        onCambiar={cambiarComentarios}
        descripcion="Opcional"
      />
    </MarcoFormularioEvento>
  )
}
