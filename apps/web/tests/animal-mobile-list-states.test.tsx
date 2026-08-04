// @vitest-environment jsdom

/**
 * Issue #158 (RF-ANIM-LIST-M v1.1 §6 LM-030, §7 LM-009, §5.3 LM-023) —
 * mobile list state machine: infinite-scroll accumulation, distinguishable
 * interface states, and HTTP error semantics. The route is exercised through
 * the exported `AnimalsListRouteView` (same pattern as
 * animal-listado-route-integration.test.tsx): the #107/#155 transports are
 * stubbed at the `fetch` seam and jsdom's missing IntersectionObserver is
 * simulated globally so the sentinel can be driven deterministically.
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import type { AnimalListadoVisualPermissions } from "../src/features/animal-listado/animal-listado-route-adapter.js"
import { AnimalsListRouteView } from "../src/routes/_app/fincas/$fincaId/animales.js"
import type { AnimalsListRouteViewProps } from "../src/routes/_app/fincas/$fincaId/animales.js"
import type { AnimalCatalogs } from "../src/server/animal-actions.js"
import type {
  AnimalListadoResponseDto,
  AnimalListadoRowDto,
} from "../src/server/animal-list-contract.js"

// The route module imports the server-function facade; stub it so no TanStack
// Start runtime is required (the view consumes loader data through props).
vi.mock("../src/server/animal-actions.js", () => ({
  getAnimalMobileListAction: vi.fn(),
  getAnimalCatalogsAction: vi.fn(),
  getAnimalListadoPreferenciasAction: vi.fn(),
  getAnimalListadoVisualPermissionsAction: vi.fn(),
}))

// ---------------------------------------------------------------------------
// IntersectionObserver simulation (jsdom lacks it) — the sentinel callback is
// registered on observe and fired explicitly by the tests.
// ---------------------------------------------------------------------------
type EntradaInterseccionSimulada = { readonly isIntersecting: boolean }
type CallbackInterseccionSimulada = (entradas: readonly EntradaInterseccionSimulada[]) => void
const callbacksObservadorSimulados = new Set<CallbackInterseccionSimulada>()

class IntersectionObserverSimulado {
  private readonly callback: CallbackInterseccionSimulada

  constructor(callback: CallbackInterseccionSimulada) {
    this.callback = callback
  }

  observe() {
    callbacksObservadorSimulados.add(this.callback)
  }

  unobserve() {
    callbacksObservadorSimulados.delete(this.callback)
  }

  disconnect() {
    callbacksObservadorSimulados.delete(this.callback)
  }

  takeRecords() {
    return []
  }
}

function simularInterseccionCentinela() {
  for (const callback of [...callbacksObservadorSimulados]) {
    callback([{ isIntersecting: true }])
  }
}

const fetchMock = vi.fn()

beforeAll(() => {
  // Radix primitives used by the view call pointer-capture APIs jsdom lacks.
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
  vi.stubGlobal("IntersectionObserver", IntersectionObserverSimulado)
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  cleanup()
  fetchMock.mockReset()
  callbacksObservadorSimulados.clear()
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const permisosCompletos: AnimalListadoVisualPermissions = {
  canCreate: true,
  canExport: true,
}

const catalogoVacio = { tipo: "disponible", options: [] } as const
const catalogos: AnimalCatalogs = {
  sexo: catalogoVacio,
  raza: catalogoVacio,
  color: catalogoVacio,
  calidad: catalogoVacio,
  tipoExplotacion: catalogoVacio,
  potrero: catalogoVacio,
  sector: catalogoVacio,
  lote: catalogoVacio,
  grupo: catalogoVacio,
  lugarCompra: catalogoVacio,
  hierro: catalogoVacio,
  propietario: catalogoVacio,
  madre: catalogoVacio,
  padre: catalogoVacio,
}

function filaMobileDto(codigo: string, id = `animal-${codigo}`) {
  return {
    id,
    codigo,
    nombre: `Animal ${codigo}`,
    sexo: { key: "1", label: "Hembra" },
    raza: { id: "raza-1", label: "Holstein" },
    categoriaReproductiva: { key: "prenada", label: "Preñada" },
    salud: { key: "0", label: "Sano" },
    esDeMonta: false,
    propietario: { id: "prop-1", label: "Don Juan" },
    madre: null,
  }
}

function paginaMobileDto(
  overrides: Partial<{
    data: readonly unknown[]
    page: number
    total: number
    totalSinFiltro: number
    hayMas: boolean
  }> = {},
) {
  return {
    data: [filaMobileDto("MOB-001")],
    page: 1,
    pageSize: 25,
    total: 1,
    totalSinFiltro: 1,
    hayMas: false,
    ...overrides,
  }
}

function listadoMobileSsr(
  overrides: Partial<{
    data: readonly unknown[]
    total: number
    totalSinFiltro: number
    hayMas: boolean
  }> = {},
): AnimalsListRouteViewProps["listadoMobile"] {
  return { tipo: "lista", resultado: paginaMobileDto(overrides) }
}

const filaDesktop: AnimalListadoRowDto = {
  id: "animal-desktop",
  codigo: "DT-001",
  nombre: "Desktop",
  sexo: { key: "1", label: "Hembra" },
  raza: null,
  fechaNacimiento: null,
  edadAnios: null,
  color: null,
  origen: null,
  codigoMadre: null,
  nombreMadre: null,
  codigoPadre: null,
  nombrePadre: null,
  propietario: null,
  hierro: null,
  numeroPezones: null,
  calidad: null,
  codigoArete: null,
  fechaCompra: null,
  precioCompra: null,
  pesoCompraKg: null,
  tatuado: false,
  herrado: false,
  descornado: false,
  codigoRfid: null,
  potrero: null,
  sector: null,
  lote: null,
  grupo: null,
  comentarios: null,
  salud: null,
  categoriaReproductiva: null,
  estado: null,
  pesoUltimo: null,
  codigoQr: null,
  esDeMonta: false,
  tipoExplotacion: null,
}

function respuestaDesktop(): Response {
  const dto: AnimalListadoResponseDto = {
    data: [filaDesktop],
    page: 1,
    pageSize: 25,
    total: 1,
    totalSinFiltro: 1,
    sort: "codigo:asc",
    cols: [],
  }
  return respuestaHttp(dto)
}

/** Structural Response: the adapter contract is `status` + `json()`. */
function respuestaHttp(cuerpo: unknown, status = 200): Response {
  return { status, json: async () => cuerpo } as unknown as Response
}

function fetchPorRama(mobile: () => Response) {
  fetchMock.mockImplementation(async (url: string) =>
    url.includes("/animales/mobile") ? mobile() : respuestaDesktop(),
  )
}

function montarVista(iniciales: Partial<AnimalsListRouteViewProps> = {}) {
  const espias = {
    ficha: vi.fn(),
    nuevo: vi.fn(),
    volver: vi.fn(),
    sanear: vi.fn(),
    navegar: vi.fn(),
  }
  render(
    <AnimalsListRouteView
      fincaId="finca-1"
      permissions={permisosCompletos}
      listadoMobile={listadoMobileSsr()}
      catalogs={catalogos}
      onAbrirFicha={espias.ficha}
      onIrANuevo={espias.nuevo}
      onVolver={espias.volver}
      onSanearUrl={espias.sanear}
      onNavegarConsulta={espias.navegar}
      {...iniciales}
    />,
  )
  return espias
}

function llamadasMobile(): string[] {
  return fetchMock.mock.calls
    .map((llamada) => String(llamada[0]))
    .filter((url) => url.includes("/animales/mobile"))
}

function parametrosUltimaLlamadaMobile(): URLSearchParams {
  const url = llamadasMobile()[llamadasMobile().length - 1]
  return new URLSearchParams(url.split("?")[1])
}

const movil = () => screen.getByLabelText("03 Animales · Mobile")

describe("Issue #158 — infinite scroll accumulation (LM-009)", () => {
  it("seeds the SSR first page without fetching and mounts the sentinel when hayMas", async () => {
    fetchMock.mockResolvedValue(respuestaDesktop())
    montarVista({
      listadoMobile: listadoMobileSsr({ hayMas: true, total: 60, totalSinFiltro: 60 }),
    })

    await screen.findByText("DT-001") // desktop fetch settled
    expect(within(movil()).getByRole("button", { name: /MOB-001/ })).toBeInTheDocument()
    expect(within(movil()).getByTestId("centinela-scroll-infinito")).toBeInTheDocument()
    expect(llamadasMobile()).toHaveLength(0)
  })

  it("the sentinel intersection fetches page=2 with the same filters and appends", async () => {
    let llamadas = 0
    fetchPorRama(() => {
      llamadas += 1
      return respuestaHttp(
        paginaMobileDto({
          data: [filaMobileDto("MOB-026")],
          page: 2,
          total: 60,
          totalSinFiltro: 60,
          hayMas: false,
        }),
      )
    })
    montarVista({
      listadoMobile: listadoMobileSsr({ hayMas: true, total: 60, totalSinFiltro: 60 }),
    })

    simularInterseccionCentinela()
    await waitFor(() => expect(llamadasMobile()).toHaveLength(1))
    const parametros = parametrosUltimaLlamadaMobile()
    expect(parametros.get("page")).toBe("2")
    expect(parametros.get("pageSize")).toBe("25")
    expect([...parametros.keys()].some((key) => key.startsWith("f."))).toBe(false)

    // Page 2 is APPENDED — both pages stay visible; the sentinel retires.
    await waitFor(() =>
      expect(within(movil()).getByRole("button", { name: /MOB-026/ })).toBeInTheDocument(),
    )
    expect(within(movil()).getByRole("button", { name: /MOB-001/ })).toBeInTheDocument()
    await waitFor(() =>
      expect(within(movil()).queryByTestId("centinela-scroll-infinito")).not.toBeInTheDocument(),
    )
    expect(llamadas).toBe(1)
  })

  it("guards against duplicate in-flight requests on repeated intersections", async () => {
    fetchPorRama(() =>
      respuestaHttp(
        paginaMobileDto({ data: [filaMobileDto("MOB-026")], page: 2, total: 60, hayMas: false }),
      ),
    )
    montarVista({
      listadoMobile: listadoMobileSsr({ hayMas: true, total: 60, totalSinFiltro: 60 }),
    })

    simularInterseccionCentinela()
    simularInterseccionCentinela()
    simularInterseccionCentinela()

    await waitFor(() =>
      expect(within(movil()).getByRole("button", { name: /MOB-026/ })).toBeInTheDocument(),
    )
    expect(llamadasMobile()).toHaveLength(1)
  })

  it("hayMas=false stops further loads — no sentinel, no requests", async () => {
    fetchPorRama(() => respuestaHttp(paginaMobileDto()))
    montarVista({ listadoMobile: listadoMobileSsr({ hayMas: false }) })

    await waitFor(() =>
      expect(within(movil()).getByRole("button", { name: /MOB-001/ })).toBeInTheDocument(),
    )
    expect(within(movil()).queryByTestId("centinela-scroll-infinito")).not.toBeInTheDocument()

    simularInterseccionCentinela()
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1))
    expect(llamadasMobile()).toHaveLength(0)
  })

  it("a filter change resets to page=1 and clears the accumulation", async () => {
    let llamadas = 0
    fetchPorRama(() => {
      llamadas += 1
      if (llamadas === 1) {
        return respuestaHttp(
          paginaMobileDto({ data: [filaMobileDto("MOB-026")], page: 2, total: 60, hayMas: false }),
        )
      }
      return respuestaHttp(
        paginaMobileDto({
          data: [filaMobileDto("PRE-001")],
          page: 1,
          total: 1,
          totalSinFiltro: 60,
          hayMas: false,
        }),
      )
    })
    montarVista({
      listadoMobile: listadoMobileSsr({ hayMas: true, total: 60, totalSinFiltro: 60 }),
    })
    const user = userEvent.setup()

    simularInterseccionCentinela()
    await waitFor(() =>
      expect(within(movil()).getByRole("button", { name: /MOB-026/ })).toBeInTheDocument(),
    )

    await user.click(within(movil()).getByRole("button", { name: "Preñadas" }))
    await waitFor(() => expect(llamadasMobile()).toHaveLength(2))
    const parametros = parametrosUltimaLlamadaMobile()
    expect(parametros.get("page")).toBe("1")
    expect(parametros.get("f.categoriaReproductivaKey")).toBe("in:prenada")

    // The accumulation is replaced — page-2 rows disappear with the filter.
    await waitFor(() =>
      expect(within(movil()).getByRole("button", { name: /PRE-001/ })).toBeInTheDocument(),
    )
    expect(within(movil()).queryByRole("button", { name: /MOB-001/ })).not.toBeInTheDocument()
    expect(within(movil()).queryByRole("button", { name: /MOB-026/ })).not.toBeInTheDocument()
  })
})

describe("Issue #158 — distinguishable states and error semantics (LM-030/LM-023)", () => {
  it("LM-030.3: an empty finca offers registering the first animal", async () => {
    fetchMock.mockResolvedValue(respuestaDesktop())
    const { nuevo } = montarVista({
      listadoMobile: listadoMobileSsr({ data: [], total: 0, totalSinFiltro: 0, hayMas: false }),
    })

    await screen.findByText("DT-001")
    expect(within(movil()).getByText("Aún no hay animales en esta finca")).toBeInTheDocument()
    await userEvent.setup().click(within(movil()).getByRole("button", { name: "Registrar animal" }))
    expect(nuevo).toHaveBeenCalledTimes(1)
  })

  it("LM-023: a 400 sanitizes the offending filter, toasts, retains the list, and refetches page 1", async () => {
    let llamadas = 0
    fetchPorRama(() => {
      llamadas += 1
      if (llamadas === 1) {
        return respuestaHttp(
          {
            error: "bad_request",
            campo: "f.saludKey",
            motivo: "Valor de filtro no permitido",
            requestId: "req-400",
          },
          400,
        )
      }
      return respuestaHttp(
        paginaMobileDto({ data: [filaMobileDto("MOB-001")], total: 1, totalSinFiltro: 1 }),
      )
    })
    montarVista({ listadoMobile: listadoMobileSsr({ total: 1, totalSinFiltro: 1 }) })
    const user = userEvent.setup()

    await user.click(within(movil()).getByRole("button", { name: "Enfermas" }))

    // The correction is announced as a toast with the server motivo.
    expect(await screen.findByText("Valor de filtro no permitido")).toBeInTheDocument()

    // The offending chip is cleared and page 1 is refetched without it.
    await waitFor(() => expect(llamadasMobile()).toHaveLength(2))
    const parametros = parametrosUltimaLlamadaMobile()
    expect(parametros.get("page")).toBe("1")
    expect(parametros.has("f.saludKey")).toBe(false)
    await waitFor(() =>
      expect(within(movil()).getByRole("button", { name: "Enfermas" })).toHaveAttribute(
        "aria-pressed",
        "false",
      ),
    )
    // The last valid list is retained — never replaced by an error state.
    expect(within(movil()).getByRole("button", { name: /MOB-001/ })).toBeInTheDocument()
    expect(within(movil()).queryByText("Error al cargar los animales")).not.toBeInTheDocument()
  })

  it("LM-023/LM-030.5: a 403 clears the data to the denied state with a safe return", async () => {
    fetchPorRama(() =>
      respuestaHttp(
        { error: "forbidden", campo: null, motivo: "No autorizado", requestId: "req-403" },
        403,
      ),
    )
    const { volver } = montarVista({
      listadoMobile: listadoMobileSsr({ total: 1, totalSinFiltro: 1 }),
    })
    const user = userEvent.setup()

    await user.click(within(movil()).getByRole("button", { name: "Preñadas" }))

    expect(await within(movil()).findByText("No tienes acceso a esta finca")).toBeInTheDocument()
    expect(within(movil()).queryByRole("button", { name: /MOB-001/ })).not.toBeInTheDocument()
    expect(
      within(movil()).queryByRole("group", { name: "Filtros rápidos" }),
    ).not.toBeInTheDocument()

    await user.click(within(movil()).getByRole("button", { name: "Volver" }))
    expect(volver).toHaveBeenCalledTimes(1)
  })

  it("LM-023/LM-030.6: a 500 surfaces the retriable error state; Reintentar refetches the same request", async () => {
    let llamadas = 0
    fetchPorRama(() => {
      llamadas += 1
      if (llamadas === 1) {
        return respuestaHttp(
          { error: "server_error", campo: null, motivo: "Fallo interno", requestId: "req-500" },
          500,
        )
      }
      return respuestaHttp(
        paginaMobileDto({ data: [filaMobileDto("PRE-001")], total: 1, totalSinFiltro: 1 }),
      )
    })
    montarVista({ listadoMobile: listadoMobileSsr({ total: 1, totalSinFiltro: 1 }) })
    const user = userEvent.setup()

    await user.click(within(movil()).getByRole("button", { name: "Preñadas" }))

    // Explicit error state — never a silent empty list.
    expect(await within(movil()).findByText("Error al cargar los animales")).toBeInTheDocument()
    expect(within(movil()).queryByRole("button", { name: /MOB-001/ })).not.toBeInTheDocument()
    expect(within(movil()).queryByText("Ningún animal coincide")).not.toBeInTheDocument()

    await user.click(within(movil()).getByRole("button", { name: "Reintentar" }))
    await waitFor(() => expect(llamadasMobile()).toHaveLength(2))
    // The retry repeats the failed request: same filters, page 1.
    const parametros = parametrosUltimaLlamadaMobile()
    expect(parametros.get("page")).toBe("1")
    expect(parametros.get("f.categoriaReproductivaKey")).toBe("in:prenada")

    await waitFor(() =>
      expect(within(movil()).getByRole("button", { name: /PRE-001/ })).toBeInTheDocument(),
    )
  })

  it("LM-030.6: a network timeout surfaces the retriable error state", async () => {
    fetchPorRama(() => {
      throw new DOMException("The operation was aborted", "AbortError")
    })
    montarVista({ listadoMobile: listadoMobileSsr({ total: 1, totalSinFiltro: 1 }) })

    await userEvent.setup().click(within(movil()).getByRole("button", { name: "Preñadas" }))

    expect(await within(movil()).findByText("Error al cargar los animales")).toBeInTheDocument()
    expect(within(movil()).getByRole("button", { name: "Reintentar" })).toBeInTheDocument()
  })

  it("a failed load-more enters the error state; Reintentar refetches the same page and appends", async () => {
    let llamadas = 0
    fetchPorRama(() => {
      llamadas += 1
      if (llamadas === 1) {
        return respuestaHttp(
          { error: "server_error", campo: null, motivo: "Fallo interno", requestId: "req-lm" },
          500,
        )
      }
      return respuestaHttp(
        paginaMobileDto({ data: [filaMobileDto("MOB-026")], page: 2, total: 60, hayMas: false }),
      )
    })
    montarVista({
      listadoMobile: listadoMobileSsr({ hayMas: true, total: 60, totalSinFiltro: 60 }),
    })
    const user = userEvent.setup()

    simularInterseccionCentinela()
    expect(await within(movil()).findByText("Error al cargar los animales")).toBeInTheDocument()

    await user.click(within(movil()).getByRole("button", { name: "Reintentar" }))
    await waitFor(() => expect(llamadasMobile()).toHaveLength(2))
    expect(parametrosUltimaLlamadaMobile().get("page")).toBe("2")

    // The retried page is appended to the retained accumulation.
    await waitFor(() =>
      expect(within(movil()).getByRole("button", { name: /MOB-026/ })).toBeInTheDocument(),
    )
    expect(within(movil()).getByRole("button", { name: /MOB-001/ })).toBeInTheDocument()
  })

  it("LM-030.5: a loader denial renders the mobile denied state with a safe return", async () => {
    fetchMock.mockResolvedValue(respuestaDesktop())
    const { volver } = montarVista({ listadoMobile: { tipo: "permiso_denegado" } })

    await screen.findByText("DT-001")
    expect(within(movil()).getByText("No tienes acceso a esta finca")).toBeInTheDocument()
    expect(
      within(movil()).queryByRole("group", { name: "Filtros rápidos" }),
    ).not.toBeInTheDocument()

    await userEvent.setup().click(within(movil()).getByRole("button", { name: "Volver" }))
    expect(volver).toHaveBeenCalledTimes(1)
  })
})
