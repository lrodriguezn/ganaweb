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
import { getAnimalFichaAction } from "../src/server/animal-actions.js"

// The route module imports the server-function facade; stub it so no TanStack
// Start runtime is required. Slice 3: `getAnimalFichaAction` is no longer
// inert — the view calls it for timeline tabs/pagination.
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

afterEach(() => {
  cleanup()
  vi.mocked(getAnimalFichaAction).mockReset()
})

function fichaProps(overrides: Partial<AnimalFichaRouteViewProps> = {}): AnimalFichaRouteViewProps {
  return {
    fincaId: "finca-1",
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
    onEditar: vi.fn(),
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

  it("wires Editar to the edit navigation callback", async () => {
    const user = userEvent.setup()
    const onEditar = vi.fn()
    render(<AnimalFichaRouteView {...fichaProps({ onEditar })} />)

    // Acotado al frame desktop: el header mobile también expone "Editar".
    const ficha = within(screen.getByLabelText("19 Ficha Animal · Desktop"))
    await user.click(await ficha.findByRole("button", { name: "Editar" }))
    expect(onEditar).toHaveBeenCalledTimes(1)
  })
})

describe("animal ficha route — enriched resumen rendering (redesign-ficha-animal slice 2)", () => {
  function fichaConResumen(): AnimalFichaRouteViewProps {
    const base = fichaProps()
    return {
      ...base,
      data: {
        ...base.data,
        animal: {
          ...base.data.animal,
          potrero: "Potrero Norte",
          lote: "Lote A",
        },
        resumen: {
          raza: "Holstein",
          color: "Blanco y negro",
          grupo: "Grupo Vientres",
          ultimoPeso: { fecha: "2026-07-01", pesoKg: 410, gdpKgDia: 1 },
          reproduccion: {
            ultimoServicio: { fecha: "2025-05-01", detalle: "inseminacion" },
            ultimaPalpacion: null,
            gestacionDias: null,
            partos: { total: 2, ultimaFecha: "2025-03-01" },
            iepDias: 365,
            diasAbiertos: 61,
          },
          condicionCorporal: { valor: 3.5, etiqueta: "Ideal", fecha: "2026-07-20" },
        },
      },
    }
  }

  it("renders the loader resumen values in the desktop cards", () => {
    render(<AnimalFichaRouteView {...fichaConResumen()} />)

    const datos = screen.getByRole("region", { name: "DATOS" })
    expect(within(datos).getByText("Holstein")).toBeInTheDocument()
    expect(within(datos).getByText("Blanco y negro")).toBeInTheDocument()

    const reproduccion = screen.getByRole("region", { name: "REPRODUCCIÓN" })
    expect(within(reproduccion).getByText("1 may · inseminacion")).toBeInTheDocument()
    expect(within(reproduccion).getByText("2 · último 1 mar 2025")).toBeInTheDocument()
    expect(within(reproduccion).getByText("365 días")).toBeInTheDocument()

    const peso = screen.getByRole("region", { name: "PESO Y CONDICIÓN" })
    expect(within(peso).getByText("410 kg")).toBeInTheDocument()
    expect(within(peso).getByText("1 jul · GDP 1 kg/día")).toBeInTheDocument()
    expect(within(peso).getByText("3,5 / 5 · Ideal")).toBeInTheDocument()
  })

  it("renders resolved location names and grupo in the header meta line", () => {
    render(<AnimalFichaRouteView {...fichaConResumen()} />)

    expect(
      screen.getByText("Holstein · Hembra · Potrero Norte · Lote A · Grupo Vientres"),
    ).toBeInTheDocument()
  })

  it("keeps structured placeholders when the resumen is absent", () => {
    render(<AnimalFichaRouteView {...fichaProps()} />)

    const datos = screen.getByRole("region", { name: "DATOS" })
    expect(within(datos).getAllByText("—").length).toBeGreaterThanOrEqual(4)
  })
})

describe("animal ficha route — server-driven timeline (redesign-ficha-animal slice 3)", () => {
  function paginaTimeline(
    items: readonly { readonly id: string; readonly titulo: string; readonly dominio: string }[],
    nextCursor?: string,
    eventosPendientes?: number,
  ) {
    return {
      tipo: "ficha" as const,
      timeline: {
        items: items.map((item, index) => ({
          id: item.id,
          dominio: item.dominio,
          tipo: "servicio",
          fecha: `2026-0${(index % 6) + 1}-01`,
          titulo: item.titulo,
        })),
        ...(nextCursor ? { nextCursor } : {}),
        ...(eventosPendientes != null ? { eventosPendientes } : {}),
      },
    }
  }

  function fichaConPaginaInicial(eventosPendientes?: number): AnimalFichaRouteViewProps {
    const base = fichaProps()
    return {
      ...base,
      data: {
        ...base.data,
        timeline: {
          items: [
            {
              id: "ev-1",
              dominio: "produccion",
              tipo: "pesaje",
              fecha: "2026-07-01",
              titulo: "Pesaje página 1",
            },
          ],
          nextCursor: "cursor-x",
          ...(eventosPendientes != null ? { eventosPendientes } : {}),
        },
      },
    }
  }

  it("switching a tab fetches the filtered page from the server and resets the timeline", async () => {
    const user = userEvent.setup()
    vi.mocked(getAnimalFichaAction).mockResolvedValueOnce(
      paginaTimeline([{ id: "srv-1", titulo: "Servicio IA", dominio: "reproduccion" }]),
    )
    render(<AnimalFichaRouteView {...fichaProps()} />)

    await user.click(await screen.findByRole("tab", { name: "Reproducción" }))

    expect(getAnimalFichaAction).toHaveBeenCalledWith({
      data: { fincaId: "finca-1", animalId: "animal-1", tabTimeline: "reproduccion" },
    })
    // La página filtrada reemplaza la del loader (reset, no append). Se
    // acota al frame desktop: el timeline también se renderiza en el frame
    // mobile (oculto por CSS, presente en el DOM de jsdom).
    const ficha = within(screen.getByLabelText("19 Ficha Animal · Desktop"))
    expect(await ficha.findByText("Servicio IA")).toBeInTheDocument()
    expect(ficha.queryByText("Animal registrado")).not.toBeInTheDocument()
  })

  it("'Ver más eventos' appends the next page using the current cursor", async () => {
    const user = userEvent.setup()
    vi.mocked(getAnimalFichaAction).mockResolvedValueOnce(
      paginaTimeline([{ id: "ev-2", titulo: "Pesaje página 2", dominio: "produccion" }]),
    )
    render(<AnimalFichaRouteView {...fichaConPaginaInicial()} />)

    await user.click(await screen.findByRole("button", { name: "Ver más eventos" }))

    expect(getAnimalFichaAction).toHaveBeenCalledWith({
      data: { fincaId: "finca-1", animalId: "animal-1", cursorTimeline: "cursor-x" },
    })
    const ficha = within(screen.getByLabelText("19 Ficha Animal · Desktop"))
    expect(await ficha.findByText("Pesaje página 2")).toBeInTheDocument()
    // Append: la página anterior sigue visible.
    expect(ficha.getByText("Pesaje página 1")).toBeInTheDocument()
  })

  it("pagination within a domain tab carries tabTimeline and cursor together", async () => {
    const user = userEvent.setup()
    const fichaAction = vi.mocked(getAnimalFichaAction)
    fichaAction.mockResolvedValueOnce(
      paginaTimeline([{ id: "srv-1", titulo: "Servicio 1", dominio: "reproduccion" }], "cursor-r"),
    )
    render(<AnimalFichaRouteView {...fichaProps()} />)

    await user.click(await screen.findByRole("tab", { name: "Reproducción" }))
    await user.click(await screen.findByRole("button", { name: "Ver más eventos" }))

    expect(fichaAction).toHaveBeenLastCalledWith({
      data: {
        fincaId: "finca-1",
        animalId: "animal-1",
        cursorTimeline: "cursor-r",
        tabTimeline: "reproduccion",
      },
    })
  })

  it("renders 'Ver N eventos más' with the loader pending count (#183)", () => {
    render(<AnimalFichaRouteView {...fichaConPaginaInicial(8)} />)

    const ficha = within(screen.getByLabelText("19 Ficha Animal · Desktop"))
    expect(ficha.getByRole("button", { name: "Ver 8 eventos más" })).toBeInTheDocument()
  })

  it("updates the pending count as pages are appended and hides the control on the last page (#183)", async () => {
    const user = userEvent.setup()
    const fichaAction = vi.mocked(getAnimalFichaAction)
    fichaAction
      .mockResolvedValueOnce(
        paginaTimeline(
          [{ id: "ev-2", titulo: "Pesaje página 2", dominio: "produccion" }],
          "cursor-y",
          3,
        ),
      )
      .mockResolvedValueOnce(
        paginaTimeline([{ id: "ev-3", titulo: "Pesaje página 3", dominio: "produccion" }]),
      )
    render(<AnimalFichaRouteView {...fichaConPaginaInicial(8)} />)

    const ficha = within(screen.getByLabelText("19 Ficha Animal · Desktop"))
    await user.click(await ficha.findByRole("button", { name: "Ver 8 eventos más" }))
    // El conteo se actualiza con la respuesta de la página anexada.
    expect(await ficha.findByRole("button", { name: "Ver 3 eventos más" })).toBeInTheDocument()

    await user.click(ficha.getByRole("button", { name: "Ver 3 eventos más" }))
    // Última página: el control desaparece (sin cursor ni conteo).
    await waitFor(() => {
      expect(ficha.queryByRole("button", { name: /eventos más/ })).not.toBeInTheDocument()
      expect(ficha.queryByRole("button", { name: "Ver más eventos" })).not.toBeInTheDocument()
    })
  })

  it("shows the filtered pending count after switching a tab (#183)", async () => {
    const user = userEvent.setup()
    vi.mocked(getAnimalFichaAction).mockResolvedValueOnce(
      paginaTimeline(
        [{ id: "srv-1", titulo: "Servicio IA", dominio: "reproduccion" }],
        "cursor-r",
        12,
      ),
    )
    render(<AnimalFichaRouteView {...fichaProps()} />)

    await user.click(await screen.findByRole("tab", { name: "Reproducción" }))

    const ficha = within(screen.getByLabelText("19 Ficha Animal · Desktop"))
    expect(await ficha.findByRole("button", { name: "Ver 12 eventos más" })).toBeInTheDocument()
  })
})
