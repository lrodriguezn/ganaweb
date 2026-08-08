/**
 * TabsSanidad + SanidadMobileView — tabs mobile del módulo Sanidad
 * (Issue #213, RF-SANIDAD v0.2 §5, SAN-010/SAN-060).
 *
 * Reglas encapsuladas:
 * - SAN-010: 3 tabs (Catálogo | Almacén | Refuerzos); Refuerzos es el tab
 *   default. La selección cambia el contenido (no la URL).
 * - SAN-060: el tab Catálogo requiere `sanidad:editar`; el tab Almacén
 *   requiere `sanidad:crear`; el tab Refuerzos requiere `sanidad:ver`.
 *   El gating se hace por permiso (PE-001), nunca por nombre de rol.
 * - Accesibilidad: `role="tablist"` en el contenedor, `role="tab"` por
 *   cada tab, `aria-selected` refleja el tab activo.
 * - SAN-080/SAN-081: tokens semánticos; theming por tokens; sin variantes
 *   de modo oscuro en className.
 * - SAN-010/§13 item 11: la card de un Refuerzo dispara el callback
 *   `onRegistrarAplicacion(productoId, animalIds)` con la precarga
 *   ("de alerta a registro masivo en 2 taps"). El orquestador reusa
 *   los drawers de la vista desktop (U3).
 */

import { useState } from "react"

import { cn } from "../lib/utils"
import { type PermisosUsuario, tienePermiso } from "./types"

export type TabSanidadId = "catalogo" | "almacen" | "refuerzos"

export interface TabSanidadContenido {
  readonly id: TabSanidadId
  readonly label: string
}

/** Permiso por tab (PE-001: gating por permiso, nunca por rol). */
const PERMISO_POR_TAB: Readonly<
  Record<TabSanidadId, { readonly modulo: string; readonly accion: string }>
> = {
  catalogo: { modulo: "sanidad", accion: "editar" },
  almacen: { modulo: "sanidad", accion: "crear" },
  refuerzos: { modulo: "sanidad", accion: "ver" },
}

function tabPermitida(permisos: PermisosUsuario, id: TabSanidadId): boolean {
  const { modulo, accion } = PERMISO_POR_TAB[id]
  return tienePermiso(permisos, modulo, accion)
}

export interface TabsSanidadProps {
  readonly tabs: readonly TabSanidadContenido[]
  readonly value: TabSanidadId
  readonly onChange: (siguiente: TabSanidadId) => void
  readonly permisos: PermisosUsuario
  /** Lista de tabs que el caller permite renderizar; SAN-060 las filtra. */
  readonly tabsPermitidas: readonly TabSanidadId[]
}

export function TabsSanidad({ tabs, value, onChange, permisos, tabsPermitidas }: TabsSanidadProps) {
  const visibles = tabs
    .filter((tab) => tabsPermitidas.includes(tab.id))
    .filter((tab) => tabPermitida(permisos, tab.id))

  return (
    <div
      role="tablist"
      aria-label="Sección de sanidad"
      className="flex w-full gap-1 rounded-card border border-border bg-card p-1"
    >
      {visibles.map((tab) => {
        const activo = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activo}
            aria-controls={`panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex-1 min-h-[--h-touch] rounded-control px-3 py-2 text-support font-medium",
              "transition-colors duration-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              activo
                ? "bg-pasto-600 text-on-primary"
                : "text-muted-foreground hover:bg-muted/40 active:bg-muted",
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export interface SanidadMobileViewProps {
  readonly fincaNombre: string
  readonly permisos: PermisosUsuario
  /** SAN-010: tab por defecto al montar. */
  readonly tabInicial?: TabSanidadId
  /** Tabs que el caller habilita; SAN-060 los cruza con los permisos. */
  readonly tabPermitidas: readonly TabSanidadId[]
  /** Contenido por tab — el orquestador mantiene el state de selección. */
  readonly contenidoRefuerzos: React.ReactNode
  readonly contenidoCatalogo: React.ReactNode
  readonly contenidoAlmacen: React.ReactNode
}

const TABS: readonly TabSanidadContenido[] = [
  { id: "catalogo", label: "Catálogo" },
  { id: "almacen", label: "Almacén" },
  { id: "refuerzos", label: "Refuerzos" },
]

export function SanidadMobileView({
  permisos,
  tabInicial = "refuerzos",
  tabPermitidas,
  contenidoRefuerzos,
  contenidoCatalogo,
  contenidoAlmacen,
}: SanidadMobileViewProps) {
  const [tabActiva, setTabActiva] = useState<TabSanidadId>(tabInicial)

  // Garantiza que el tab inicial sea uno permitido: si el caller pasa
  // `tabInicial="refuerzos"` y el usuario no tiene sanidad:ver, caemos al
  // primer tab visible. SAN-060: nunca se renderiza contenido gated.
  const tabsVisibles = TABS.filter(
    (tab) => tabPermitidas.includes(tab.id) && tabPermitida(permisos, tab.id),
  )
  const tabEfectiva: TabSanidadId = tabsVisibles.some((tab) => tab.id === tabActiva)
    ? tabActiva
    : (tabsVisibles[0]?.id ?? tabInicial)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-section font-semibold text-foreground">Sanidad</h1>
      <TabsSanidad
        tabs={TABS}
        value={tabEfectiva}
        onChange={setTabActiva}
        permisos={permisos}
        tabsPermitidas={tabPermitidas}
      />
      <div
        id={`panel-${tabEfectiva}`}
        role="tabpanel"
        aria-labelledby={`tab-${tabEfectiva}`}
        className="flex flex-col gap-4"
      >
        {tabEfectiva === "refuerzos" ? contenidoRefuerzos : null}
        {tabEfectiva === "catalogo" ? contenidoCatalogo : null}
        {tabEfectiva === "almacen" ? contenidoAlmacen : null}
      </div>
    </div>
  )
}
