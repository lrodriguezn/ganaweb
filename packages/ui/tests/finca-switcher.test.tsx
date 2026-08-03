// @vitest-environment jsdom
/**
 * Issue #144 — selector multi-finca.
 *
 * Cubre en el paquete UI:
 *  - CE-1: todas las fincas del usuario se listan con su rol por finca.
 *  - CE-3: las membresías pendientes muestran badge "Pendiente" y no son
 *    seleccionables.
 *  - CE-6: un usuario con una sola finca ve el selector sin errores.
 *  - CE-7 / punto 8: el header móvil abre el selector y permite cambiar de
 *    finca (antes solo mostraba el nombre).
 */
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AppHeader } from "../src/ganado/app-header"
import { FincaList } from "../src/ganado/finca-switcher"
import type { FincaResumen } from "../src/ganado/types"

const FINCAS: FincaResumen[] = [
  {
    id: "finca-esperanza",
    nombre: "La Esperanza",
    rol: "Administrador",
    esAdmin: true,
    sync: "sincronizado",
    tieneDatosLocales: true,
  },
  {
    id: "finca-roble",
    nombre: "Hacienda El Roble",
    rol: "Solo lectura",
    sync: "sincronizado",
    tieneDatosLocales: true,
  },
  {
    id: "finca-nueva",
    nombre: "Finca Nueva",
    rol: "Autorizado",
    pendiente: true,
    sync: "sincronizado",
    tieneDatosLocales: true,
  },
]

afterEach(() => {
  cleanup()
})

function renderLista(onSeleccionar = vi.fn()) {
  render(
    <FincaList
      fincas={FINCAS}
      fincaActivaId="finca-esperanza"
      offline={false}
      onSeleccionar={onSeleccionar}
    />,
  )
  return onSeleccionar
}

describe("Issue #144 — FincaList multi-finca", () => {
  it("CE-1 — lists every finca with its per-finca role badge", () => {
    renderLista()

    expect(screen.getByText("La Esperanza")).toBeInTheDocument()
    expect(screen.getByText("Hacienda El Roble")).toBeInTheDocument()
    expect(screen.getByText("Administrador")).toBeInTheDocument()
    expect(screen.getByText("Solo lectura")).toBeInTheDocument()
  })

  it("CE-3 — pending membership renders disabled with a Pendiente badge", async () => {
    const onSeleccionar = renderLista()
    const user = userEvent.setup()

    const pendiente = screen.getByText("Pendiente")
    expect(pendiente).toBeInTheDocument()

    const filaPendiente = screen.getByRole("button", { name: /Finca Nueva/i })
    expect(filaPendiente).toBeDisabled()

    // No seleccionable: el clic no dispara el callback de cambio.
    await user.click(filaPendiente).catch(() => {})
    expect(onSeleccionar).not.toHaveBeenCalled()
  })

  it("CE-3 — the pending badge replaces the role badge", () => {
    renderLista()

    const filaPendiente = screen.getByRole("button", { name: /Finca Nueva/i })
    expect(filaPendiente).not.toHaveTextContent("Autorizado")
    expect(filaPendiente).toHaveTextContent("Pendiente")
  })

  it("CE-6 — a single-finca user sees the selector without errors", () => {
    const onSeleccionar = vi.fn()
    render(
      <FincaList
        fincas={[FINCAS[0]]}
        fincaActivaId="finca-esperanza"
        offline={false}
        onSeleccionar={onSeleccionar}
      />,
    )

    expect(screen.getByText("La Esperanza")).toBeInTheDocument()
    expect(screen.getByText("Administrador")).toBeInTheDocument()
    expect(screen.queryByText("Pendiente")).not.toBeInTheDocument()
  })

  it("selecting an enabled finca calls onSeleccionar with that finca", async () => {
    const onSeleccionar = renderLista()
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: /Hacienda El Roble/i }))

    expect(onSeleccionar).toHaveBeenCalledOnce()
    expect(onSeleccionar.mock.calls[0]?.[0]?.id).toBe("finca-roble")
  })
})

describe("Issue #144 — AppHeader mobile finca selector", () => {
  function renderHeader(onCambiarFinca = vi.fn()) {
    render(
      <AppHeader
        fincas={FINCAS}
        fincaActivaId="finca-esperanza"
        offline={false}
        estadoSync="sincronizado"
        onBuscar={vi.fn()}
        onSync={vi.fn()}
        onCambiarFinca={onCambiarFinca}
        nombreUsuario="Admin GanaWeb"
        emailUsuario="admin@ganaweb.demo"
        inicialesUsuario="AG"
        onCerrarSesion={vi.fn()}
      />,
    )
    return onCambiarFinca
  }

  it("CE-7 — the mobile trigger renders and opens the finca selector", async () => {
    renderHeader()
    const user = userEvent.setup()

    const trigger = screen.getByRole("button", { name: "Cambiar finca" })
    expect(trigger).toHaveAttribute("aria-expanded", "false")

    await user.click(trigger)

    expect(trigger).toHaveAttribute("aria-expanded", "true")
    // El contenido del selector es el mismo FincaList del desktop.
    expect(screen.getByText("Hacienda El Roble")).toBeInTheDocument()
    expect(screen.getByText("Solo lectura")).toBeInTheDocument()
    expect(screen.getByText("Pendiente")).toBeInTheDocument()
  })

  it("CE-7 — selecting a finca from the mobile selector calls onCambiarFinca", async () => {
    const onCambiarFinca = renderHeader()
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Cambiar finca" }))
    await user.click(screen.getByRole("button", { name: /Hacienda El Roble/i }))

    expect(onCambiarFinca).toHaveBeenCalledOnce()
    expect(onCambiarFinca.mock.calls[0]?.[0]?.id).toBe("finca-roble")
  })

  it("CE-3 — the pending finca is not selectable from the mobile selector", async () => {
    const onCambiarFinca = renderHeader()
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Cambiar finca" }))

    const filaPendiente = screen.getByRole("button", { name: /Finca Nueva/i })
    expect(filaPendiente).toBeDisabled()
    await user.click(filaPendiente).catch(() => {})
    expect(onCambiarFinca).not.toHaveBeenCalled()
  })
})
