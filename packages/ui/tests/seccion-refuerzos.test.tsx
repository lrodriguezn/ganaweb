// @vitest-environment jsdom

/**
 * SeccionRefuerzos — sección móvil del tab Refuerzos (Issue #213,
 * RF-SANIDAD v0.2 §5, SAN-011/SAN-012).
 *
 * Reglas cubiertas (TS-001):
 * - SAN-010/D10: 2 periodos en mobile — "ESTA SEMANA" / "PRÓXIMA SEMANA".
 *   Cada título lleva el contador entre paréntesis.
 * - SAN-011: cada refuerzo se renderiza vía `RefuerzoCard`; tap dispara el
 *   callback de precarga.
 * - SAN-012/KPI-10: sección "STOCK CRÍTICO" con hasta 4 productos y badge
 *   Agotado / "N dosis". Si el stock está vacío → "Sin productos críticos.".
 * - PE-001/SAN-061: la sección "STOCK CRÍTICO" se gatea por permiso
 *   `sanidad:ver`.
 */

import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  type AlertaStockRefuerzoMovil,
  type RefuerzoCardItem,
  SeccionRefuerzos,
} from "../src/ganado/seccion-refuerzos"
import { crearPermisos } from "../src/ganado/types"

afterEach(() => cleanup())

const PERMISOS_COMPLETOS = crearPermisos([
  { modulo: "sanidad", accion: "ver" },
  { modulo: "sanidad", accion: "crear" },
])
const PERMISOS_SIN_VER = crearPermisos([{ modulo: "sanidad", accion: "crear" }])

const REFUERZOS_ESTA: RefuerzoCardItem[] = [
  {
    productoId: "prod-aftosa",
    codigo: "VAC-AFTOSA",
    descripcion: "Vacuna fiebre aftosa",
    proposito: "Vacuna",
    cantidadAnimales: 12,
    venceFecha: "2026-08-06",
    animalIds: ["animal-1"],
  },
  {
    productoId: "prod-cepa",
    codigo: "VAC-CEPA",
    descripcion: "Vacuna cepa",
    proposito: "Vacuna",
    cantidadAnimales: 4,
    venceFecha: "2026-08-07",
    animalIds: ["animal-2"],
  },
]

const REFUERZOS_PROXIMA: RefuerzoCardItem[] = [
  {
    productoId: "prod-iverm",
    codigo: "IVERMECTINA",
    descripcion: "Ivermectina 1%",
    proposito: "Tratamiento",
    cantidadAnimales: 8,
    venceFecha: "2026-08-12",
    animalIds: ["animal-3"],
  },
]

const STOCK: AlertaStockRefuerzoMovil[] = [
  { productoId: "prod-aftosa", descripcion: "Vacuna fiebre aftosa", estado: "agotado" },
  { productoId: "prod-iverm", descripcion: "Ivermectina 1%", estado: "bajo", dosis: 5 },
]

function renderSeccion(
  overrides: Partial<Parameters<typeof SeccionRefuerzos>[0]> = {},
  permisos = PERMISOS_COMPLETOS,
) {
  return render(
    <SeccionRefuerzos
      permisos={permisos}
      estaSemana={REFUERZOS_ESTA}
      proximaSemana={REFUERZOS_PROXIMA}
      stock={STOCK}
      onRegistrarAplicacion={vi.fn()}
      {...overrides}
    />,
  )
}

describe("SeccionRefuerzos — D10: 2 periodos mobile con contadores", () => {
  it("muestra 'ESTA SEMANA (2)' y 'PRÓXIMA SEMANA (1)' con el conteo entre paréntesis", () => {
    renderSeccion()

    expect(screen.getByRole("heading", { level: 3, name: /ESTA SEMANA \(2\)/ })).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 3, name: /PRÓXIMA SEMANA \(1\)/ }),
    ).toBeInTheDocument()
  })

  it("muestra 'ESTA SEMANA (0)' cuando la lista está vacía y oculta el cuerpo", () => {
    renderSeccion({ estaSemana: [] })

    expect(screen.getByRole("heading", { level: 3, name: /ESTA SEMANA \(0\)/ })).toBeInTheDocument()
    // Sin tarjetas, la sección no debe pintar el cuerpo del período.
    expect(screen.queryByRole("button", { name: /Vacuna fiebre aftosa/ })).not.toBeInTheDocument()
  })

  it("tap en una card dispara onRegistrarAplicacion con producto y animalIds", async () => {
    const user = userEvent.setup()
    const onRegistrar = vi.fn()
    renderSeccion({ onRegistrarAplicacion: onRegistrar })

    await user.click(screen.getByRole("button", { name: /Vacuna fiebre aftosa.*12 animales/ }))

    expect(onRegistrar).toHaveBeenCalledWith("prod-aftosa", ["animal-1"])
  })
})

describe("SeccionRefuerzos — SAN-012: STOCK CRÍTICO", () => {
  it("muestra el título STOCK CRÍTICO con sus productos y badge", () => {
    renderSeccion()

    const stock = screen.getByRole("region", { name: "Stock crítico" })
    expect(within(stock).getByText(/Stock crítico/i)).toBeInTheDocument()
    // Agotado: badge literal.
    expect(within(stock).getByText("Agotado")).toBeInTheDocument()
    // Bajo: badge con N dosis.
    expect(within(stock).getByText(/5 dosis/)).toBeInTheDocument()
  })

  it("muestra 'Sin productos críticos.' cuando la lista llega vacía", () => {
    renderSeccion({ stock: [] })

    const stock = screen.getByRole("region", { name: "Stock crítico" })
    expect(within(stock).getByText(/Sin productos críticos\./)).toBeInTheDocument()
  })

  it("muestra como máximo 4 productos en STOCK CRÍTICO (KPI-10)", () => {
    const cinco: AlertaStockRefuerzoMovil[] = [
      { productoId: "p1", descripcion: "Producto 1", estado: "agotado" },
      { productoId: "p2", descripcion: "Producto 2", estado: "agotado" },
      { productoId: "p3", descripcion: "Producto 3", estado: "bajo", dosis: 1 },
      { productoId: "p4", descripcion: "Producto 4", estado: "bajo", dosis: 2 },
      { productoId: "p5", descripcion: "Producto 5", estado: "bajo", dosis: 3 },
    ]
    renderSeccion({ stock: cinco })

    const stock = screen.getByRole("region", { name: "Stock crítico" })
    expect(within(stock).getAllByRole("listitem")).toHaveLength(4)
    // El 5° producto no debe renderizar.
    expect(within(stock).queryByText(/Producto 5/)).not.toBeInTheDocument()
  })
})

describe("SeccionRefuerzos — PE-001: gating por permiso sanidad:ver", () => {
  it("con sanidad:ver muestra STOCK CRÍTICO", () => {
    renderSeccion({}, PERMISOS_COMPLETOS)
    expect(screen.getByRole("region", { name: "Stock crítico" })).toBeInTheDocument()
  })

  it("sin sanidad:ver oculta la sección de STOCK CRÍTICO", () => {
    renderSeccion({}, PERMISOS_SIN_VER)
    expect(screen.queryByRole("region", { name: "Stock crítico" })).not.toBeInTheDocument()
    // Los períodos sí se renderizan (la regla de SAN-011 no depende de sanidad:ver
    // explícito; en este test se asume que sin ver, los datos ya no llegan).
    // Lo que validamos aquí es SOLO el gating de STOCK CRÍTICO.
  })
})
