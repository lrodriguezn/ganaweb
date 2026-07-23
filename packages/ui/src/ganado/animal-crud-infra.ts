import { useEffect, useState } from "react"

/**
 * Tracks navigator.onLine reactively. SSR-safe: defaults to true.
 * CA-UI-005: the sync hint in the footer renders only when offline.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    // Sync with current state on mount
    setOnline(
      typeof navigator === "undefined" ? true : navigator.onLine,
    )
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return online
}

// ---------------------------------------------------------------------------
// Section layout system (design.md §Section Layout System)
// ---------------------------------------------------------------------------

export interface SectionDef {
  id: string
  title: string
  gridClasses?: string
  kind?: "collapsible"
}

/**
 * SECTION_LAYOUT — 5 entries: 4 visible sections + 1 collapsible.
 * Each entry defines the per-section proportional grid.
 */
export const SECTION_LAYOUT: readonly SectionDef[] = [
  {
    id: "identificacion",
    title: "Identificación",
    gridClasses: "grid-cols-[1fr_1.4fr_1fr]",
  },
  {
    id: "caracteristicas",
    title: "Características",
    gridClasses: "grid-cols-[1fr_1fr_1.2fr]",
  },
  {
    id: "origen",
    title: "Origen",
    gridClasses: "grid-cols-[260px_1fr_1fr]",
  },
  {
    id: "ubicacion",
    title: "Ubicación",
    gridClasses: "grid-cols-[1fr_1fr_1fr_1fr]",
  },
  {
    id: "detalles",
    title: "Detalles adicionales",
    kind: "collapsible",
  },
] as const

// ---------------------------------------------------------------------------
// Field → section resolver
// ---------------------------------------------------------------------------

/**
 * Maps each form field to the section it belongs in.
 * Fields not listed here default to "detalles" (collapsible block).
 */
const FIELD_SECTION_MAP: Record<string, string> = {
  // IDENTIFICACIÓN
  codigo: "identificacion",
  nombre: "identificacion",
  codigoArete: "identificacion",
  // CARACTERÍSTICAS
  sexoKey: "caracteristicas",
  raza: "caracteristicas",
  fechaNacimiento: "caracteristicas",
  color: "caracteristicas",
  calidad: "caracteristicas",
  // ORIGEN
  origen: "origen",
  madreId: "origen",
  padreId: "origen",
  fechaCompra: "origen",
  precioCompra: "origen",
  pesoCompra: "origen",
  lugarCompra: "origen",
  // UBICACIÓN
  potreroId: "ubicacion",
  sectorId: "ubicacion",
  loteId: "ubicacion",
  grupoId: "ubicacion",
  // DETALLES — explicit for resolver clarity
  codigoRfid: "detalles",
  tipoExplotacionId: "detalles",
  propietarioId: "detalles",
  hierroId: "detalles",
  numeroPezones: "detalles",
  tatuado: "detalles",
  herrado: "detalles",
  descornado: "detalles",
  esDeMonta: "detalles",
  comentarios: "detalles",
}

export function sectionFor(fieldName: string): string {
  return FIELD_SECTION_MAP[fieldName] ?? "detalles"
}

// ---------------------------------------------------------------------------
// Detail field names (fields inside the collapsible block)
// ---------------------------------------------------------------------------

/**
 * DETAIL_FIELD_NAMES — every field rendered inside the "Detalles
 * adicionales" collapsible. Used for:
 * - defaultOpen computation on edit
 * - count badge ("N con datos")
 * - force-open on validation error (CA-UI-010)
 */
export const DETAIL_FIELD_NAMES: ReadonlySet<string> = new Set([
  "codigoRfid",
  "tipoExplotacionId",
  "propietarioId",
  "hierroId",
  "numeroPezones",
  "tatuado",
  "herrado",
  "descornado",
  "esDeMonta",
  "comentarios",
])
