// @vitest-environment jsdom

/**
 * #110 (PR 2) — presentational preference controls for `AnimalListadoDesktop`.
 *
 * The UI owns no URL, authorization, persistence, or request execution: it
 * renders route-supplied pagination, column-selector, reset, and warning models
 * and invokes the supplied callbacks. `Código`/`Nombre` stay selected and
 * immutable. These tests assert that contract at the component boundary.
 */
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  AnimalListadoDesktop,
  type AnimalListadoDesktopColumn,
  type AnimalListadoDesktopProps,
  type AnimalListadoDesktopRow,
} from "../src/ganado/animal-listado-desktop"

afterEach(() => cleanup())

const columnas: readonly AnimalListadoDesktopColumn[] = [
  { id: "codigo", label: "Código" },
  { id: "nombre", label: "Nombre" },
  { id: "sexo", label: "Sexo" },
  { id: "raza", label: "Raza" },
]

const filas: readonly AnimalListadoDesktopRow[] = [
  { id: "a-1", cells: ["MT-001", "Luna", "Hembra", "Holstein"] },
  { id: "a-2", cells: ["MT-002", "Sol", "Macho", "Brahman"] },
]

const permisos = { canCreate: true, canExport: true }

const selectorColumnas = [
  { id: "codigo", label: "Código", seleccionado: true, inmutable: true },
  { id: "nombre", label: "Nombre", seleccionado: true, inmutable: true },
  { id: "sexo", label: "Sexo", seleccionado: true, inmutable: false },
  { id: "raza", label: "Raza", seleccionado: false, inmutable: false },
]

function propsListo(overrides: Partial<AnimalListadoDesktopProps> = {}): AnimalListadoDesktopProps {
  return {
    columns: columnas,
    estado: "listo",
    rows: filas,
    total: 2,
    totalSinFiltro: 10,
    permissions: permisos,
    onAbrirFicha: vi.fn(),
    paginacion: {
      pagina: 1,
      totalPaginas: 4,
      pageSize: 25,
      pageSizes: [25, 50, 100],
      onCambiarPagina: vi.fn(),
      onCambiarPageSize: vi.fn(),
    },
    selectorColumnas: { columnas: selectorColumnas, onCambiar: vi.fn() },
    onResetPreferencias: vi.fn(),
    puedeResetear: true,
    ...overrides,
  }
}

describe("presentational pagination", () => {
  it("invokes the page callback with the target page", async () => {
    const onCambiarPagina = vi.fn()
    render(
      <AnimalListadoDesktop
        {...propsListo({
          paginacion: {
            pagina: 2,
            totalPaginas: 4,
            pageSize: 25,
            pageSizes: [25, 50, 100],
            onCambiarPagina,
            onCambiarPageSize: vi.fn(),
          },
        })}
      />,
    )

    await userEvent.setup().click(screen.getByRole("button", { name: "Página siguiente" }))
    expect(onCambiarPagina).toHaveBeenCalledWith(3)
  })

  it("disables backward navigation on the first page and forward on the last", () => {
    const { rerender } = render(<AnimalListadoDesktop {...propsListo()} />)
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Página siguiente" })).toBeEnabled()

    rerender(
      <AnimalListadoDesktop
        {...propsListo({
          paginacion: {
            pagina: 4,
            totalPaginas: 4,
            pageSize: 25,
            pageSizes: [25, 50, 100],
            onCambiarPagina: vi.fn(),
            onCambiarPageSize: vi.fn(),
          },
        })}
      />,
    )
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Página siguiente" })).toBeDisabled()
  })

  it("invokes the page-size callback with the chosen size", async () => {
    const onCambiarPageSize = vi.fn()
    render(
      <AnimalListadoDesktop
        {...propsListo({
          paginacion: {
            pagina: 1,
            totalPaginas: 4,
            pageSize: 25,
            pageSizes: [25, 50, 100],
            onCambiarPagina: vi.fn(),
            onCambiarPageSize,
          },
        })}
      />,
    )

    await userEvent.setup().selectOptions(screen.getByRole("combobox", { name: "Filas por página" }), "50")
    expect(onCambiarPageSize).toHaveBeenCalledWith(50)
  })
})

describe("presentational column selector", () => {
  it("keeps Código and Nombre selected and immutable", async () => {
    const onCambiar = vi.fn()
    render(
      <AnimalListadoDesktop
        {...propsListo({ selectorColumnas: { columnas: selectorColumnas, onCambiar } })}
      />,
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Columnas" }))
    const dialogo = screen.getByRole("group", { name: "Columnas visibles" })
    const codigo = within(dialogo).getByRole("checkbox", { name: "Código" })
    const nombre = within(dialogo).getByRole("checkbox", { name: "Nombre" })
    expect(codigo).toBeChecked()
    expect(codigo).toBeDisabled()
    expect(nombre).toBeChecked()
    expect(nombre).toBeDisabled()

    // Attempting to deselect a mandatory column never invokes removal.
    await user.click(codigo)
    expect(onCambiar).not.toHaveBeenCalled()
  })

  it("invokes the change callback with the toggled selection", async () => {
    const onCambiar = vi.fn()
    render(
      <AnimalListadoDesktop
        {...propsListo({ selectorColumnas: { columnas: selectorColumnas, onCambiar } })}
      />,
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Columnas" }))
    const dialogo = screen.getByRole("group", { name: "Columnas visibles" })
    await user.click(within(dialogo).getByRole("checkbox", { name: "Raza" }))

    expect(onCambiar).toHaveBeenCalledTimes(1)
    expect(onCambiar).toHaveBeenCalledWith(["codigo", "nombre", "sexo", "raza"])
  })
})

describe("reset delegation", () => {
  it("invokes the reset callback once when activated", async () => {
    const onResetPreferencias = vi.fn()
    render(<AnimalListadoDesktop {...propsListo({ onResetPreferencias, puedeResetear: true })} />)

    await userEvent.setup().click(screen.getByRole("button", { name: "Restablecer preferencias" }))
    expect(onResetPreferencias).toHaveBeenCalledTimes(1)
  })

  it("hides the reset control when the selection is already the default", () => {
    render(<AnimalListadoDesktop {...propsListo({ puedeResetear: false })} />)
    expect(screen.queryByRole("button", { name: "Restablecer preferencias" })).not.toBeInTheDocument()
  })
})

describe("retryable preference warning", () => {
  it("preserves the current selection and invokes retry on request", async () => {
    const onReintentarPreferencias = vi.fn()
    render(
      <AnimalListadoDesktop
        {...propsListo({
          avisoPreferencias: { mensaje: "No se pudieron guardar tus preferencias." },
          onReintentarPreferencias,
        })}
      />,
    )

    // The table selection is preserved — the rows still render.
    expect(screen.getByText("MT-001")).toBeInTheDocument()
    expect(screen.getByText("MT-002")).toBeInTheDocument()

    const aviso = screen.getByRole("alert")
    expect(aviso).toHaveTextContent("No se pudieron guardar tus preferencias.")
    await userEvent.setup().click(within(aviso).getByRole("button", { name: "Reintentar" }))
    expect(onReintentarPreferencias).toHaveBeenCalledTimes(1)
  })

  it("renders no warning when the preference state is healthy", () => {
    render(<AnimalListadoDesktop {...propsListo({ avisoPreferencias: null })} />)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})
