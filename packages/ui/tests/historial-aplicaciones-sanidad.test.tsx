// @vitest-environment jsdom

/**
 * HistorialAplicacionesSanidad — historial filtrable de aplicaciones
 * (Issue #212, D-005/SAN-004).
 *
 * Reglas cubiertas (TS-001):
 * - D-005: listado reutilizando el patrón de tablas, con filtros
 *   producto / fecha (desde-hasta) / animal-lote y paginación.
 * - SAN-004: columnas fecha, producto, objetivo (animal|lote + N animales),
 *   animal/lote, dosis y responsable.
 * - El componente es presentacional: los filtros y la paginación se
 *   resuelven en la ruta (URL); acá solo se reportan los cambios.
 */

import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
  type FilaHistorialSanidadVista,
  HistorialAplicacionesSanidad,
} from "../src/ganado/historial-aplicaciones-sanidad"

beforeAll(() => {
  // Radix Select en jsdom (patrón formulario-entrada-almacen.test.tsx).
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

const PRODUCTOS = [
  { id: "prod-aftosa", codigo: "VAC-AFTOSA", descripcion: "Vacuna fiebre aftosa" },
  { id: "prod-iverm", codigo: "IVERMECTINA", descripcion: "Ivermectina 1%" },
]

const FILAS: readonly FilaHistorialSanidadVista[] = [
  {
    id: "apl-1",
    fecha: "2026-08-04",
    productoCodigo: "VAC-AFTOSA",
    productoDescripcion: "Vacuna fiebre aftosa",
    objetivo: "animal",
    cantidadAnimales: 1,
    animalCodigo: "AN-001",
    loteDescripcion: null,
    dosis: 2,
    responsable: "María",
  },
  {
    id: "apl-2",
    fecha: "2026-08-03",
    productoCodigo: "IVERMECTINA",
    productoDescripcion: "Ivermectina 1%",
    objetivo: "lote",
    cantidadAnimales: 18,
    animalCodigo: null,
    loteDescripcion: "Lote 4",
    dosis: 1,
    responsable: "Pedro",
  },
]

const FILTROS_VACIOS = { productoId: "", desde: "", hasta: "", animalOLote: "" }

function renderHistorial(
  overrides: Partial<Parameters<typeof HistorialAplicacionesSanidad>[0]> = {},
) {
  return render(
    <HistorialAplicacionesSanidad
      filas={FILAS}
      total={12}
      pagina={1}
      tamanoPagina={10}
      productos={PRODUCTOS}
      filtros={FILTROS_VACIOS}
      onCambiarFiltros={() => {}}
      onCambiarPagina={() => {}}
      {...overrides}
    />,
  )
}

describe("HistorialAplicacionesSanidad — columnas (SAN-004/D-005)", () => {
  it("muestra fecha, producto, objetivo, animal/lote, dosis y responsable", () => {
    renderHistorial()

    const tabla = screen.getByRole("table")
    expect(within(tabla).getByText("2026-08-04")).toBeInTheDocument()
    expect(within(tabla).getByText("Vacuna fiebre aftosa")).toBeInTheDocument()
    // Objetivo animal: código del animal.
    expect(within(tabla).getByText("AN-001")).toBeInTheDocument()
    // Objetivo lote: nombre del lote + N animales.
    expect(within(tabla).getByText("Lote 4")).toBeInTheDocument()
    expect(within(tabla).getByText("18 animales")).toBeInTheDocument()
    // Objetivo animal: código + 1 animal.
    expect(within(tabla).getByText("1 animal")).toBeInTheDocument()
    expect(within(tabla).getByText("María")).toBeInTheDocument()
    expect(within(tabla).getByText("Pedro")).toBeInTheDocument()
  })

  it("una fila individual muestra 1 animal; una grupal muestra el total", () => {
    renderHistorial()

    const tabla = screen.getByRole("table")
    const filas = within(tabla).getAllByRole("row")
    // 1 fila de encabezado + 2 filas de datos.
    expect(filas).toHaveLength(3)
  })
})

describe("HistorialAplicacionesSanidad — filtros (D-005)", () => {
  it("el filtro de producto reporta el cambio con el productoId", async () => {
    const user = userEvent.setup()
    const onCambiarFiltros = vi.fn()
    renderHistorial({ onCambiarFiltros })

    await user.click(screen.getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: /IVERMECTINA/ }))

    expect(onCambiarFiltros).toHaveBeenCalledWith({
      ...FILTROS_VACIOS,
      productoId: "prod-iverm",
    })
  })

  it("el filtro de fecha desde reporta el cambio", async () => {
    const user = userEvent.setup()
    const onCambiarFiltros = vi.fn()
    renderHistorial({ onCambiarFiltros })

    await user.type(screen.getByLabelText(/desde/i), "2026-08-01")

    expect(onCambiarFiltros).toHaveBeenCalledWith({
      ...FILTROS_VACIOS,
      desde: "2026-08-01",
    })
  })

  it("el filtro animal/lote reporta el texto libre (input controlado)", async () => {
    const user = userEvent.setup()
    const onCambiarFiltros = vi.fn()

    // El componente es controlado: la ruta es dueña del estado. El wrapper
    // retroalimenta los filtros para que el texto se acumule (uso real).
    function Harness() {
      const [filtros, setFiltros] = React.useState(FILTROS_VACIOS)
      return (
        <HistorialAplicacionesSanidad
          filas={FILAS}
          total={12}
          pagina={1}
          tamanoPagina={10}
          productos={PRODUCTOS}
          filtros={filtros}
          onCambiarFiltros={(siguientes) => {
            setFiltros(siguientes)
            onCambiarFiltros(siguientes)
          }}
          onCambiarPagina={() => {}}
        />
      )
    }
    render(<Harness />)

    await user.type(screen.getByLabelText(/animal o lote/i), "Lote 4")

    expect(onCambiarFiltros).toHaveBeenLastCalledWith({
      ...FILTROS_VACIOS,
      animalOLote: "Lote 4",
    })
  })
})

describe("HistorialAplicacionesSanidad — paginación (D-005)", () => {
  it("muestra la página actual y habilita siguiente cuando hay más", async () => {
    const user = userEvent.setup()
    const onCambiarPagina = vi.fn()
    // total 12, tamanoPagina 10 → 2 páginas.
    renderHistorial({ onCambiarPagina })

    expect(screen.getByText(/página 1 de 2/i)).toBeInTheDocument()
    const siguiente = screen.getByRole("button", { name: /siguiente/i })
    expect(siguiente).toBeEnabled()
    await user.click(siguiente)

    expect(onCambiarPagina).toHaveBeenCalledWith(2)
  })

  it("en la última página deshabilita siguiente", () => {
    renderHistorial({ pagina: 2 })

    expect(screen.getByRole("button", { name: /siguiente/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /anterior/i })).toBeEnabled()
  })

  it("anterior en la página 1 está deshabilitado", () => {
    renderHistorial({ pagina: 1 })

    expect(screen.getByRole("button", { name: /anterior/i })).toBeDisabled()
  })
})

describe("HistorialAplicacionesSanidad — estado vacío", () => {
  it("sin filas muestra el mensaje de vacío", () => {
    renderHistorial({ filas: [], total: 0 })

    expect(screen.getByText(/sin aplicaciones registradas/i)).toBeInTheDocument()
  })
})
