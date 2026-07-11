// @vitest-environment jsdom
/**
 * PR4.T-004.7 — AvatarMenu + AparienciaCard + AppHeader behavior tests.
 *
 * Specs: specs/avatar-menu.md (REQ-AM-001..007),
 *        specs/theme-toggle-compat.md (REQ-TTC-003, REQ-TTC-004).
 * Design: design.md §D5 (AvatarMenu), §D6 (AparienciaCard), §D8 (AppHeader).
 *
 * Tests written FIRST (RED phase) before production code exists.
 * Import paths reference components that will be created in GREEN phase.
 */

import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AparienciaCard } from "../src/ganado/apariencia-card"
import { AppHeader } from "../src/ganado/app-header"
import { AvatarMenu } from "../src/ganado/avatar-menu"
import type { UsuarioResumen } from "../src/ganado/types"

const USUARIO: UsuarioResumen = {
  nombre: "Yuli Administradora",
  email: "admin@ganaweb.demo",
  iniciales: "YA",
  esAdmin: true,
}

beforeEach(() => {
  document.documentElement.className = ""
  localStorage.clear()
})

afterEach(() => {
  document.documentElement.className = ""
  localStorage.clear()
  cleanup()
})

describe("PR4.T-004.7 — AvatarMenu (REQ-AM-001..007, D5)", () => {
  it("REQ-AM-001 — renders avatar trigger with aria-haspopup and aria-expanded", () => {
    render(<AvatarMenu usuario={USUARIO} onCerrarSesion={vi.fn()} />)

    const trigger = screen.getByRole("button", { name: /Yuli Administradora|menu de usuario/i })
    expect(trigger).toHaveAttribute("aria-haspopup", "menu")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
  })

  it("REQ-AM-002 — user info header shows nombre and email when menu opens", async () => {
    const user = userEvent.setup()
    render(<AvatarMenu usuario={USUARIO} onCerrarSesion={vi.fn()} />)

    // Open the menu
    const trigger = screen.getByRole("button", { name: /Yuli Administradora|menu de usuario/i })
    await user.click(trigger)

    // User info visible
    expect(screen.getByText("Yuli Administradora")).toBeInTheDocument()
    expect(screen.getByText("admin@ganaweb.demo")).toBeInTheDocument()
  })

  it("REQ-AM-004 — placeholder items are not clickable (PD-3)", async () => {
    const onCerrar = vi.fn()
    const user = userEvent.setup()
    render(<AvatarMenu usuario={USUARIO} onCerrarSesion={onCerrar} />)

    // Open menu
    const trigger = screen.getByRole("button", { name: /Yuli Administradora|menu de usuario/i })
    await user.click(trigger)

    // Mi cuenta and Preferencias de notificación are placeholder items (PD-3)
    const miCuenta = screen.getByText("Mi cuenta")
    const preferencias = screen.getByText("Preferencias de notificación")

    // Items are visible in the menu
    expect(miCuenta).toBeInTheDocument()
    expect(preferencias).toBeInTheDocument()

    // Clicking placeholders does NOT close the menu or fire logout
    await user.click(miCuenta)
    await user.click(preferencias)
    expect(onCerrar).not.toHaveBeenCalled()
    expect(trigger).toHaveAttribute("aria-expanded", "true")
  })

  it("REQ-AM-005 — Cerrar sesión calls onCerrarSesion", async () => {
    const onCerrar = vi.fn()
    const user = userEvent.setup()
    render(<AvatarMenu usuario={USUARIO} onCerrarSesion={onCerrar} />)

    // Open menu
    const trigger = screen.getByRole("button", { name: /Yuli Administradora|menu de usuario/i })
    await user.click(trigger)

    // Click Cerrar sesión
    const cerrar = screen.getByText("Cerrar sesión")
    await user.click(cerrar)

    expect(onCerrar).toHaveBeenCalledOnce()
  })

  it("REQ-TTC-004 — sun/moon buttons have correct aria-pressed and aria-label", async () => {
    const user = userEvent.setup()
    render(<AvatarMenu usuario={USUARIO} onCerrarSesion={vi.fn()} />)

    // Open menu
    const trigger = screen.getByRole("button", { name: /Yuli Administradora|menu de usuario/i })
    await user.click(trigger)

    // Find sun and moon buttons by aria-label
    const sunButton = screen.getByRole("button", { name: "Cambiar a modo claro" })
    const moonButton = screen.getByRole("button", { name: "Cambiar a modo oscuro" })

    // Exactly one should be pressed (aria-pressed="true")
    // Default is light mode, so moon button should be pressed
    expect(sunButton).toHaveAttribute("aria-pressed", "false")
    expect(moonButton).toHaveAttribute("aria-pressed", "true")
  })

  it("REQ-AM-003 — APARIENCIA section is present with EstiloSwitcher", async () => {
    const user = userEvent.setup()
    render(<AvatarMenu usuario={USUARIO} onCerrarSesion={vi.fn()} />)

    // Open menu
    const trigger = screen.getByRole("button", { name: /Yuli Administradora|menu de usuario/i })
    await user.click(trigger)

    // APARIENCIA label present
    expect(screen.getByText("APARIENCIA")).toBeInTheDocument()

    // EstiloSwitcher radiogroup present
    expect(screen.getByRole("radiogroup", { name: "Estilo visual" })).toBeInTheDocument()
  })

  it("PD-3 — avatar shows iniciales when provided", () => {
    render(<AvatarMenu usuario={USUARIO} onCerrarSesion={vi.fn()} />)

    // Avatar should display initials "YA" (not a User icon since iniciales is non-empty)
    expect(screen.getByText("YA")).toBeInTheDocument()
  })

  it("PD-3 — avatar shows User icon fallback when iniciales is empty", () => {
    const usuarioSinIniciales: UsuarioResumen = {
      ...USUARIO,
      iniciales: "",
    }
    const { container } = render(
      <AvatarMenu usuario={usuarioSinIniciales} onCerrarSesion={vi.fn()} />,
    )

    // The User icon from lucide-react should be rendered (via aria-hidden SVG)
    const userIcon = container.querySelector(".lucide-user")
    expect(userIcon).not.toBeNull()
    expect(userIcon).toHaveAttribute("aria-hidden", "true")
  })
})

describe("PR4.T-004.7 — AparienciaCard (D6)", () => {
  it("renders APARIENCIA header", () => {
    render(<AparienciaCard />)
    expect(screen.getByText("APARIENCIA")).toBeInTheDocument()
  })

  it("renders both hint lines", () => {
    render(<AparienciaCard />)
    expect(screen.getByText("Campo: contraste máximo para trabajar al sol")).toBeInTheDocument()
    expect(screen.getByText("Moderna: estilo actualizado")).toBeInTheDocument()
  })

  it("renders EstiloSwitcher with sm size", () => {
    render(<AparienciaCard />)
    expect(screen.getByRole("radiogroup", { name: "Estilo visual" })).toBeInTheDocument()
  })

  it("renders sun/moon mode buttons with correct aria labels", () => {
    render(<AparienciaCard />)
    expect(screen.getByRole("button", { name: "Cambiar a modo claro" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cambiar a modo oscuro" })).toBeInTheDocument()
  })
})

describe("PR4.T-004.7 — AppHeader avatar integration (D8)", () => {
  const fincas = [
    {
      id: "1",
      nombre: "Finca Los Robles",
      rol: "Administrador",
      sync: "sincronizado" as const,
      tieneDatosLocales: true,
    },
  ]

  it("renders avatar when user props are supplied", () => {
    render(
      <AppHeader
        fincas={fincas}
        fincaActivaId="1"
        offline={false}
        estadoSync="sincronizado"
        onBuscar={vi.fn()}
        onSync={vi.fn()}
        onCambiarFinca={vi.fn()}
        nombreUsuario="Yuli Administradora"
        emailUsuario="admin@ganaweb.demo"
        inicialesUsuario="YA"
        onCerrarSesion={vi.fn()}
      />,
    )

    // Avatar trigger should be visible
    expect(
      screen.getByRole("button", { name: /Yuli Administradora|menu de usuario/i }),
    ).toBeInTheDocument()
  })

  it("does NOT render avatar when user props are absent (backward compat)", () => {
    render(
      <AppHeader
        fincas={fincas}
        fincaActivaId="1"
        offline={false}
        estadoSync="sincronizado"
        onBuscar={vi.fn()}
        onSync={vi.fn()}
        onCambiarFinca={vi.fn()}
      />,
    )

    // No avatar button — the old ThemeToggle should be rendered instead
    expect(
      screen.queryByRole("button", { name: /Yuli Administradora|menu de usuario/i }),
    ).not.toBeInTheDocument()
    // ThemeToggle should still be present as fallback
    expect(screen.getByRole("button", { name: /Cambiar a modo/ })).toBeInTheDocument()
  })
})
