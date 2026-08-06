// @vitest-environment jsdom

/**
 * FormularioVacuna — prop aditiva `productoIdInicial` (Issue #212, SAN-003).
 *
 * El panel precarga el producto al abrir el registro de aplicación desde
 * una fila de Próximas. La prop es ADITIVA: sin ella el comportamiento
 * existente (producto vacío) no cambia. El guardado sigue siendo el
 * placeholder de SAN-047 (el caso de uso real llega con #211).
 */

import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type * as React from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
  FormularioVacuna,
  type ProductoSanitario,
} from "../src/ganado/event-drawer/formulario-vacuna"
import type { AnimalResumen } from "../src/ganado/types"
import { Drawer, DrawerContent } from "../src/primitives/drawer"

beforeAll(() => {
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

const PRODUCTOS: ProductoSanitario[] = [
  { id: "prod-aftosa", descripcion: "Vacuna fiebre aftosa", mlPorDosis: 2, dosisDisponibles: 142 },
  { id: "prod-iverm", descripcion: "Ivermectina 1%", mlPorDosis: 1, dosisDisponibles: 7 },
]

const ANIMALES: AnimalResumen[] = [
  {
    id: "animal-1",
    codigoAnimal: "AN-001",
    nombreAnimal: "Luna",
    sexo: "hembra",
    salud: "sano",
    estadoActual: "activo",
  },
  {
    id: "animal-2",
    codigoAnimal: "AN-002",
    nombreAnimal: "Sol",
    sexo: "hembra",
    salud: "sano",
    estadoActual: "activo",
  },
]

/** El formulario vive dentro del EventDrawer (vaul) — se envuelve para jsdom. */
function renderEnDrawer(ui: React.ReactElement) {
  return render(
    <Drawer open={true}>
      <DrawerContent>{ui}</DrawerContent>
    </Drawer>,
  )
}

describe("FormularioVacuna — SAN-003: precarga de producto", () => {
  it("con productoIdInicial el select inicia con ese producto seleccionado", () => {
    renderEnDrawer(
      <FormularioVacuna
        animales={ANIMALES}
        productos={PRODUCTOS}
        productoIdInicial="prod-aftosa"
        onGuardar={async () => {}}
      />,
    )

    // El trigger del select muestra la descripción del producto precargado.
    expect(screen.getByText("Vacuna fiebre aftosa — 142 dosis")).toBeInTheDocument()
  })

  it("sin productoIdInicial el select inicia vacío (comportamiento existente)", () => {
    renderEnDrawer(
      <FormularioVacuna animales={ANIMALES} productos={PRODUCTOS} onGuardar={async () => {}} />,
    )

    expect(screen.getByText("Elegir producto")).toBeInTheDocument()
  })

  it("el producto precargado viaja en el guardado (placeholder SAN-047)", async () => {
    const user = userEvent.setup()
    const onGuardar = vi.fn(async () => undefined)
    renderEnDrawer(
      <FormularioVacuna
        animales={ANIMALES}
        productos={PRODUCTOS}
        productoIdInicial="prod-aftosa"
        onGuardar={onGuardar}
      />,
    )

    await user.click(screen.getByRole("button", { name: /Guardar 2 registros/ }))

    expect(onGuardar).toHaveBeenCalledTimes(1)
    expect(onGuardar.mock.calls[0]?.[0]?.productoId).toBe("prod-aftosa")
    expect(onGuardar.mock.calls[0]?.[0]?.animalesIds).toEqual(["animal-1", "animal-2"])
  })
})
