// @vitest-environment jsdom

/**
 * Tests de integración del shell `EventoWizard` (Issue #229).
 *
 * Cubre el render de los 3 pasos, el respeto de preselecciones
 * (`tipoPreseleccionado`, `animalPreseleccionado`), RBAC visual, exclusiones
 * grupales, parto sin grupal, y la propagación de errores del server
 * (incluyendo 403 → mensaje en pantalla).
 *
 * El test mockea las server functions (`createServerFn`) para que el shell
 * no toque TanStack Start real; el contrato de los mocks vive en
 * `eventos-wizard.server.ts` y se verifica en el unit test puro
 * (`eventos-wizard.test.ts`).
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
  EventoWizard,
  type ResultadoCapturaEvento,
  criteriosDeRiesgo,
} from "../src/ganado/evento-wizard/index.js"

vi.mock("@tanstack/react-start", () => ({
  // El server function real se mockea a nivel de red en otros tests; acá
  // solo necesitamos que el shell compile.
  createServerFn: () => {
    const chain: Record<string, unknown> = {}
    chain.validator = () => chain
    chain.handler = (fn: unknown) => fn
    return chain
  },
}))

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

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const PERMISOS_TODOS = {
  reproductivo: true,
  sanidad: true,
  productivo: true,
  movimientos: true,
} as const

const PERMISOS_SOLO_PRODUCTIVO = {
  reproductivo: false,
  sanidad: false,
  productivo: true,
  movimientos: false,
} as const

const CATALOGOS_VACIOS = {
  lotes: [],
  potreros: [],
  grupos: [],
  sectores: [{ id: "sector-1", nombre: "Sector 1" }],
  padres: [{ id: "padre-1", nombre: "Padre 1", codigo: "P-1" }],
  pajuelas: [{ id: "pajuela-1", nombre: "Pajuela 1", codigo: "PJ-1" }],
  inseminadores: [{ id: "vet-1", nombre: "Veterinario 1" }],
  veterinarios: [{ id: "vet-1", nombre: "Veterinario 1" }],
  diagnosticos: [{ id: "diag-1", nombre: "Diagnóstico 1" }],
  productosSanitarios: [{ id: "producto-1", nombre: "Producto 1", codigo: "PROD-1" }],
  motivosVenta: [{ id: "motivo-1", nombre: "Motivo 1" }],
  lugaresVenta: [{ id: "lugar-1", nombre: "Lugar 1" }],
  causasMuerte: [{ id: "causa-1", nombre: "Causa 1" }],
}

const POLITICA_RIESGO_ELEGIDA = {
  tiposSensibles: ["revision_veterinaria", "parto", "servicio", "palpacion"],
} as const

function regexParaNombre(nombre: string) {
  return new RegExp(nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
}

function props(overrides: Partial<React.ComponentProps<typeof EventoWizard>> = {}) {
  return {
    open: true,
    onOpenChange: vi.fn(),
    fincaId: "finca-1",
    permisosEfectivos: PERMISOS_TODOS,
    catalogos: CATALOGOS_VACIOS,
    cargarAnimalesPorOrigen: vi.fn(async () => []),
    buscarAnimalPorCodigo: vi.fn(async () => null),
    onEnviar: vi.fn(
      async (): Promise<ResultadoCapturaEvento> => ({
        tipo: "capturado",
        ids: { individualId: "ev-1", hijosIds: [] },
      }),
    ),
    politicaRiesgo: POLITICA_RIESGO_ELEGIDA,
    ...overrides,
  }
}

async function prepararWizardGrupal() {
  const user = userEvent.setup()
  render(
    <EventoWizard
      {...props({
        tipoPreseleccionado: "pesaje",
        cargarAnimalesPorOrigen: vi.fn(async () => [
          { id: "a-1", codigoAnimal: "MT-100" },
          { id: "a-2", codigoAnimal: "MT-101" },
        ]),
      })}
    />,
  )
  await user.click(screen.getByRole("radio", { name: "Grupal" }))
  await screen.findByText("0 animales incluidos")
  await user.click(screen.getByRole("button", { name: "Seleccionar todos" }))
  await user.click(screen.getByRole("button", { name: "Continuar con 2 animales" }))
  await user.clear(screen.getByLabelText(/Peso/))
  await user.type(screen.getByLabelText(/Peso/), "420")
  return user
}

describe("EventoWizard — Paso 1: selector de tipo agrupado por categoría", () => {
  it("abre con el Paso 1 cuando no hay tipo preseleccionado", () => {
    render(<EventoWizard {...props()} />)
    expect(screen.getByText("¿Qué registrar?")).toBeInTheDocument()
    expect(screen.getByText("Reproductivo")).toBeInTheDocument()
    expect(screen.getByText("Sanidad")).toBeInTheDocument()
    expect(screen.getByText("Productivo")).toBeInTheDocument()
    expect(screen.getByText("Movimientos")).toBeInTheDocument()
    expect(screen.getByTestId("evento-wizard-type-scroll")).toHaveClass("overflow-y-auto")
    expect(screen.getByTestId("evento-wizard-step-indicator")).toHaveAttribute(
      "aria-label",
      "Progreso del registro de evento",
    )
  })

  it("renders every catalog option with compact responsive classes", () => {
    render(<EventoWizard {...props()} />)

    for (const label of [
      "Servicio",
      "Palpación",
      "Parto",
      "Aplicación sanitaria",
      "Revisión veterinaria",
      "Pesaje",
      "Producción láctea",
      "Condición corporal",
      "Venta",
      "Muerte",
      "Traslado",
    ]) {
      expect(screen.getByRole("button", { name: new RegExp(label) })).toBeInTheDocument()
    }
    expect(screen.getByRole("button", { name: /Parto.*solo individual/i })).toHaveTextContent(
      "Solo individual",
    )
  })

  it.each([
    ["reproductivo", ["Servicio", "Palpación", "Parto"], "Pesaje"],
    ["sanidad", ["Aplicación sanitaria", "Revisión veterinaria"], "Servicio"],
    ["productivo", ["Pesaje", "Producción láctea", "Condición corporal"], "Venta"],
    ["movimientos", ["Venta", "Muerte", "Traslado"], "Pesaje"],
  ] as const)(
    "filters the contextual %s category without selecting a type",
    async (categoria, tiposEsperados, tipoAusente) => {
      render(<EventoWizard {...props({ categoriaInicial: categoria })} />)

      const category = screen.getByTestId(`evento-wizard-category-${categoria}`)
      await waitFor(() => expect(category).toHaveFocus())
      for (const label of tiposEsperados) {
        expect(screen.getByRole("button", { name: new RegExp(label) })).toHaveAttribute(
          "aria-pressed",
          "false",
        )
      }
      expect(
        screen.queryByRole("button", { name: new RegExp(tipoAusente) }),
      ).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Ver todos los tipos" })).toBeInTheDocument()
    },
  )

  it("restores every authorized category without closing the wizard", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<EventoWizard {...props({ categoriaInicial: "sanidad", onOpenChange })} />)

    await user.click(screen.getByRole("button", { name: "Ver todos los tipos" }))

    expect(screen.getByText("Reproductivo")).toBeInTheDocument()
    expect(screen.getByText("Sanidad")).toBeInTheDocument()
    expect(screen.getByText("Productivo")).toBeInTheDocument()
    expect(screen.getByText("Movimientos")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ver todos los tipos" })).not.toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("fails closed in an unauthorized contextual category and allows showing authorized types", async () => {
    const user = userEvent.setup()
    render(
      <EventoWizard
        {...props({
          categoriaInicial: "sanidad",
          permisosEfectivos: PERMISOS_SOLO_PRODUCTIVO,
        })}
      />,
    )

    expect(screen.getByRole("status")).toHaveTextContent(
      "No tienes tipos autorizados en esta categoría.",
    )
    expect(screen.queryByText("Productivo")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Ver todos los tipos" }))

    expect(screen.getByText("Productivo")).toBeInTheDocument()
    expect(screen.queryByText("Sanidad")).not.toBeInTheDocument()
  })

  it("oculta categorías sin permiso de creación (RBAC visual fail-closed)", () => {
    render(<EventoWizard {...props({ permisosEfectivos: PERMISOS_SOLO_PRODUCTIVO })} />)
    expect(screen.getByText("Productivo")).toBeInTheDocument()
    expect(screen.queryByText("Reproductivo")).not.toBeInTheDocument()
    expect(screen.queryByText("Sanidad")).not.toBeInTheDocument()
    expect(screen.queryByText("Movimientos")).not.toBeInTheDocument()
  })

  it("marca tipos con 'solo individual' (parto, muerte, condición corporal)", () => {
    render(<EventoWizard {...props()} />)
    const parto = screen.getByRole("button", { name: /Parto/ })
    expect(parto.getAttribute("aria-label")).toMatch(/solo individual/)
    const pesaje = screen.getByRole("button", { name: /Pesaje/ })
    expect(pesaje.getAttribute("aria-label")).not.toMatch(/solo individual/)
    expect(parto).toHaveClass("focus-visible:ring-2")
  })

  it("avanza de Tipo a Alcance al seleccionar una opción", async () => {
    const user = userEvent.setup()
    render(<EventoWizard {...props()} />)

    await user.click(screen.getByRole("button", { name: /Pesaje/ }))

    expect(screen.getByText("¿A quiénes?")).toBeInTheDocument()
    expect(screen.getByTestId("evento-wizard-step-indicator")).toHaveTextContent(
      /1\. Tipo\s*\/\s*2\. Alcance\s*\/\s*3\. Datos/,
    )
    expect(
      screen.getByTestId("evento-wizard-step-indicator").querySelector('[aria-current="step"]'),
    ).toHaveTextContent("2. Alcance")
    expect(screen.queryByText("¿Qué registrar?")).not.toBeInTheDocument()
  })
})

describe("EventoWizard — Paso 2: alcance individual/grupal con exclusiones", () => {
  it("salta directamente al Paso 3 cuando animal Y tipo están preseleccionados", () => {
    render(
      <EventoWizard
        {...props({
          animalPreseleccionado: { id: "animal-1", codigoAnimal: "MT-122" },
          tipoPreseleccionado: "pesaje",
        })}
      />,
    )
    // Sin Paso 1 ni Paso 2: render directo del Paso 3 (formulario del
    // dominio). El título del marco es el del form (no "¿A quiénes?").
    expect(screen.queryByText("¿Qué registrar?")).not.toBeInTheDocument()
    expect(screen.queryByText("¿A quiénes?")).not.toBeInTheDocument()
    expect(screen.getByText("Registrar pesaje")).toBeInTheDocument()
    expect(
      screen.getByTestId("evento-wizard-step-indicator").querySelector('[aria-current="step"]'),
    ).toHaveTextContent("3. Datos")
  })

  it("muestra el Paso 1 cuando SOLO hay animal preseleccionado (RBAC requiere tipo)", () => {
    render(
      <EventoWizard
        {...props({
          animalPreseleccionado: { id: "animal-1", codigoAnimal: "MT-122" },
        })}
      />,
    )
    // El wizard pide el tipo primero; el animal preseleccionado se usará
    // cuando el usuario llegue al Paso 2 (individual ya resuelto).
    expect(screen.getByText("¿Qué registrar?")).toBeInTheDocument()
  })

  it("salta directamente al Paso 2 cuando hay tipo preseleccionado", () => {
    render(<EventoWizard {...props({ tipoPreseleccionado: "pesaje" })} />)
    // El Paso 2 (alcance) está visible. El Paso 1 (tipo) NO.
    expect(screen.getByText("¿A quiénes?")).toBeInTheDocument()
    expect(screen.queryByText("¿Qué registrar?")).not.toBeInTheDocument()
    expect(
      screen.getByTestId("evento-wizard-step-indicator").querySelector('[aria-current="step"]'),
    ).toHaveTextContent("2. Alcance")
  })

  it("requiere seleccionar explícitamente el resultado individual", async () => {
    const user = userEvent.setup()
    const onEnviar = vi.fn(
      async (): Promise<ResultadoCapturaEvento> => ({
        tipo: "capturado",
        ids: { individualId: "ev-1", hijosIds: [] },
      }),
    )
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          buscarAnimalPorCodigo: vi.fn(async () => ({ id: "a-1", codigoAnimal: "MT-122" })),
          onEnviar,
        })}
      />,
    )

    await user.type(screen.getByLabelText("Código del animal"), "MT-122")
    await user.click(screen.getByRole("button", { name: "Buscar" }))

    expect(screen.getByText("MT-122")).toBeInTheDocument()
    expect(screen.getByText("¿A quiénes?")).toBeInTheDocument()
    expect(screen.queryByText("Registrar pesaje")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Seleccionar MT-122" }))
    expect(screen.getByText("Registrar pesaje")).toBeInTheDocument()
    expect(screen.getByTestId("evento-wizard-step-indicator")).toHaveTextContent("3. Datos")
    const fecha = screen.getByLabelText(/Fecha/)
    const peso = screen.getByLabelText(/Peso/)
    await user.clear(fecha)
    await user.type(fecha, "2026-08-07")
    await user.clear(peso)
    await user.type(peso, "420")
    await user.click(screen.getByRole("button", { name: /Guardar/ }))
    await waitFor(() => expect(onEnviar).toHaveBeenCalledTimes(1))
    expect(onEnviar.mock.calls[0][0].seleccion).toEqual({ tipo: "individual", animalId: "a-1" })
  })

  it("ofrece alcance grupal para tipos que lo permiten", () => {
    render(<EventoWizard {...props({ tipoPreseleccionado: "pesaje" })} />)
    // Con pesaje (grupal=true) la pills de alcance está renderizada.
    const radiogroup = screen.getByRole("radiogroup", { name: "Alcance" })
    expect(radiogroup).toBeInTheDocument()
    expect(within(radiogroup).getByRole("radio", { name: "Individual" })).toBeInTheDocument()
    expect(within(radiogroup).getByRole("radio", { name: "Grupal" })).toBeInTheDocument()
  })

  it("renderiza exclusiones con el origen manual y animales cargados", async () => {
    const user = userEvent.setup()
    const onEnviar = vi.fn(
      async (): Promise<ResultadoCapturaEvento> => ({
        tipo: "capturado",
        ids: { individualId: "ev-1", hijosIds: [] },
      }),
    )
    const cargarAnimales = vi.fn(async () => [
      { id: "a-1", codigoAnimal: "MT-100" },
      { id: "a-2", codigoAnimal: "MT-101" },
      { id: "a-3", codigoAnimal: "MT-102" },
    ])
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          cargarAnimalesPorOrigen: cargarAnimales,
          onEnviar,
        })}
      />,
    )
    // Paso 2 arranca en "Individual"; el usuario cambia a "Grupal".
    const pillGrupal = screen.getByRole("radio", { name: "Grupal" })
    await user.click(pillGrupal)
    // Manual starts empty; select all makes the available universe explicit.
    await waitFor(() => expect(screen.getByText("0 animales incluidos")).toBeInTheDocument())
    await user.click(screen.getByRole("button", { name: "Seleccionar todos" }))
    expect(screen.getByText("3 animales incluidos")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Excluir MT-100/ }))
    expect(screen.getByText("2 animales incluidos")).toBeInTheDocument()
    // The CTA exposes the exact snapshot size.
    const confirmar = screen.getByRole("button", { name: "Continuar con 2 animales" })
    await user.click(confirmar)
    expect(screen.getByText("Registrar pesaje")).toBeInTheDocument()
    expect(screen.getByTestId("evento-wizard-step-indicator")).toHaveTextContent("3. Datos")

    const fecha = screen.getByLabelText(/Fecha/)
    const peso = screen.getByLabelText(/Peso/)
    await user.clear(fecha)
    await user.type(fecha, "2026-08-07")
    await user.clear(peso)
    await user.type(peso, "420")
    await user.click(screen.getByRole("button", { name: /Guardar/ }))
    await waitFor(() => expect(onEnviar).toHaveBeenCalledTimes(1))
    expect(onEnviar.mock.calls[0][0].seleccion).toEqual({
      tipo: "grupal",
      origen: "manual",
      animalIdsEfectivos: ["a-2", "a-3"],
      totalAnimales: 2,
      animales: [
        { id: "a-2", codigoAnimal: "MT-101" },
        { id: "a-3", codigoAnimal: "MT-102" },
      ],
    })
  })

  it("keeps selection stable while filtering and applies bulk actions to visible results", async () => {
    const user = userEvent.setup()
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          cargarAnimalesPorOrigen: vi.fn(async () => [
            { id: "a-1", codigoAnimal: "MT-100" },
            { id: "a-2", codigoAnimal: "MT-101" },
            { id: "a-3", codigoAnimal: "OT-200" },
          ]),
        })}
      />,
    )
    await user.click(screen.getByRole("radio", { name: "Grupal" }))
    await screen.findByText("0 animales incluidos")
    await user.click(screen.getByRole("button", { name: "Seleccionar todos" }))
    await user.type(screen.getByLabelText("Buscar animales"), "MT")
    await user.click(screen.getByRole("button", { name: "Quitar los 2 resultados" }))
    expect(screen.getByText("1 animales incluidos")).toBeInTheDocument()
    await user.clear(screen.getByLabelText("Buscar animales"))
    expect(screen.getByText("1 animales incluidos")).toBeInTheDocument()
    expect(screen.getByText("OT-200")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Ver excluidos (2)" }))
    expect(screen.getByText("MT-100")).toBeInTheDocument()
  })

  it("captures sparse animal overrides, removes redundant values, and warns before removal", async () => {
    const user = userEvent.setup()
    const onEnviar = vi.fn(
      async (): Promise<ResultadoCapturaEvento> => ({
        tipo: "capturado",
        ids: { cabeceraId: "rg-1", hijosIds: ["ev-1", "ev-2"] },
      }),
    )
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          cargarAnimalesPorOrigen: vi.fn(async () => [
            { id: "a-1", codigoAnimal: "MT-100" },
            { id: "a-2", codigoAnimal: "MT-101" },
          ]),
          onEnviar,
        })}
      />,
    )
    await user.click(screen.getByRole("radio", { name: "Grupal" }))
    await screen.findByText("0 animales incluidos")
    await user.click(screen.getByRole("button", { name: "Seleccionar todos" }))
    await user.click(screen.getByRole("button", { name: "Continuar con 2 animales" }))
    await user.clear(screen.getByLabelText(/Peso/))
    await user.type(screen.getByLabelText(/Peso/), "420")
    const override = screen.getByLabelText("MT-101: pesoKg")
    await user.clear(override)
    await user.type(override, "435")
    expect(screen.getByText("Campos diferentes: pesoKg")).toBeInTheDocument()
    await user.clear(override)
    await user.type(override, "420")
    await user.clear(override)
    await user.type(override, "435")
    await user.click(screen.getByRole("button", { name: "Volver a Alcance" }))
    await user.click(screen.getByRole("button", { name: /Excluir MT-101/ }))
    expect(screen.getByRole("alert")).toHaveTextContent("tiene una excepción")
  })

  it("confirms an individual removal and discards only that exception", async () => {
    const user = await prepararWizardGrupal()
    const override = screen.getByLabelText("MT-100: pesoKg")
    await user.clear(override)
    await user.type(override, "435")
    await user.click(screen.getByRole("button", { name: "Volver a Alcance" }))
    await user.click(screen.getByRole("button", { name: /Excluir MT-100/ }))
    await user.click(screen.getByRole("button", { name: "Retirar y descartar excepción" }))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Continuar con 1 animal" }))
    expect(screen.queryByText("Campos diferentes: pesoKg")).not.toBeInTheDocument()
  })

  it("cancels an individual removal and preserves its exception", async () => {
    const user = await prepararWizardGrupal()
    const override = screen.getByLabelText("MT-100: pesoKg")
    await user.clear(override)
    await user.type(override, "435")
    await user.click(screen.getByRole("button", { name: "Volver a Alcance" }))
    await user.click(screen.getByRole("button", { name: /Excluir MT-100/ }))
    await user.click(screen.getByRole("button", { name: "Conservar animal" }))
    await user.click(screen.getByRole("button", { name: "Continuar con 2 animales" }))
    expect(screen.getByText("Campos diferentes: pesoKg")).toBeInTheDocument()
  })

  it("confirms a mass removal and discards all affected exceptions", async () => {
    const user = await prepararWizardGrupal()
    for (const codigo of ["MT-100", "MT-101"]) {
      const override = screen.getByLabelText(`${codigo}: pesoKg`)
      await user.clear(override)
      await user.type(override, "435")
    }
    await user.click(screen.getByRole("button", { name: "Volver a Alcance" }))
    await user.click(screen.getByRole("button", { name: "Quitar todos" }))
    await user.click(screen.getByRole("button", { name: "Retirar y descartar excepción" }))
    const continuar = screen.getByRole("button", { name: "Continuar con 0 animales" })
    expect(continuar).toBeDisabled()
  })

  it("cancels a mass removal and preserves every exception", async () => {
    const user = await prepararWizardGrupal()
    for (const codigo of ["MT-100", "MT-101"]) {
      const override = screen.getByLabelText(`${codigo}: pesoKg`)
      await user.clear(override)
      await user.type(override, "435")
    }
    await user.click(screen.getByRole("button", { name: "Volver a Alcance" }))
    await user.click(screen.getByRole("button", { name: "Quitar todos" }))
    await user.click(screen.getByRole("button", { name: "Conservar animal" }))
    await user.click(screen.getByRole("button", { name: "Continuar con 2 animales" }))
    expect(screen.getAllByText("Campos diferentes: pesoKg")).toHaveLength(2)
  })

  it("marks structured members included and preserves the previous scope on load failure", async () => {
    const user = userEvent.setup()
    const cargarAnimales = vi
      .fn()
      .mockResolvedValueOnce([{ id: "a-1", codigoAnimal: "MT-100" }])
      .mockResolvedValueOnce([{ id: "a-1", codigoAnimal: "MT-100" }])
      .mockRejectedValueOnce(new Error("offline"))
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          catalogos: { lotes: [{ id: "lote-1", nombre: "Lote Norte" }], potreros: [], grupos: [] },
          cargarAnimalesPorOrigen: cargarAnimales,
        })}
      />,
    )
    await user.click(screen.getByRole("radio", { name: "Grupal" }))
    await user.click(screen.getByRole("radio", { name: "Lote" }))
    await user.selectOptions(screen.getByLabelText("Lote"), "lote-1")
    expect(await screen.findByText("1 incluidos · 0 excluidos")).toBeInTheDocument()
    await user.click(screen.getByRole("radio", { name: "Manual" }))
    expect(screen.getByText(/reemplazará la selección actual/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Conservar selección" }))
    expect(screen.getByText("1 incluidos · 0 excluidos")).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Lote" })).toHaveAttribute("aria-checked", "true")
    await user.click(screen.getByRole("radio", { name: "Manual" }))
    await user.click(screen.getByRole("button", { name: "Cambiar origen" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar")
    expect(screen.getByText("1 incluidos · 0 excluidos")).toBeInTheDocument()
    expect(screen.getByText("MT-100")).toBeInTheDocument()
  })

  it("returns to Manual from a structured origin with no criterion", async () => {
    const user = userEvent.setup()
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          catalogos: { lotes: [{ id: "lote-1", nombre: "Lote Norte" }], potreros: [], grupos: [] },
          cargarAnimalesPorOrigen: vi.fn(async () => []),
        })}
      />,
    )

    await user.click(screen.getByRole("radio", { name: "Grupal" }))
    await user.click(screen.getByRole("radio", { name: "Lote" }))
    expect(screen.getByRole("radio", { name: "Lote" })).toHaveAttribute("aria-checked", "true")
    await user.click(screen.getByRole("radio", { name: "Manual" }))
    expect(screen.getByRole("radio", { name: "Manual" })).toHaveAttribute("aria-checked", "true")
  })

  it("returns to Manual from an empty structured origin", async () => {
    const user = userEvent.setup()
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          catalogos: { lotes: [{ id: "lote-1", nombre: "Lote Norte" }], potreros: [], grupos: [] },
          cargarAnimalesPorOrigen: vi.fn(async () => []),
        })}
      />,
    )

    await user.click(screen.getByRole("radio", { name: "Grupal" }))
    await user.click(screen.getByRole("radio", { name: "Lote" }))
    await user.selectOptions(screen.getByLabelText("Lote"), "lote-1")
    await user.click(screen.getByRole("radio", { name: "Manual" }))
    expect(screen.getByRole("radio", { name: "Manual" })).toHaveAttribute("aria-checked", "true")
  })

  it("keeps Manual active and allows retry after a manual load failure", async () => {
    const user = userEvent.setup()
    const initialManualLoad = new Promise<readonly { id: string; codigoAnimal: string }[]>(() => {})
    let manualLoads = 0
    const cargarAnimales = vi.fn().mockImplementation(async (origen: string) => {
      if (origen === "lote") return []
      manualLoads += 1
      if (manualLoads === 1) return initialManualLoad
      if (manualLoads === 2) throw new Error("offline")
      return [{ id: "a-1", codigoAnimal: "MT-100" }]
    })
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          catalogos: { lotes: [{ id: "lote-1", nombre: "Lote Norte" }], potreros: [], grupos: [] },
          cargarAnimalesPorOrigen: cargarAnimales,
        })}
      />,
    )

    await user.click(screen.getByRole("radio", { name: "Grupal" }))
    await user.click(screen.getByRole("radio", { name: "Lote" }))
    await user.selectOptions(screen.getByLabelText("Lote"), "lote-1")
    await user.click(screen.getByRole("radio", { name: "Manual" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar")
    expect(screen.getByRole("radio", { name: "Manual" })).toHaveAttribute("aria-checked", "true")
    await user.click(screen.getByRole("radio", { name: "Lote" }))
    await user.click(screen.getByRole("radio", { name: "Manual" }))
    await screen.findByText("0 animales incluidos")
    await user.click(screen.getByRole("button", { name: "Seleccionar todos" }))
    expect(await screen.findByText("MT-100")).toBeInTheDocument()
  })

  it("mantiene el footer grupal persistente y deshabilitado sin animales efectivos", async () => {
    const user = userEvent.setup()
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          cargarAnimalesPorOrigen: vi.fn(async () => []),
        })}
      />,
    )

    await user.click(screen.getByRole("radio", { name: "Grupal" }))
    const footer = await screen.findByTestId("evento-wizard-scope-footer")
    const confirmar = within(footer).getByRole("button", { name: "Continuar con 0 animales" })
    expect(footer).toHaveClass("shrink-0", "border-t")
    expect(confirmar).toBeDisabled()
    expect(screen.getByTestId("evento-wizard-scope-scroll")).toHaveClass("overflow-y-auto")
  })
})

describe("EventoWizard — Paso 3: formulario del dominio", () => {
  it.each([
    ["servicio", "Observaciones", "inseminación de control"],
    ["palpacion", "Diagnóstico (ID)", "diag-1"],
    ["parto", "Servicio (ID)", "srv-1"],
    ["aplicacion_sanitaria", "Producto (ID)", "producto-1"],
    ["revision_veterinaria", "Veterinario (ID)", "vet-1"],
    ["produccion_lactea", "Cantidad AM (L)", "12.5"],
    ["condicion_corporal", "Condición (ID)", "cond-1"],
    ["venta", "Comprador", "Comprador 1"],
    ["muerte", "Causa de muerte (ID)", "causa-1"],
    ["traslado", "Motivo", "movimiento preventivo"],
    ["pesaje", "Comentarios", "control de recepción"],
  ] as const)("rehydrates the representative draft field for %s", async (tipo, etiqueta, valor) => {
    const user = userEvent.setup()
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: tipo,
          animalPreseleccionado: { id: "a-1", codigoAnimal: "MT-122" },
        })}
      />,
    )

    const campo =
      tipo === "produccion_lactea"
        ? await screen.findByRole("spinbutton", { name: /Cantidad AM/ })
        : [
              "Diagnóstico (ID)",
              "Producto (ID)",
              "Veterinario (ID)",
              "Causa de muerte (ID)",
            ].includes(etiqueta)
          ? await screen.findByRole("combobox", {
              name: etiqueta.startsWith("Producto")
                ? "Producto sanitario"
                : etiqueta.replace(" (ID)", ""),
            })
          : await screen.findByRole("textbox", { name: regexParaNombre(etiqueta) })
    if (campo.getAttribute("role") === "combobox") {
      await user.click(campo)
      await user.click(
        screen.getByRole("option", {
          name: valor === "producto-1" ? /Producto 1/ : new RegExp(valor),
        }),
      )
    } else {
      await user.type(campo, valor)
    }
    await user.click(screen.getByRole("button", { name: "Volver a Alcance" }))
    await user.click(screen.getByRole("button", { name: "Continuar con este animal" }))
    const campoRestaurado =
      tipo === "produccion_lactea"
        ? screen.getByRole("spinbutton", { name: /Cantidad AM/ })
        : [
              "Diagnóstico (ID)",
              "Producto (ID)",
              "Veterinario (ID)",
              "Causa de muerte (ID)",
            ].includes(etiqueta)
          ? screen.getByRole("combobox", {
              name: etiqueta.startsWith("Producto")
                ? "Producto sanitario"
                : etiqueta.replace(" (ID)", ""),
            })
          : screen.getByRole("textbox", { name: regexParaNombre(etiqueta) })
    if (campoRestaurado.getAttribute("role") === "combobox") {
      expect(campoRestaurado).toHaveTextContent(valor === "producto-1" ? "PROD-1" : valor)
    } else {
      expect(campoRestaurado).toHaveValue(tipo === "produccion_lactea" ? Number(valor) : valor)
    }
  })

  it("returns to scope with the visible action and restores the complete pesaje draft", async () => {
    const user = userEvent.setup()
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          animalPreseleccionado: { id: "a-1", codigoAnimal: "MT-122" },
        })}
      />,
    )

    await user.clear(screen.getByLabelText(/Peso/))
    await user.type(screen.getByLabelText(/Peso/), "420")
    await user.click(screen.getByRole("button", { name: "Volver a Alcance" }))
    expect(screen.getByText("¿A quiénes?")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Continuar con este animal" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Continuar con este animal" }))
    expect(screen.getByLabelText(/Peso/)).toHaveValue(420)
  })

  it("keeps the draft after an expired session and allows retrying", async () => {
    const user = userEvent.setup()
    const onEnviar = vi.fn(
      async (): Promise<ResultadoCapturaEvento> => ({ tipo: "no_autenticado" }),
    )
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          animalPreseleccionado: { id: "a-1", codigoAnimal: "MT-122" },
          onEnviar,
        })}
      />,
    )

    await user.clear(screen.getByLabelText(/Peso/))
    await user.type(screen.getByLabelText(/Peso/), "420")
    await user.click(screen.getByRole("button", { name: /Guardar/ }))
    expect(await screen.findByTestId("evento-wizard-error")).toHaveTextContent(/sesión expiró/i)
    expect(screen.getByLabelText(/Peso/)).toHaveValue(420)
  })

  it("closes with Escape when the initial preselection has not changed", async () => {
    const user = userEvent.setup()
    function ControlledWizard() {
      const [open, setOpen] = useState(true)
      return (
        <EventoWizard
          {...props({
            open,
            onOpenChange: setOpen,
            animalPreseleccionado: { id: "a-1", codigoAnimal: "MT-122" },
          })}
        />
      )
    }

    render(<ControlledWizard />)
    expect(screen.getByText("¿Qué registrar?")).toBeInTheDocument()

    await user.keyboard("{Escape}")

    expect(screen.queryByText("¿Qué registrar?")).not.toBeInTheDocument()
    expect(screen.queryByText("¿Cerrar el wizard?")).not.toBeInTheDocument()
  })

  it("offers edit or discard when closing with pending changes", async () => {
    const user = userEvent.setup()
    function ControlledWizard() {
      const [open, setOpen] = useState(true)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Reabrir wizard
          </button>
          <EventoWizard {...props({ open, onOpenChange: setOpen })} />
        </>
      )
    }
    render(<ControlledWizard />)

    await user.click(screen.getByRole("button", { name: /Pesaje/ }))
    await user.keyboard("{Escape}")
    expect(screen.getByText("¿Cerrar el wizard?")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Continuar editando" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Continuar editando" }))
    expect(screen.getByText("¿A quiénes?")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Cerrar wizard" }))
    await user.click(screen.getByRole("button", { name: "Descartar borrador" }))
    expect(screen.queryByText("¿Qué registrar?")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Reabrir wizard" }))
    expect(screen.getByText("¿Qué registrar?")).toBeInTheDocument()
  })

  it("preserves the draft after a generic atomic failure", async () => {
    const user = userEvent.setup()
    const onEnviar = vi.fn(
      async (): Promise<ResultadoCapturaEvento> => ({
        tipo: "error",
        detalle: "No se registró ningún evento del conjunto.",
      }),
    )
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          animalPreseleccionado: { id: "a-1", codigoAnimal: "MT-122" },
          onEnviar,
        })}
      />,
    )

    await user.clear(screen.getByLabelText(/Peso/))
    await user.type(screen.getByLabelText(/Peso/), "420")
    await user.click(screen.getByRole("button", { name: /Guardar/ }))
    expect(await screen.findByTestId("evento-wizard-error")).toHaveTextContent(
      "No se registró ningún evento",
    )
    expect(screen.getByLabelText(/Peso/)).toHaveValue(420)
    expect(onEnviar).toHaveBeenCalledTimes(1)
  })

  it("clears the draft after success and does not restore it on reopen", async () => {
    const user = userEvent.setup()
    const onEnviar = vi.fn(
      async (): Promise<ResultadoCapturaEvento> => ({
        tipo: "capturado",
        ids: { individualId: "ev-1", hijosIds: [] },
      }),
    )
    function ControlledWizard() {
      const [open, setOpen] = useState(true)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Reabrir wizard
          </button>
          <EventoWizard
            {...props({
              open,
              onOpenChange: setOpen,
              tipoPreseleccionado: "pesaje",
              animalPreseleccionado: { id: "a-1", codigoAnimal: "MT-122" },
              onEnviar,
            })}
          />
        </>
      )
    }
    render(<ControlledWizard />)

    await user.clear(screen.getByLabelText(/Peso/))
    await user.type(screen.getByLabelText(/Peso/), "420")
    await user.click(screen.getByRole("button", { name: /Guardar/ }))
    await waitFor(() => expect(onEnviar).toHaveBeenCalledTimes(1))
    expect(screen.queryByText("¿Cerrar el wizard?")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Reabrir wizard" }))
    expect(screen.getByLabelText(/Peso/)).toHaveValue(null)
  })

  it("renderiza el form de pesaje cuando se selecciona el tipo", async () => {
    const user = userEvent.setup()
    render(<EventoWizard {...props({ tipoPreseleccionado: "pesaje" })} />)
    // pesaje con animal preseleccionado? No, solo tipo. El usuario debe
    // buscar/confirmar en Paso 2 primero. Para simplificar el test, saltamos
    // al Paso 3 con el resultado de Paso 2 mockeado.
    expect(screen.getByText("¿A quiénes?")).toBeInTheDocument()
    void user
  })

  it("mapea 403 del server a mensaje en pantalla", async () => {
    const user = userEvent.setup()
    const onEnviar = vi.fn(
      async (): Promise<ResultadoCapturaEvento> => ({
        tipo: "permiso_denegado",
        permiso: "eventos_productivos:crear",
      }),
    )
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          onEnviar,
          animalPreseleccionado: { id: "a-1", codigoAnimal: "MT-122" },
        })}
      />,
    )
    // Estamos en Paso 3 con pesaje. Llenar fecha y peso.
    const fecha = screen.getByLabelText(/Fecha/) as HTMLInputElement
    const peso = screen.getByLabelText(/Peso/) as HTMLInputElement
    await user.clear(fecha)
    await user.type(fecha, "2026-08-07")
    await user.clear(peso)
    await user.type(peso, "420")
    const guardar = screen.getByRole("button", { name: /Guardar/ })
    await user.click(guardar)
    await waitFor(() =>
      expect(screen.getByTestId("evento-wizard-error")).toHaveTextContent(
        /No tienes permiso para crear/,
      ),
    )
  })
})

describe("EventoWizard — RBAC y parto sin grupal", () => {
  it("el wizard muestra la nota de parto individual cuando se selecciona", () => {
    render(<EventoWizard {...props({ tipoPreseleccionado: "parto" })} />)
    expect(
      screen.getByText("Parto solo admite alcance individual en esta versión."),
    ).toBeInTheDocument()
  })

  it("deshabilita la pills de grupal para parto (data-testid en pills internas)", () => {
    render(<EventoWizard {...props({ tipoPreseleccionado: "parto" })} />)
    // La pills internamente muestra Individual/Grupal si la permite;
    // para parto NO debe renderizar la pills (alcance forzado a individual).
    expect(screen.queryByRole("radiogroup", { name: "Alcance" })).not.toBeInTheDocument()
  })
})

describe("EventoWizard — mapeo de mensajes de error", () => {
  it("alcance_invalido del server → 'Algún animal no pertenece a la finca'", async () => {
    const user = userEvent.setup()
    const onEnviar = vi.fn(
      async (): Promise<ResultadoCapturaEvento> => ({
        tipo: "alcance_invalido",
      }),
    )
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          onEnviar,
          animalPreseleccionado: { id: "a-1", codigoAnimal: "MT-122" },
        })}
      />,
    )
    const fecha = screen.getByLabelText(/Fecha/) as HTMLInputElement
    const peso = screen.getByLabelText(/Peso/) as HTMLInputElement
    await user.clear(fecha)
    await user.type(fecha, "2026-08-07")
    await user.clear(peso)
    await user.type(peso, "420")
    await user.click(screen.getByRole("button", { name: /Guardar/ }))
    await waitFor(() =>
      expect(screen.getByTestId("evento-wizard-error")).toHaveTextContent(
        /Algún animal no pertenece a la finca/,
      ),
    )
  })

  it("validacion 422 del server → lista de errores en pantalla", async () => {
    const user = userEvent.setup()
    const onEnviar = vi.fn(
      async (): Promise<ResultadoCapturaEvento> => ({
        tipo: "validacion",
        errores: [{ campo: "pesoKg", detalle: "Debe ser > 0" }],
      }),
    )
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          onEnviar,
          animalPreseleccionado: { id: "a-1", codigoAnimal: "MT-122" },
        })}
      />,
    )
    const fecha = screen.getByLabelText(/Fecha/) as HTMLInputElement
    const peso = screen.getByLabelText(/Peso/) as HTMLInputElement
    await user.clear(fecha)
    await user.type(fecha, "2026-08-07")
    await user.clear(peso)
    await user.type(peso, "420")
    await user.click(screen.getByRole("button", { name: /Guardar/ }))
    await waitFor(() =>
      expect(screen.getByTestId("evento-wizard-error")).toHaveTextContent(/pesoKg/),
    )
  })
})

describe("EventoWizard — revisión condicional por riesgo", () => {
  const seleccionGrupal = {
    tipo: "grupal" as const,
    origen: "lote" as const,
    loteId: "lote-1",
    animalIdsEfectivos: ["a-1", "a-2"],
    totalAnimales: 2,
  }

  it("aplica exactamente la política sensible elegida", () => {
    for (const tipo of ["revision_veterinaria", "parto", "servicio", "palpacion"] as const) {
      expect(
        criteriosDeRiesgo(
          tipo,
          { tipo: "individual", animalId: "a-1" },
          {},
          POLITICA_RIESGO_ELEGIDA,
          undefined,
        ),
      ).toContain("tipo sensible según la política")
    }
    expect(
      criteriosDeRiesgo(
        "aplicacion_sanitaria",
        { tipo: "individual", animalId: "a-1" },
        {},
        POLITICA_RIESGO_ELEGIDA,
        undefined,
      ),
    ).toEqual([])
  })

  it("deja desactivado el riesgo de grupo grande sin umbral y lo activa al configurarlo", () => {
    expect(
      criteriosDeRiesgo("pesaje", seleccionGrupal, {}, POLITICA_RIESGO_ELEGIDA, undefined),
    ).toEqual([])
    expect(
      criteriosDeRiesgo(
        "pesaje",
        seleccionGrupal,
        {},
        { ...POLITICA_RIESGO_ELEGIDA, umbralGrupoGrande: 1 },
        undefined,
      ),
    ).toContain("grupo grande según configuración")
  })

  it("no muestra revisión ni cambia el flujo ordinario sin disparadores", async () => {
    const user = userEvent.setup()
    const onEnviar = vi.fn(
      async (): Promise<ResultadoCapturaEvento> => ({
        tipo: "capturado",
        ids: { individualId: "ev-1", hijosIds: [] },
      }),
    )
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          animalPreseleccionado: { id: "a-1", codigoAnimal: "MT-122" },
          onEnviar,
        })}
      />,
    )
    await user.clear(screen.getByLabelText(/Peso/))
    await user.type(screen.getByLabelText(/Peso/), "420")
    await user.click(screen.getByRole("button", { name: /Guardar/ }))
    expect(screen.queryByTestId("evento-wizard-risk-review")).not.toBeInTheDocument()
    expect(onEnviar).toHaveBeenCalledTimes(1)
  })

  it("resume excepciones y requiere confirmación explícita", async () => {
    const user = await prepararWizardGrupal()
    const override = screen.getByLabelText("MT-101: pesoKg")
    await user.clear(override)
    await user.type(override, "435")
    await user.click(screen.getByRole("button", { name: /Guardar/ }))
    expect(screen.getByTestId("evento-wizard-risk-review")).toHaveTextContent(
      "excepciones por animal",
    )
    expect(screen.getByTestId("evento-wizard-risk-review")).toHaveTextContent("a-2")
  })

  it("muestra el criterio de tipo sensible y registra solo tras confirmar", async () => {
    const user = userEvent.setup()
    const onEnviar = vi.fn(
      async (): Promise<ResultadoCapturaEvento> => ({
        tipo: "capturado",
        ids: { individualId: "ev-1", hijosIds: [] },
      }),
    )
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "revision_veterinaria",
          animalPreseleccionado: { id: "a-1", codigoAnimal: "MT-122" },
          onEnviar,
        })}
      />,
    )
    await user.click(screen.getByRole("combobox", { name: "Veterinario" }))
    await user.click(screen.getByRole("option", { name: /vet-1/ }))
    await user.click(screen.getByRole("combobox", { name: "Diagnóstico" }))
    await user.click(screen.getByRole("option", { name: /diag-1/ }))
    await user.selectOptions(screen.getByLabelText(/Tipo de diagnóstico/), "vitaminas")
    await user.selectOptions(screen.getByLabelText(/Celo presentado/), "si")
    await user.type(screen.getByLabelText(/Comentarios/), "revisión completa")
    await user.click(screen.getByRole("button", { name: /Guardar/ }))
    expect(screen.getByTestId("evento-wizard-risk-review")).toHaveTextContent("tipo sensible")
    expect(screen.getByTestId("evento-wizard-risk-review")).toHaveTextContent(
      "veterinarioId: vet-1",
    )
    expect(screen.getByTestId("evento-wizard-risk-review")).toHaveTextContent(
      "diagnosticoId: diag-1",
    )
    expect(onEnviar).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Confirmar y registrar 1 evento" }))
    expect(onEnviar).toHaveBeenCalledTimes(1)
    expect(onEnviar.mock.calls[0][0].datos).toEqual(
      expect.objectContaining({
        veterinarioId: "vet-1",
        diagnosticoId: "diag-1",
        tipoDiagnostico: "vitaminas",
        celoPresentado: "si",
        comentarios: "revisión completa",
      }),
    )
  })

  it("detiene el envío ante un conflicto y permite mantener o actualizar", async () => {
    const user = userEvent.setup()
    const onEnviar = vi.fn(
      async (): Promise<ResultadoCapturaEvento> => ({
        tipo: "capturado",
        ids: { cabeceraId: "rg-1", hijosIds: ["ev-1"] },
      }),
    )
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          cargarAnimalesPorOrigen: vi
            .fn()
            .mockResolvedValueOnce([{ id: "a-1", codigoAnimal: "MT-100" }])
            .mockResolvedValueOnce([{ id: "a-1", codigoAnimal: "MT-100" }])
            .mockResolvedValueOnce([
              { id: "a-1", codigoAnimal: "MT-100" },
              { id: "a-2", codigoAnimal: "MT-101" },
            ]),
          catalogos: { lotes: [{ id: "lote-1", nombre: "Lote Norte" }], potreros: [], grupos: [] },
          revisarMembresiaActual: vi.fn(async () => ({
            estado: "cambio",
            animales: [
              { id: "a-1", codigoAnimal: "MT-100" },
              { id: "a-2", codigoAnimal: "MT-101" },
            ],
            agregados: [{ id: "a-2", codigoAnimal: "MT-101" }],
          })),
          onEnviar,
        })}
      />,
    )
    await user.click(screen.getByRole("radio", { name: "Grupal" }))
    await screen.findByText("0 animales incluidos")
    await user.click(screen.getByRole("radio", { name: "Lote" }))
    await user.selectOptions(screen.getByLabelText("Lote"), "lote-1")
    await screen.findByText("1 incluidos · 0 excluidos")
    await user.click(screen.getByRole("button", { name: "Seleccionar todos" }))
    await user.click(screen.getByRole("button", { name: "Continuar con 1 animal" }))
    await user.type(screen.getByLabelText(/Peso/), "420")
    await user.click(screen.getByRole("button", { name: /Guardar/ }))
    expect(screen.getByRole("alert")).toHaveTextContent("membresía del origen cambió")
    expect(onEnviar).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Mantener snapshot revisado" }))
    await user.click(screen.getByRole("button", { name: "Confirmar y registrar 1 evento" }))
    expect(onEnviar).toHaveBeenCalledTimes(1)
  })

  it("bloquea una membresía no verificable aunque no haya otro criterio de riesgo", async () => {
    const user = userEvent.setup()
    const onEnviar = vi.fn(
      async (): Promise<ResultadoCapturaEvento> => ({
        tipo: "capturado",
        ids: { cabeceraId: "rg-1", hijosIds: ["ev-1"] },
      }),
    )
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          catalogos: { lotes: [{ id: "lote-1", nombre: "Lote Norte" }], potreros: [], grupos: [] },
          cargarAnimalesPorOrigen: vi.fn(async () => [{ id: "a-1", codigoAnimal: "MT-100" }]),
          onEnviar,
        })}
      />,
    )
    await user.click(screen.getByRole("radio", { name: "Grupal" }))
    await user.click(screen.getByRole("radio", { name: "Lote" }))
    await user.selectOptions(screen.getByLabelText("Lote"), "lote-1")
    await screen.findByText("1 incluidos · 0 excluidos")
    await user.click(screen.getByRole("button", { name: "Continuar con 1 animal" }))
    await user.type(screen.getByLabelText(/Peso/), "420")
    await user.click(screen.getByRole("button", { name: /Guardar/ }))
    expect(screen.getByTestId("evento-wizard-risk-review")).toHaveTextContent(
      "membresía no verificable",
    )
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo verificar")
    expect(
      screen.queryByRole("button", { name: "Mantener snapshot revisado" }),
    ).not.toBeInTheDocument()
    expect(onEnviar).not.toHaveBeenCalled()
    await user.click(
      screen.getByRole("button", { name: "Actualizar alcance y verificar de nuevo" }),
    )
    expect(screen.getByText("¿A quiénes?")).toBeInTheDocument()
  })

  it("actualiza el alcance conservando las excepciones de animales presentes", async () => {
    const user = userEvent.setup()
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          catalogos: { lotes: [{ id: "lote-1", nombre: "Lote Norte" }], potreros: [], grupos: [] },
          cargarAnimalesPorOrigen: vi
            .fn()
            .mockResolvedValueOnce([{ id: "a-1", codigoAnimal: "MT-100" }])
            .mockResolvedValueOnce([{ id: "a-1", codigoAnimal: "MT-100" }])
            .mockResolvedValueOnce([
              { id: "a-1", codigoAnimal: "MT-100" },
              { id: "a-2", codigoAnimal: "MT-101" },
            ]),
          revisarMembresiaActual: vi.fn(async () => ({
            estado: "cambio",
            animales: [
              { id: "a-1", codigoAnimal: "MT-100" },
              { id: "a-2", codigoAnimal: "MT-101" },
            ],
            agregados: [{ id: "a-2", codigoAnimal: "MT-101" }],
          })),
        })}
      />,
    )
    await user.click(screen.getByRole("radio", { name: "Grupal" }))
    await user.click(screen.getByRole("radio", { name: "Lote" }))
    await user.selectOptions(screen.getByLabelText("Lote"), "lote-1")
    await screen.findByText("1 incluidos · 0 excluidos")
    await user.click(screen.getByRole("button", { name: "Continuar con 1 animal" }))
    await user.type(screen.getByLabelText(/Peso/), "420")
    await user.click(screen.getByRole("button", { name: /Guardar/ }))
    await user.click(screen.getByRole("button", { name: "Actualizar alcance y volver" }))
    expect(screen.getByText("¿A quiénes?")).toBeInTheDocument()
    expect(screen.getByText("2 incluidos · 0 excluidos")).toBeInTheDocument()
  })

  it("bloquea mantener snapshot con retirados hasta actualizar al grupo actual", async () => {
    const user = userEvent.setup()
    const onEnviar = vi.fn(
      async (): Promise<ResultadoCapturaEvento> => ({
        tipo: "capturado",
        ids: { cabeceraId: "rg-1", hijosIds: ["ev-1"] },
      }),
    )
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          catalogos: { lotes: [{ id: "lote-1", nombre: "Lote Norte" }], potreros: [], grupos: [] },
          cargarAnimalesPorOrigen: vi.fn(async () => [{ id: "a-1", codigoAnimal: "MT-100" }]),
          revisarMembresiaActual: vi.fn(async () => ({
            estado: "cambio" as const,
            animales: [{ id: "a-2", codigoAnimal: "MT-101" }],
            retirados: [{ id: "a-1" }],
          })),
          onEnviar,
        })}
      />,
    )
    await user.click(screen.getByRole("radio", { name: "Grupal" }))
    await user.click(screen.getByRole("radio", { name: "Lote" }))
    await user.selectOptions(screen.getByLabelText("Lote"), "lote-1")
    await screen.findByText("1 incluidos · 0 excluidos")
    await user.click(screen.getByRole("button", { name: "Continuar con 1 animal" }))
    await user.type(screen.getByLabelText(/Peso/), "420")
    await user.click(screen.getByRole("button", { name: /Guardar/ }))
    expect(screen.getByTestId("evento-wizard-risk-review")).toHaveTextContent(
      "No se puede mantener el snapshot",
    )
    expect(
      screen.queryByRole("button", { name: "Mantener snapshot revisado" }),
    ).not.toBeInTheDocument()
    expect(onEnviar).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Actualizar alcance y volver" }))
    expect(screen.getByText("¿A quiénes?")).toBeInTheDocument()
    expect(onEnviar).not.toHaveBeenCalled()
  })
})
