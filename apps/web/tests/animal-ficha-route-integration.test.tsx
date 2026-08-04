// @vitest-environment jsdom

/**
 * redesign-ficha-animal (slice 1, task 1.4) — EventDrawer wiring on the
 * animal ficha route.
 *
 * The route is exercised through the exported `AnimalFichaRouteView` so the
 * loader data can be pinned without a TanStack Start runtime — the same
 * pattern as `animal-listado-route-integration.test.tsx`. Spec
 * (animal-ficha-desktop-ui): "+ Registrar evento" MUST open the existing
 * EventDrawer with the ficha animal preselected; closing it MUST return to
 * the ficha without navigation.
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
  AnimalFichaRouteView,
  type AnimalFichaRouteViewProps,
} from "../src/routes/_app/fincas/$fincaId/animales/$animalId.js"

// The route module imports the server-function facade; stub it so no TanStack
// Start runtime is required. The view consumes loader data through props, so
// the stubs are inert.
vi.mock("../src/server/animal-actions.js", () => ({
  deleteAnimalAction: vi.fn(),
  getAnimalFichaAction: vi.fn(),
  reactivateAnimalAction: vi.fn(),
}))

beforeAll(() => {
  // The EventDrawer is a vaul Drawer; opening it calls pointer-capture +
  // scroll APIs jsdom lacks (same carve-out as the dialog/toast tests).
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
  }
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = () => undefined
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => undefined
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => undefined
  }
})

afterEach(() => cleanup())

function fichaProps(overrides: Partial<AnimalFichaRouteViewProps> = {}): AnimalFichaRouteViewProps {
  return {
    data: {
      tipo: "ficha",
      animal: {
        id: "animal-1",
        codigoAnimal: "MT-122",
        nombreAnimal: "Matilda",
        sexo: "hembra",
        salud: "sano",
        estadoActual: "activo",
      },
      timeline: {
        items: [
          {
            id: "animal-1-created",
            dominio: "manejo",
            tipo: "reubicacion",
            fecha: "2026-07-10",
            titulo: "Animal registrado",
          },
        ],
      },
      permissions: { canInactivate: true },
    },
    onVolverAListado: vi.fn(),
    onEliminar: vi.fn(),
    onReactivar: vi.fn(),
    ...overrides,
  }
}

describe("animal ficha route — event drawer wiring (redesign-ficha-animal)", () => {
  it("opens the EventDrawer from '+ Registrar evento' with the ficha animal preselected", async () => {
    const user = userEvent.setup()
    render(<AnimalFichaRouteView {...fichaProps()} />)

    await user.click(await screen.findByRole("button", { name: "+ Registrar evento" }))

    // Step 1 of the drawer: choose the event type.
    expect(await screen.findByText("¿Qué registrar?")).toBeInTheDocument()

    // Preselection: with the ficha animal already chosen the drawer skips
    // the alcance step and goes straight to the form for the chosen type.
    await user.click(screen.getByRole("button", { name: "Vacuna" }))
    expect(await screen.findByText("Registrar vacuna")).toBeInTheDocument()
    expect(screen.queryByText("¿A quiénes?")).not.toBeInTheDocument()
    expect(screen.getByText("Animales (1)")).toBeInTheDocument()
  })

  it("closing the drawer returns to the ficha without navigation", async () => {
    const user = userEvent.setup()
    const onVolverAListado = vi.fn()
    render(<AnimalFichaRouteView {...fichaProps({ onVolverAListado })} />)

    await user.click(await screen.findByRole("button", { name: "+ Registrar evento" }))
    expect(await screen.findByText("¿Qué registrar?")).toBeInTheDocument()

    await user.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByText("¿Qué registrar?")).not.toBeInTheDocument())

    // The ficha is still on screen and no list navigation happened.
    expect(
      within(screen.getByRole("navigation", { name: "Miga de pan" })).getByRole("button", {
        name: "Animales",
      }),
    ).toBeInTheDocument()
    expect(onVolverAListado).not.toHaveBeenCalled()
  })

  it("wires the breadcrumb to the list navigation callback", async () => {
    const user = userEvent.setup()
    const onVolverAListado = vi.fn()
    render(<AnimalFichaRouteView {...fichaProps({ onVolverAListado })} />)

    const breadcrumb = screen.getByRole("navigation", { name: "Miga de pan" })
    await user.click(within(breadcrumb).getByRole("button", { name: "Animales" }))
    expect(onVolverAListado).toHaveBeenCalledTimes(1)
  })
})
