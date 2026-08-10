import { useState } from "react"

import type { CapturaEvento, CatalogosParaAlcance } from "../types"
import {
  CampoCatalogoEvento,
  CampoSelectEvento,
  CampoTextoEvento,
  MarcoFormularioEvento,
  PieFormularioEvento,
  useCampoBorrador,
} from "./base"

/**
 * FormularioRevisionVeterinaria (matriz §2 — Sanidad / Revisión).
 * Campos reales: `fecha`, `diagnosticoId`, `tipoDiagnostico`,
 * `celoPresentado`, `comentarios`, `veterinarioId`.
 */
export interface FormularioRevisionVeterinariaProps {
  readonly numeroAnimales: number
  readonly catalogos?: CatalogosParaAlcance
  readonly onVolver: () => void
  readonly onGuardar: (datos: CapturaEvento["datos"]) => Promise<void> | void
  readonly datosIniciales?: CapturaEvento["datos"] | undefined
  readonly onDatosChange?: ((datos: CapturaEvento["datos"]) => void) | undefined
}

export function FormularioRevisionVeterinaria({
  numeroAnimales,
  catalogos = { lotes: [], potreros: [], grupos: [] },
  onVolver,
  onGuardar,
  datosIniciales,
  onDatosChange,
}: FormularioRevisionVeterinariaProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useCampoBorrador(datosIniciales, "fecha", hoy, onDatosChange)
  const [veterinarioId, setVeterinarioId] = useCampoBorrador(
    datosIniciales,
    "veterinarioId",
    "",
    onDatosChange,
  )
  const [diagnosticoId, setDiagnosticoId] = useCampoBorrador(
    datosIniciales,
    "diagnosticoId",
    "",
    onDatosChange,
  )
  const [tipoDiagnostico, setTipoDiagnostico] = useCampoBorrador(
    datosIniciales,
    "tipoDiagnostico",
    "no_aplica",
    onDatosChange,
  ) as ["no_aplica" | "vitaminas", (valor: string) => void]
  const [celoPresentado, setCeloPresentado] = useCampoBorrador(
    datosIniciales,
    "celoPresentado",
    "no",
    onDatosChange,
  ) as ["si" | "no", (valor: string) => void]
  const [comentarios, setComentarios] = useCampoBorrador(
    datosIniciales,
    "comentarios",
    "",
    onDatosChange,
  )
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const puedeGuardar =
    fecha !== "" && veterinarioId.trim() !== "" && diagnosticoId.trim() !== "" && !guardando

  const handleGuardar = async () => {
    if (!puedeGuardar) return
    setError(null)
    setGuardando(true)
    try {
      const datos: CapturaEvento["datos"] = {
        fecha,
        tipoDiagnostico,
        celoPresentado,
        veterinarioId,
        diagnosticoId,
        ...(comentarios ? { comentarios } : {}),
      }
      await onGuardar(datos)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <MarcoFormularioEvento
      titulo="Registrar revisión veterinaria"
      onVolver={onVolver}
      footer={
        <PieFormularioEvento
          puedeGuardar={puedeGuardar}
          guardando={guardando}
          etiquetaBoton={`Guardar ${numeroAnimales} ${numeroAnimales === 1 ? "revisión" : "revisiones"}`}
          errorValidacion={error}
          onGuardar={handleGuardar}
        />
      }
    >
      <CampoTextoEvento
        id="rev-fecha"
        etiqueta="Fecha"
        type="date"
        valor={fecha}
        onCambiar={setFecha}
        requerido
      />
      <CampoCatalogoEvento
        id="rev-vet"
        etiqueta="Veterinario"
        valor={veterinarioId}
        onCambiar={setVeterinarioId}
        opciones={catalogos.veterinarios ?? []}
        requerido
      />
      <CampoCatalogoEvento
        id="rev-diag"
        etiqueta="Diagnóstico"
        valor={diagnosticoId}
        onCambiar={setDiagnosticoId}
        opciones={catalogos.diagnosticos ?? []}
        requerido
      />
      <CampoSelectEvento
        id="rev-tipo-diag"
        etiqueta="Tipo de diagnóstico"
        valor={tipoDiagnostico}
        onCambiar={setTipoDiagnostico}
        opciones={[
          { value: "no_aplica", label: "No aplica" },
          { value: "vitaminas", label: "Vitaminas" },
        ]}
      />
      <CampoSelectEvento
        id="rev-celo"
        etiqueta="¿Celo presentado?"
        valor={celoPresentado}
        onCambiar={setCeloPresentado}
        opciones={[
          { value: "si", label: "Sí" },
          { value: "no", label: "No" },
        ]}
      />
      <CampoTextoEvento
        id="rev-comentarios"
        etiqueta="Comentarios"
        valor={comentarios}
        onCambiar={setComentarios}
        descripcion="Opcional"
      />
    </MarcoFormularioEvento>
  )
}
