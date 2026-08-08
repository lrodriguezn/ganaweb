// @vitest-environment jsdom

/**
 * FormularioVacuna — prop aditiva `productoIdInicial` (Issue #212, SAN-003).
 *
 * El panel precarga el producto al abrir el registro de aplicación desde
 * una fila de Próximas. La prop es ADITIVA: sin ella el comportamiento
 * existente (producto vacío) no cambia. El guardado sigue siendo el
 * placeholder de SAN-047 (el caso de uso real llega con #211).
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
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

/** ISO local (AAAA-MM-DD) — igual que el que calcula el componente. */
function hoyIsoLocal(): string {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, "0")
  const dia = String(ahora.getDate()).padStart(2, "0")
  return `${ahora.getFullYear()}-${mes}-${dia}`
}

function isoMasDias(dias: number): string {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  const mes = String(fecha.getMonth() + 1).padStart(2, "0")
  const dia = String(fecha.getDate()).padStart(2, "0")
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

describe("FormularioVacuna — Issue #211: campo fecha (SAN-041, RN-002, SAN-043)", () => {
  it("SAN-041: el campo fecha inicia en hoy", () => {
    renderEnDrawer(
      <FormularioVacuna
        animales={ANIMALES}
        productos={PRODUCTOS}
        productoIdInicial="prod-aftosa"
        onGuardar={async () => {}}
      />,
    )

    const fecha = screen.getByLabelText("Fecha") as HTMLInputElement
    expect(fecha.value).toBe(hoyIsoLocal())
  })

  it("RN-002: una fecha futura se rechaza al guardar y no invoca onGuardar", async () => {
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

    const manana = isoMasDias(1)
    fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: manana } })
    await user.click(screen.getByRole("button", { name: /Guardar 2 registros/ }))

    expect(onGuardar).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(/futura/)
  })

  it("SAN-043: una fecha pasada advierte captura tardía sin bloquear el guardado", async () => {
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

    const ayer = isoMasDias(-1)
    fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: ayer } })
    await user.click(screen.getByRole("button", { name: /Guardar 2 registros/ }))

    // La advertencia es visible pero no bloquea (el servidor revalida RN-003).
    expect(screen.getByText(/tardía/i)).toBeInTheDocument()
    expect(onGuardar).toHaveBeenCalledTimes(1)
    expect(onGuardar.mock.calls[0]?.[0]?.fecha).toBe(ayer)
  })

  it("el payload de onGuardar incluye la fecha capturada", async () => {
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

    fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: "2026-08-01" } })
    await user.click(screen.getByRole("button", { name: /Guardar 2 registros/ }))

    expect(onGuardar.mock.calls[0]?.[0]?.fecha).toBe("2026-08-01")
  })
})

describe("FormularioVacuna — Issue #211: dosis por defecto del producto (SAN-041)", () => {
  it("con producto precargado, la dosis inicia en ml_mg_por_dosis", () => {
    renderEnDrawer(
      <FormularioVacuna
        animales={ANIMALES}
        productos={PRODUCTOS}
        productoIdInicial="prod-aftosa"
        onGuardar={async () => {}}
      />,
    )

    // prod-aftosa tiene mlPorDosis 2.
    const dosis = screen.getByLabelText(/Dosis/) as HTMLInputElement
    expect(dosis.value).toBe("2")
  })

  it("al cambiar de producto, la dosis sigue al nuevo ml_mg_por_dosis", async () => {
    const user = userEvent.setup()
    renderEnDrawer(
      <FormularioVacuna
        animales={ANIMALES}
        productos={PRODUCTOS}
        productoIdInicial="prod-aftosa"
        onGuardar={async () => {}}
      />,
    )

    await user.click(screen.getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: /Ivermectina 1%/ }))

    // prod-iverm tiene mlPorDosis 1.
    const dosis = screen.getByLabelText(/Dosis/) as HTMLInputElement
    expect(dosis.value).toBe("1")
  })

  it("sin ml_mg_por_dosis el default de dosis no cambia", () => {
    renderEnDrawer(
      <FormularioVacuna
        animales={ANIMALES}
        productos={[{ id: "prod-sin-ml", descripcion: "Sin ml", dosisDisponibles: 10 }]}
        productoIdInicial="prod-sin-ml"
        onGuardar={async () => {}}
      />,
    )

    const dosis = screen.getByLabelText(/Dosis/) as HTMLInputElement
    expect(dosis.value).toBe("1")
  })
})

describe("FormularioVacuna — Issue #211: indicador offline (SAN-044)", () => {
  function conNavigatorOnLine(online: boolean, cuerpo: () => void) {
    const original = Object.getOwnPropertyDescriptor(window.navigator, "onLine")
    Object.defineProperty(window.navigator, "onLine", { value: online, configurable: true })
    try {
      cuerpo()
    } finally {
      if (original) Object.defineProperty(window.navigator, "onLine", original)
    }
  }

  it("con navigator.onLine=false muestra el indicador ☁ offline", () => {
    conNavigatorOnLine(false, () => {
      renderEnDrawer(
        <FormularioVacuna
          animales={ANIMALES}
          productos={PRODUCTOS}
          productoIdInicial="prod-aftosa"
          onGuardar={async () => {}}
        />,
      )
    })

    expect(screen.getByText(/offline/i)).toBeInTheDocument()
    // La nota de sincronización pendiente sigue visible (RN-060).
    expect(screen.getByText(/Se sincronizará al recuperar señal/i)).toBeInTheDocument()
  })

  it("con navigator.onLine=true no muestra el indicador", () => {
    conNavigatorOnLine(true, () => {
      renderEnDrawer(
        <FormularioVacuna
          animales={ANIMALES}
          productos={PRODUCTOS}
          productoIdInicial="prod-aftosa"
          onGuardar={async () => {}}
        />,
      )
    })

    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
  })
})

describe("FormularioVacuna — Issue #211: precarga de animales (SAN-011)", () => {
  it("animalesIdsIniciales acota la selección inicial y viaja en el guardado", async () => {
    const user = userEvent.setup()
    const onGuardar = vi.fn(async () => undefined)
    renderEnDrawer(
      <FormularioVacuna
        animales={ANIMALES}
        productos={PRODUCTOS}
        productoIdInicial="prod-aftosa"
        animalesIdsIniciales={["animal-2"]}
        onGuardar={onGuardar}
      />,
    )

    // Sólo el animal precargado queda seleccionado.
    expect(screen.getByRole("button", { name: /Guardar 1 registro/ })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /Guardar 1 registro/ }))
    expect(onGuardar.mock.calls[0]?.[0]?.animalesIds).toEqual(["animal-2"])
  })

  it("sin animalesIdsIniciales la selección inicial incluye todos (comportamiento existente)", () => {
    renderEnDrawer(
      <FormularioVacuna
        animales={ANIMALES}
        productos={PRODUCTOS}
        productoIdInicial="prod-aftosa"
        onGuardar={async () => {}}
      />,
    )

    expect(screen.getByRole("button", { name: /Guardar 2 registros/ })).toBeInTheDocument()
  })

  it("animalesIdsIniciales ignora ids fuera de la lista cargada", () => {
    renderEnDrawer(
      <FormularioVacuna
        animales={ANIMALES}
        productos={PRODUCTOS}
        productoIdInicial="prod-aftosa"
        animalesIdsIniciales={["animal-1", "animal-fantasma"]}
        onGuardar={async () => {}}
      />,
    )

    expect(screen.getByRole("button", { name: /Guardar 1 registro/ })).toBeInTheDocument()
  })
})
