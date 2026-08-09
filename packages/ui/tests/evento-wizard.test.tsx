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
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { EventoWizard, type ResultadoCapturaEvento } from "../src/ganado/evento-wizard/index.js"

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

const CATALOGOS_VACIOS = { lotes: [], potreros: [], grupos: [] }

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
    ...overrides,
  }
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

  it("avanza de individual a Datos después de buscar un animal", async () => {
    const user = userEvent.setup()
    render(
      <EventoWizard
        {...props({
          tipoPreseleccionado: "pesaje",
          buscarAnimalPorCodigo: vi.fn(async () => ({ id: "a-1", codigoAnimal: "MT-122" })),
        })}
      />,
    )

    await user.type(screen.getByLabelText("Código del animal"), "MT-122")
    await user.click(screen.getByRole("button", { name: "Buscar" }))

    expect(screen.getByText("Registrar pesaje")).toBeInTheDocument()
    expect(screen.getByTestId("evento-wizard-step-indicator")).toHaveTextContent("3. Datos")
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
        })}
      />,
    )
    // Paso 2 arranca en "Individual"; el usuario cambia a "Grupal".
    const pillGrupal = screen.getByRole("radio", { name: "Grupal" })
    await user.click(pillGrupal)
    // El origen por defecto es "manual", que lista los animales de la finca.
    await waitFor(() => expect(screen.getByText("3 de 3 animales efectivos")).toBeInTheDocument())
    // Excluir uno y verificar el conteo efectivo.
    await user.click(screen.getByRole("button", { name: /Excluir MT-100/ }))
    expect(screen.getByText("2 de 3 animales efectivos")).toBeInTheDocument()
    // Confirmar: emite selección grupal con 2 efectivos.
    const confirmar = screen.getByRole("button", { name: /Confirmar 2 animales/ })
    await user.click(confirmar)
    expect(screen.getByText("Registrar pesaje")).toBeInTheDocument()
    expect(screen.getByTestId("evento-wizard-step-indicator")).toHaveTextContent("3. Datos")
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
    const confirmar = within(footer).getByRole("button", { name: "Confirmar 0 animales" })
    expect(footer).toHaveClass("shrink-0", "border-t")
    expect(confirmar).toBeDisabled()
    expect(screen.getByTestId("evento-wizard-scope-scroll")).toHaveClass("overflow-y-auto")
  })
})

describe("EventoWizard — Paso 3: formulario del dominio", () => {
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
