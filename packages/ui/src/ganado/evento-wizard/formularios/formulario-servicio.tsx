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
 * FormularioServicio (matriz §2 — Reproductivo / Servicio).
 *
 * Campos reales: `fecha`, `tipo` (monta/inseminacion), `padreId`/`pajuelaId`,
 * `inseminadorId`, `tipoInseminacion`, `dosis`, `precio`, `efectivo`,
 * `observaciones`. El shell captura los compartidos y deja la validación
 * (p.ej. padre XOR pajuela) al server de dominio vía `assertAllowedData`.
 */
export interface FormularioServicioProps {
  readonly numeroAnimales: number
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
  readonly datosIniciales?: CapturaEvento["datos"] | undefined
  readonly onDatosChange?: ((datos: CapturaEvento["datos"]) => void) | undefined
}

export function FormularioServicio({
  numeroAnimales,
  onVolver,
  onGuardar,
  datosIniciales,
  onDatosChange,
}: FormularioServicioProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useCampoBorrador(datosIniciales, "fecha", hoy, onDatosChange)
  const [tipo, setTipo] = useCampoBorrador(datosIniciales, "tipo", "1", onDatosChange) as [
    "0" | "1",
    (valor: string) => void,
  ]
  const [padreId, setPadreId] = useCampoBorrador(datosIniciales, "padreId", "", onDatosChange)
  const [pajuelaId, setPajuelaId] = useCampoBorrador(datosIniciales, "pajuelaId", "", onDatosChange)
  const [inseminadorId, setInseminadorId] = useCampoBorrador(
    datosIniciales,
    "inseminadorId",
    "",
    onDatosChange,
  )
  const [dosis, setDosis] = useCampoBorrador(datosIniciales, "dosis", "1", onDatosChange)
  const [tipoInseminacion, setTipoInseminacion] = useCampoBorrador(
    datosIniciales,
    "tipoInseminacion",
    "",
    onDatosChange,
  )
  const [precio, setPrecio] = useCampoBorrador(datosIniciales, "precio", "", onDatosChange)
  const [efectivo, setEfectivo] = useCampoBorrador(datosIniciales, "efectivo", "", onDatosChange)
  const [observaciones, setObservaciones] = useCampoBorrador(
    datosIniciales,
    "observaciones",
    "",
    onDatosChange,
  )
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const referencia = tipo === "0" ? padreId : pajuelaId
  const puedeGuardar =
    fecha !== "" &&
    tipoInseminacion.trim() !== "" &&
    referencia.trim() !== "" &&
    Number(dosis) > 0 &&
    !guardando

  const handleGuardar = async () => {
    if (!puedeGuardar) return
    setError(null)
    setGuardando(true)
    try {
      const datos: CapturaEvento["datos"] = {
        fecha,
        tipo,
        dosis: Number(dosis),
        ...(padreId ? { padreId } : {}),
        ...(pajuelaId ? { pajuelaId } : {}),
        ...(inseminadorId ? { inseminadorId } : {}),
        tipoInseminacion,
        ...(precio ? { precio: Number(precio) } : {}),
        ...(efectivo ? { efectivo: Number(efectivo) } : {}),
        ...(observaciones ? { observaciones } : {}),
      }
      await onGuardar(datos)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <MarcoFormularioEvento
      titulo="Registrar servicio"
      onVolver={onVolver}
      footer={
        <PieFormularioEvento
          puedeGuardar={puedeGuardar}
          guardando={guardando}
          etiquetaBoton={`Guardar ${numeroAnimales} ${numeroAnimales === 1 ? "servicio" : "servicios"}`}
          errorValidacion={error}
          onGuardar={handleGuardar}
        />
      }
    >
      <CampoTextoEvento
        id="srv-fecha"
        etiqueta="Fecha"
        type="date"
        valor={fecha}
        onCambiar={setFecha}
        requerido
      />
      <CampoSelectEvento
        id="srv-tipo"
        etiqueta="Tipo"
        valor={tipo}
        onCambiar={setTipo}
        opciones={[
          { value: "0", label: "Monta natural" },
          { value: "1", label: "Inseminación" },
        ]}
      />
      <CampoTextoEvento
        id="srv-padre"
        etiqueta="Padre (ID)"
        valor={padreId}
        onCambiar={setPadreId}
        requerido={tipo === "0"}
        descripcion="Obligatorio para monta natural; seleccionable desde catálogo"
      />
      <CampoTextoEvento
        id="srv-pajuela"
        etiqueta="Pajuela (ID)"
        valor={pajuelaId}
        onCambiar={setPajuelaId}
        requerido={tipo === "1"}
        descripcion="Obligatorio para inseminación; seleccionable desde catálogo"
      />
      <CampoTextoEvento
        id="srv-inseminador"
        etiqueta="Inseminador (ID)"
        valor={inseminadorId}
        onCambiar={setInseminadorId}
        descripcion="Seleccionable desde veterinarios con es_inseminador"
      />
      <CampoTextoEvento
        id="srv-tipo-inseminacion"
        etiqueta="Tipo de inseminación"
        valor={tipoInseminacion}
        onCambiar={setTipoInseminacion}
        requerido
        descripcion="Temporalmente texto"
      />
      <CampoTextoEvento
        id="srv-dosis"
        etiqueta="Dosis"
        type="number"
        inputMode="decimal"
        valor={dosis}
        onCambiar={setDosis}
        min={0}
        step={0.0001}
      />
      <div className="grid grid-cols-2 gap-3">
        <CampoTextoEvento
          id="srv-precio"
          etiqueta="Precio"
          type="number"
          inputMode="decimal"
          valor={precio}
          onCambiar={setPrecio}
          min={0}
          step={0.01}
          descripcion="Opcional"
        />
        <CampoTextoEvento
          id="srv-efectivo"
          etiqueta="Efectivo"
          type="number"
          valor={efectivo}
          onCambiar={setEfectivo}
          descripcion="Opcional"
        />
      </div>
      <CampoTextoEvento
        id="srv-obs"
        etiqueta="Observaciones"
        valor={observaciones}
        onCambiar={setObservaciones}
        descripcion="Opcional — se captura por animal si varía"
      />
    </MarcoFormularioEvento>
  )
}
