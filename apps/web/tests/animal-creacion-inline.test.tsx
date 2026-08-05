// @vitest-environment jsdom

/**
 * Issue #150 — CM-043: creación inline de maestros POR FINCA desde los
 * formularios de animales.
 *
 * Cubre:
 * - Con `configuracion:crear`: "+ Crear el primero" en Lugar de compra abre
 *   el diálogo inline, `crearMaestroAction` crea el registro y el registro
 *   creado queda seleccionado en el `SelectConCreacion`.
 * - Errores de validación del servidor se muestran en el diálogo inline.
 * - Sin permiso no hay affordance de creación.
 * - CM-025: los catálogos GLOBALES (raza/color/calidad) NO tienen creación
 *   aunque el usuario tenga `configuracion:crear`.
 *
 * El permiso se controla mockeando `Route.useRouteContext` de `_app.js`
 * (mismo mecanismo que `readCanCreateCatalog` en nuevo.tsx).
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { NewAnimalRouteView } from "../src/routes/_app/fincas/$fincaId/animales/nuevo.js"

const crearInlineMock = vi.fn()

const estadoSesion = vi.hoisted(() => ({
  permisos: [] as readonly { modulo: string; accion: string }[],
}))

vi.mock("../src/server/configuracion-actions.js", () => ({
  crearMaestroAction: (input: unknown) => crearInlineMock(input),
}))

// nuevo.tsx importa createAnimalAction/getAnimalCatalogsAction de acá.
vi.mock("../src/server/animal-actions.js", () => ({
  createAnimalAction: vi.fn(),
  getAnimalCatalogsAction: vi.fn(),
}))

vi.mock("../src/routes/_app.js", () => ({
  Route: {
    useRouteContext: () => ({ sesion: { permisos: estadoSesion.permisos } }),
  },
}))

beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true, // desktop
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  }
  if (typeof globalThis.ResizeObserver === "undefined") {
    class ResizeObserverPolyfill {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as unknown as { ResizeObserver: typeof ResizeObserverPolyfill }).ResizeObserver =
      ResizeObserverPolyfill
  }
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

beforeEach(() => {
  estadoSesion.permisos = [{ modulo: "configuracion", accion: "crear" }]
})

afterEach(() => {
  cleanup()
  crearInlineMock.mockReset()
})

const FINCA_ID = "finca-1"

/** El formulario renderiza variantes desktop y mobile; se opera la primera. */
async function abrirOrigenComprado(user: ReturnType<typeof userEvent.setup>) {
  const comprados = await screen.findAllByRole("radio", { name: "Comprado" })
  await user.click(comprados[0])
}

async function abrirLugarCompra(user: ReturnType<typeof userEvent.setup>) {
  const triggers = await screen.findAllByRole("combobox", { name: "Lugar de compra" })
  await user.click(triggers[0])
}

describe("CM-043 — creación inline con configuracion:crear", () => {
  it("onCreate abre el diálogo, crea el registro y queda seleccionado", async () => {
    const user = userEvent.setup()
    crearInlineMock.mockResolvedValue({ tipo: "creado", id: "lc-1" })
    render(<NewAnimalRouteView fincaId={FINCA_ID} />)

    await abrirOrigenComprado(user)
    await abrirLugarCompra(user)

    // Lista vacía + canCreate → EmptyState con acción de creación.
    await user.click(await screen.findByRole("button", { name: "+ Crear el primero" }))

    // Diálogo inline de creación contextual.
    const dialogo = await screen.findByRole("dialog", { name: "Nuevo lugar de compra" })
    await user.type(within(dialogo).getByLabelText(/Nombre/), "Feria de Ganado")
    await user.click(within(dialogo).getByRole("button", { name: "Crear" }))

    await waitFor(() => {
      expect(crearInlineMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fincaId: FINCA_ID,
            maestro: "lugares_compras",
            datos: { nombre: "Feria de Ganado" },
          }),
        }),
      )
    })

    // El registro creado queda seleccionado en el selector.
    await waitFor(() => {
      expect(
        screen.getAllByRole("combobox", { name: "Feria de Ganado" }).length,
      ).toBeGreaterThanOrEqual(1)
    })
    // El diálogo se cierra tras crear.
    await waitFor(() => {
      expect(screen.queryByText("Nuevo lugar de compra")).not.toBeInTheDocument()
    })
  }, 15000)

  it("validación del servidor se muestra como error de campo en el diálogo", async () => {
    const user = userEvent.setup()
    crearInlineMock.mockResolvedValue({
      tipo: "validacion",
      errores: [{ campo: "nombre", detalle: "El nombre es obligatorio.", regla: "CM-026" }],
    })
    render(<NewAnimalRouteView fincaId={FINCA_ID} />)

    await abrirOrigenComprado(user)
    await abrirLugarCompra(user)
    await user.click(await screen.findByRole("button", { name: "+ Crear el primero" }))
    await user.click(await screen.findByRole("button", { name: "Crear" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("El nombre es obligatorio.")
    expect(screen.getByText("Nuevo lugar de compra")).toBeInTheDocument()
  })

  it("CM-025: raza/color no tienen affordance de creación aunque haya permiso", async () => {
    const user = userEvent.setup()
    render(<NewAnimalRouteView fincaId={FINCA_ID} />)

    // Catálogos globales vacíos y sin creación → trigger deshabilitado.
    const razas = await screen.findAllByRole("combobox", { name: "Raza" })
    expect(razas[0]).toBeDisabled()
    const colores = screen.getAllByRole("combobox", { name: "Color" })
    expect(colores[0]).toBeDisabled()
    // Sin ningún affordance de creación en el documento.
    await user.click(razas[0]).catch(() => {})
    expect(screen.queryByText("Crear nuevo")).not.toBeInTheDocument()
    expect(screen.queryByText("+ Crear el primero")).not.toBeInTheDocument()
  })
})

describe("CM-043 — sin configuracion:crear", () => {
  it("no hay affordance de creación en Lugar de compra", async () => {
    estadoSesion.permisos = [{ modulo: "animales", accion: "ver" }]
    const user = userEvent.setup()
    render(<NewAnimalRouteView fincaId={FINCA_ID} />)

    await abrirOrigenComprado(user)
    const triggers = await screen.findAllByRole("combobox", { name: "Lugar de compra" })
    expect(triggers[0]).toBeDisabled()
    expect(screen.queryByText("Crear nuevo")).not.toBeInTheDocument()
    expect(screen.queryByText("+ Crear el primero")).not.toBeInTheDocument()
  })
})
