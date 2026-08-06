// @vitest-environment jsdom

/**
 * ListadoEntradasAlmacen (Issue #210, SAN-014/SAN-031).
 *
 * Cubre:
 * - SAN-014: cada entrada muestra fecha, producto, dosis, precio y comentario.
 * - SAN-031: stock calculado negativo = alerta de reconciliación (role=alert),
 *   no un error que bloquee; el listado sigue visible.
 * - Estado vacío sin entradas.
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ListadoEntradasAlmacen } from "../src/ganado/listado-entradas-almacen"

afterEach(() => cleanup())

const ENTRADAS = [
  {
    id: "ent-1",
    fecha: "2026-08-02",
    productoCodigo: "VAC-AFTOSA",
    productoDescripcion: "Vacuna fiebre aftosa",
    dosis: 20,
    precioPorDosis: 3500,
    comentario: "Compra distribuidor",
  },
  {
    id: "ent-2",
    fecha: "2026-08-01",
    productoCodigo: "IVERMECTINA",
    productoDescripcion: "Ivermectina 1%",
    dosis: 80,
    precioPorDosis: null,
    comentario: null,
  },
]

describe("ListadoEntradasAlmacen — SAN-014: columnas de la entrada", () => {
  it("muestra fecha, producto, dosis, precio y comentario por entrada", () => {
    render(<ListadoEntradasAlmacen entradas={ENTRADAS} />)

    // Entrada 1: con precio y comentario.
    expect(screen.getByText("2026-08-02")).toBeInTheDocument()
    expect(screen.getByText("Vacuna fiebre aftosa")).toBeInTheDocument()
    expect(screen.getByText("20 dosis")).toBeInTheDocument()
    expect(screen.getByText("3500")).toBeInTheDocument()
    expect(screen.getByText("Compra distribuidor")).toBeInTheDocument()

    // Entrada 2: precio y comentario ausentes degradan a "—".
    expect(screen.getByText("2026-08-01")).toBeInTheDocument()
    expect(screen.getByText("Ivermectina 1%")).toBeInTheDocument()
    expect(screen.getByText("80 dosis")).toBeInTheDocument()
    expect(screen.getAllByText("—")).toHaveLength(2)
  })

  it("muestra el código del producto junto a la descripción", () => {
    render(<ListadoEntradasAlmacen entradas={[ENTRADAS[0]]} />)
    expect(screen.getByText(/VAC-AFTOSA/)).toBeInTheDocument()
  })
})

describe("ListadoEntradasAlmacen — SAN-031: stock negativo", () => {
  it("stock negativo muestra alerta de reconciliación sin ocultar el listado", () => {
    render(<ListadoEntradasAlmacen entradas={ENTRADAS} stockDisponible={-5} />)

    const alerta = screen.getByRole("alert")
    expect(alerta).toHaveTextContent(/negativo/i)
    expect(alerta).toHaveTextContent(/reconcili/i)
    // El listado sigue visible: la alerta no es un error bloqueante.
    expect(screen.getByText("Vacuna fiebre aftosa")).toBeInTheDocument()
  })

  it("stock positivo no muestra alerta", () => {
    render(<ListadoEntradasAlmacen entradas={ENTRADAS} stockDisponible={100} />)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("stock cero (agotado) no muestra alerta de reconciliación", () => {
    render(<ListadoEntradasAlmacen entradas={ENTRADAS} stockDisponible={0} />)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})

describe("ListadoEntradasAlmacen — estado vacío", () => {
  it("sin entradas muestra el mensaje de vacío", () => {
    render(<ListadoEntradasAlmacen entradas={[]} />)
    expect(screen.getByText(/sin entradas/i)).toBeInTheDocument()
  })
})
