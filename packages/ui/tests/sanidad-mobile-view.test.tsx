// @vitest-environment jsdom

/**
 * TabsSanidad + SanidadMobileView — tabs mobile del módulo Sanidad
 * (Issue #213, RF-SANIDAD v0.2 §5, SAN-010/SAN-060).
 *
 * Reglas cubiertas (TS-001):
 * - SAN-010: 3 tabs Catálogo | Almacén | Refuerzos; Refuerzos es default.
 * - SAN-010/§13 item 11: la selección cambia el contenido (no la URL).
 * - SAN-060: cada tab respeta su prop de permisos (RBAC por permiso).
 * - Accesibilidad: `role="tablist"` + `aria-selected` correcto en cada tab.
 * - Header "Sanidad" siempre visible.
 */

import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  SanidadMobileView,
  type TabSanidadContenido,
  type TabSanidadId,
  TabsSanidad,
} from "../src/ganado/sanidad-mobile-view"
import { crearPermisos } from "../src/ganado/types"

afterEach(() => cleanup())

const PERMISOS_COMPLETOS = crearPermisos([
  { modulo: "sanidad", accion: "ver" },
  { modulo: "sanidad", accion: "crear" },
  { modulo: "sanidad", accion: "editar" },
  { modulo: "sanidad", accion: "anular" },
])
const PERMISOS_SIN_EDITAR = crearPermisos([
  { modulo: "sanidad", accion: "ver" },
  { modulo: "sanidad", accion: "crear" },
])

const TABS: readonly TabSanidadContenido[] = [
  { id: "catalogo", label: "Catálogo" },
  { id: "almacen", label: "Almacén" },
  { id: "refuerzos", label: "Refuerzos" },
]

function renderTabs(
  value: TabSanidadId = "refuerzos",
  onChange: (next: TabSanidadId) => void = vi.fn(),
  permisos = PERMISOS_COMPLETOS,
) {
  return render(
    <TabsSanidad
      tabs={TABS}
      value={value}
      onChange={onChange}
      permisos={permisos}
      tabsPermitidas={["catalogo", "almacen", "refuerzos"]}
    />,
  )
}

describe("TabsSanidad — SAN-010: 3 tabs y ARIA tablist", () => {
  it("renderiza los 3 tabs Catálogo | Almacén | Refuerzos con role=tablist", () => {
    renderTabs()

    const list = screen.getByRole("tablist", { name: /sección de sanidad/i })
    expect(list).toBeInTheDocument()
    expect(within(list).getByRole("tab", { name: "Catálogo" })).toBeInTheDocument()
    expect(within(list).getByRole("tab", { name: "Almacén" })).toBeInTheDocument()
    expect(within(list).getByRole("tab", { name: "Refuerzos" })).toBeInTheDocument()
  })

  it("marca aria-selected=true sólo en el tab activo", () => {
    renderTabs("almacen")

    expect(screen.getByRole("tab", { name: "Almacén" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tab", { name: "Catálogo" })).toHaveAttribute("aria-selected", "false")
    expect(screen.getByRole("tab", { name: "Refuerzos" })).toHaveAttribute("aria-selected", "false")
  })

  it("tap en un tab invoca onChange con el id (no cambia la URL)", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderTabs("refuerzos", onChange)

    await user.click(screen.getByRole("tab", { name: "Catálogo" }))

    expect(onChange).toHaveBeenCalledWith("catalogo")
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

describe("TabsSanidad — SAN-060: gating por permiso", () => {
  it("oculta los tabs cuyo permiso falta (no se pueden seleccionar)", () => {
    renderTabs("refuerzos", vi.fn(), PERMISOS_SIN_EDITAR)

    // El tab Catálogo requiere sanidad:editar/anular; sin ese permiso no se renderiza.
    expect(screen.queryByRole("tab", { name: "Catálogo" })).not.toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Almacén" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Refuerzos" })).toBeInTheDocument()
  })
})

describe("SanidadMobileView — SAN-010/§13 item 11: header + tab default + contenido por tab", () => {
  function renderVista(
    overrides: Partial<Parameters<typeof SanidadMobileView>[0]> = {},
    permisos = PERMISOS_COMPLETOS,
  ) {
    return render(
      <SanidadMobileView
        fincaNombre="Finca Esperanza"
        permisos={permisos}
        tabInicial="refuerzos"
        tabPermitidas={["catalogo", "almacen", "refuerzos"]}
        onRegistrarAplicacion={vi.fn()}
        onRegistrarEntradaAlmacen={vi.fn()}
        onEditarProducto={vi.fn()}
        onInactivarProducto={vi.fn()}
        contenidoRefuerzos={<div data-testid="contenido-refuerzos">Refuerzos OK</div>}
        contenidoCatalogo={<div data-testid="contenido-catalogo">Catálogo OK</div>}
        contenidoAlmacen={<div data-testid="contenido-almacen">Almacén OK</div>}
        {...overrides}
      />,
    )
  }

  it("el header 'Sanidad' siempre se renderiza", () => {
    renderVista()
    expect(screen.getByRole("heading", { level: 1, name: /Sanidad/i })).toBeInTheDocument()
  })

  it("por defecto muestra el contenido del tab Refuerzos", () => {
    renderVista()
    expect(screen.getByTestId("contenido-refuerzos")).toBeInTheDocument()
    expect(screen.queryByTestId("contenido-catalogo")).not.toBeInTheDocument()
    expect(screen.queryByTestId("contenido-almacen")).not.toBeInTheDocument()
  })

  it("tap en el tab Almacén cambia el contenido sin tocar la URL", async () => {
    const user = userEvent.setup()
    renderVista()

    await user.click(screen.getByRole("tab", { name: "Almacén" }))

    expect(screen.getByTestId("contenido-almacen")).toBeInTheDocument()
    expect(screen.queryByTestId("contenido-refuerzos")).not.toBeInTheDocument()
  })

  it("el tab Catálogo respeta el permiso sanidad:editar (oculto si falta)", () => {
    renderVista({}, PERMISOS_SIN_EDITAR)
    expect(screen.queryByRole("tab", { name: "Catálogo" })).not.toBeInTheDocument()
  })
})
