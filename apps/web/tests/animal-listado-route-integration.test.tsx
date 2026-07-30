// @vitest-environment jsdom

/**
 * #108 (PR 3) — route wiring integration: the desktop branch consumes the #107
 * endpoint through the typed route adapter and renders `AnimalListadoDesktop`;
 * the legacy list action remains the mobile-only data source; ficha navigation
 * is wired through spies (the route maps them to TanStack navigation).
 *
 * The route is exercised through the exported `AnimalsListRouteView` so the
 * loader data (visual permission projection + legacy list) can be pinned
 * without a TanStack Start runtime — the same pattern as
 * `animal-create-e2e.test.tsx`. The #107 transport is stubbed at the `fetch`
 * seam; the adapter, the LA-040–063 state machine, and the presentational
 * table run for real.
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ANIMAL_LISTADO_DEFAULT_COLUMNS } from "../src/features/animal-listado/animal-listado-route-adapter.js"
import type { AnimalListadoVisualPermissions } from "../src/features/animal-listado/animal-listado-route-adapter.js"
import {
  AnimalsListRouteView,
  crearControladorConsultaListado,
} from "../src/routes/_app/fincas/$fincaId/animales.js"
import type { AnimalsListRouteViewProps } from "../src/routes/_app/fincas/$fincaId/animales.js"
import type { AnimalCatalogs } from "../src/server/animal-actions.js"
import type {
  AnimalListadoResponseDto,
  AnimalListadoRowDto,
  ApiErrorDto,
} from "../src/server/animal-list-contract.js"

// The route module imports the server-function facade; stub it so no TanStack
// Start runtime is required. The view consumes loader data through props, so
// the stubs are inert.
vi.mock("../src/server/animal-actions.js", () => ({
  listAnimalsAction: vi.fn(),
  getAnimalCatalogsAction: vi.fn(),
  getAnimalListadoVisualPermissionsAction: vi.fn(),
}))

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  cleanup()
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

const IDS_CANONICOS_29 = ANIMAL_LISTADO_DEFAULT_COLUMNS.map((columna) => columna.id)

const filaLlena: AnimalListadoRowDto = {
  id: "animal-1",
  codigo: "MT-001",
  nombre: "Mariposa",
  sexo: { key: "1", label: "Hembra" },
  raza: { id: "raza-1", label: "Holstein" },
  fechaNacimiento: "2021-03-10",
  edadAnios: 5.4,
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

const filaVacia: AnimalListadoRowDto = {
  ...filaLlena,
  id: "animal-2",
  codigo: "MT-002",
  nombre: "",
  sexo: { key: "0", label: "Macho" },
  raza: null,
  fechaNacimiento: null,
  edadAnios: null,
}

function respuestaDto(overrides: Partial<AnimalListadoResponseDto> = {}): AnimalListadoResponseDto {
  return {
    data: [filaLlena, filaVacia],
    page: 1,
    pageSize: 25,
    total: 2,
    totalSinFiltro: 10,
    sort: "codigo:asc",
    cols: [...IDS_CANONICOS_29],
    ...overrides,
  }
}

/** Structural Response: the adapter contract is `status` + `json()`. */
function respuestaHttp(cuerpo: unknown, status = 200): Response {
  return { status, json: async () => cuerpo } as unknown as Response
}

function errorApi(overrides: Partial<ApiErrorDto> = {}): ApiErrorDto {
  return {
    error: "bad_request",
    campo: "f.razaId",
    motivo: "Valor de filtro no permitido",
    requestId: "req-1",
    ...overrides,
  }
}

const permisosCompletos: AnimalListadoVisualPermissions = {
  canCreate: true,
  canExport: true,
}

const catalogoVacio = { tipo: "disponible", options: [] } as const
const catalogos: AnimalCatalogs = {
  sexo: catalogoVacio,
  raza: { tipo: "disponible", options: [{ value: "raza-1", label: "Holstein" }] },
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

function legadoLista(): AnimalsListRouteViewProps["legado"] {
  return {
    tipo: "lista",
    animales: [
      {
        id: "animal-legado",
        codigoAnimal: "LEG-001",
        nombreAnimal: "Legada",
        sexo: "hembra",
        salud: "sano",
        estadoActual: "activo",
      },
    ],
    permissions: { canCreate: false },
  } as unknown as AnimalsListRouteViewProps["legado"]
}

function legadoDenegado(): AnimalsListRouteViewProps["legado"] {
  return { tipo: "permiso_denegado" } as unknown as AnimalsListRouteViewProps["legado"]
}

function montarVista(iniciales: Partial<AnimalsListRouteViewProps> = {}) {
  const espias = {
    ficha: vi.fn(),
    nuevo: vi.fn(),
    volver: vi.fn(),
    sanear: vi.fn(),
    navegar: vi.fn(),
  }
  const construir = (props: Partial<AnimalsListRouteViewProps>) => (
    <AnimalsListRouteView
      fincaId="finca-1"
      permissions={permisosCompletos}
      legado={legadoLista()}
      catalogs={catalogos}
      onAbrirFicha={espias.ficha}
      onIrANuevo={espias.nuevo}
      onVolver={espias.volver}
      onSanearUrl={espias.sanear}
      onNavegarConsulta={espias.navegar}
      {...props}
    />
  )
  const vista = render(construir(iniciales))
  return {
    ...espias,
    rerenderCon: (props: Partial<AnimalsListRouteViewProps>) => vista.rerender(construir(props)),
  }
}

describe("Route wiring — the desktop branch consumes only #107 (task 3.1)", () => {
  it("renders the desktop table from the #107 response end to end", async () => {
    fetchMock.mockResolvedValue(respuestaHttp(respuestaDto()))
    montarVista()

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/fincas/finca-1/animales")

    // Wait for real #107 data — the skeleton table is a different DOM node
    // (TablaCargando vs TablaListo), so wait at the screen level first.
    await screen.findByText("MT-001")
    const tabla = screen.getByRole("table", { name: "Listado de animales" })
    const encabezados = within(tabla).getAllByRole("columnheader")
    expect(encabezados).toHaveLength(29)
    expect(encabezados[0]).toHaveTextContent("Código")
    expect(encabezados[1]).toHaveTextContent("Nombre")
    expect(encabezados[28]).toHaveTextContent("Comentarios")

    // #107 data rendered null-safe through the adapter (raza null on row 2).
    expect(within(tabla).getByText("MT-001")).toBeInTheDocument()
    expect(within(tabla).getAllByText("Sin registrar").length).toBeGreaterThan(0)
    // Live count announced from the response totals.
    expect(screen.getByText("2 animales")).toBeInTheDocument()
  })

  it("keeps the legacy action mobile-only — #107 rows never feed the mobile list", async () => {
    fetchMock.mockResolvedValue(respuestaHttp(respuestaDto()))
    montarVista()

    await screen.findByText("MT-001")
    const tabla = screen.getByRole("table", { name: "Listado de animales" })
    expect(within(tabla).queryByText("LEG-001")).not.toBeInTheDocument()

    const movil = screen.getByLabelText("03 Animales · Mobile")
    expect(within(movil).getByText("LEG-001")).toBeInTheDocument()
    expect(within(movil).queryByText("MT-001")).not.toBeInTheDocument()
  })

  it("renders the #107 desktop table even when the legacy action denies the mobile branch", async () => {
    fetchMock.mockResolvedValue(respuestaHttp(respuestaDto()))
    montarVista({ legado: legadoDenegado() })

    // Wait for real #107 data (the skeleton table shares the same aria-label).
    await screen.findByText("MT-001")
    expect(screen.getByRole("table", { name: "Listado de animales" })).toBeInTheDocument()
    expect(screen.getByText("No tienes permiso para ver animales.")).toBeInTheDocument()
  })

  it("403 clears the data, states no access, and offers a safe return", async () => {
    fetchMock.mockResolvedValue(
      respuestaHttp(errorApi({ campo: null, motivo: "No autorizado", requestId: "req-403" }), 403),
    )
    const { volver } = montarVista()

    expect(
      await screen.findByRole("heading", { name: "No tienes acceso a esta finca" }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole("button", { name: "Volver" }))
    expect(volver).toHaveBeenCalledTimes(1)
  })

  it("500 offers Reintentar and the retry reaches the table", async () => {
    fetchMock.mockResolvedValueOnce(
      respuestaHttp(
        errorApi({
          campo: null,
          motivo: "No fue posible consultar los animales",
          requestId: "req-500",
        }),
        500,
      ),
    )
    montarVista()

    expect(
      await screen.findByRole("heading", { name: "Error al cargar los animales" }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()

    fetchMock.mockResolvedValueOnce(respuestaHttp(respuestaDto()))
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }))

    // Wait for the retried #107 data (the skeleton table appears first).
    await screen.findByText("MT-001")
    expect(screen.getByRole("table", { name: "Listado de animales" })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("a network timeout surfaces the retriable error, never a silent empty table", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation was aborted", "AbortError"))
    montarVista()

    expect(
      await screen.findByRole("heading", { name: "Error al cargar los animales" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("400 retains the last table, sanitizes the URL, and announces the correction (LA-040–043)", async () => {
    fetchMock.mockResolvedValueOnce(respuestaHttp(respuestaDto()))
    const { sanear, rerenderCon } = montarVista()
    expect(await screen.findByText("MT-001")).toBeInTheDocument()

    fetchMock.mockResolvedValueOnce(
      respuestaHttp(
        errorApi({ campo: "f.razaId", motivo: "Valor de filtro no permitido", requestId: "req-9" }),
        400,
      ),
    )
    rerenderCon({ consulta: "f.razaId=in:raza-mala" })

    await waitFor(() => expect(sanear).toHaveBeenCalledTimes(1))
    const consultaSaneada = sanear.mock.calls[0]?.[0] as URLSearchParams
    expect(consultaSaneada.has("f.razaId")).toBe(false)

    // The last valid table is retained — never replaced by an error state.
    await waitFor(() => expect(screen.getByText("MT-001")).toBeInTheDocument())
    // The correction is announced (toast payload: "titulo: mensaje" text nodes).
    expect(screen.getByText(/Valor de filtro no permitido/)).toBeInTheDocument()
  })

  it("row click and Enter open that row's ficha through the navigation spies", async () => {
    fetchMock.mockResolvedValue(respuestaHttp(respuestaDto()))
    const { ficha } = montarVista()
    await screen.findByText("MT-001")

    const user = userEvent.setup()
    const filas = screen.getAllByRole("row")
    expect(filas).toHaveLength(3) // header + two #107 rows

    await user.click(within(filas[1]).getByText("MT-001"))
    expect(ficha).toHaveBeenCalledWith("animal-1")

    filas[2].focus()
    await user.keyboard("{Enter}")
    expect(ficha).toHaveBeenCalledWith("animal-2")
  })

  it("projection flags gate Nuevo animal / Exportar and the table stays usable", async () => {
    fetchMock.mockResolvedValue(respuestaHttp(respuestaDto()))
    const { nuevo, rerenderCon } = montarVista()
    await screen.findByText("MT-001")

    const user = userEvent.setup()
    expect(screen.getByRole("button", { name: "Nuevo animal" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Exportar" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Nuevo animal" }))
    expect(nuevo).toHaveBeenCalledTimes(1)

    rerenderCon({ permissions: { canCreate: false, canExport: false } })
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Nuevo animal" })).not.toBeInTheDocument(),
    )
    expect(screen.queryByRole("button", { name: "Exportar" })).not.toBeInTheDocument()
    expect(await screen.findByText("MT-001")).toBeInTheDocument()
  })
})

describe("#109 route query controller (Unit 2)", () => {
  it("renders a catalog-backed route filter and commits its stable ID", async () => {
    fetchMock.mockResolvedValue(respuestaHttp(respuestaDto()))
    const { navegar } = montarVista()

    await userEvent.setup().selectOptions(screen.getByRole("combobox", { name: "Raza" }), "raza-1")

    expect(navegar).toHaveBeenCalledWith({
      consulta: new URLSearchParams("f.razaId=in%3Araza-1"),
      replace: false,
    })
  })

  it("replaces a debounced search after 300 ms while retaining AND filters", () => {
    vi.useFakeTimers()
    const navegar = vi.fn()
    const controller = crearControladorConsultaListado(
      new URLSearchParams("page=3&f.razaId=in:raza-1"),
      navegar,
    )

    controller.buscar("mariposa")
    vi.advanceTimersByTime(299)
    expect(navegar).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)

    const navegacion = navegar.mock.calls[0]?.[0]
    expect(navegacion.replace).toBe(true)
    expect(navegacion.consulta.toString()).toBe("f.razaId=in%3Araza-1&q=mariposa")
    vi.useRealTimers()
  })

  it("pushes committed filter/chip/clear/sort mutations and replays URL state", () => {
    const navegar = vi.fn()
    const controller = crearControladorConsultaListado(
      new URLSearchParams("page=2&q=mariposa&f.razaId=in:raza-1"),
      navegar,
    )

    controller.eliminarChip("f.razaId")
    controller.ordenar("codigo")
    controller.limpiar()

    expect(navegar).toHaveBeenNthCalledWith(1, {
      consulta: new URLSearchParams("q=mariposa"),
      replace: false,
    })
    expect(navegar).toHaveBeenNthCalledWith(2, {
      consulta: new URLSearchParams("q=mariposa&f.razaId=in:raza-1&sort=codigo:asc"),
      replace: false,
    })
    expect(navegar).toHaveBeenNthCalledWith(3, {
      consulta: new URLSearchParams(),
      replace: false,
    })

    const sinOrden = crearControladorConsultaListado(
      new URLSearchParams("page=2&sort=codigo:desc"),
      navegar,
    )
    sinOrden.ordenar("codigo")
    expect(navegar).toHaveBeenLastCalledWith({ consulta: new URLSearchParams(), replace: false })
  })

  it("cancels stale debounced search before a newer committed mutation", () => {
    vi.useFakeTimers()
    const navegar = vi.fn()
    const controller = crearControladorConsultaListado(new URLSearchParams("q=anterior"), navegar)

    controller.buscar("obsoleta")
    controller.ordenar("codigo")
    vi.advanceTimersByTime(300)

    expect(navegar).toHaveBeenCalledOnce()
    expect(navegar).toHaveBeenCalledWith({
      consulta: new URLSearchParams("q=anterior&sort=codigo%3Aasc"),
      replace: false,
    })
    vi.useRealTimers()
  })

  it("retains valid data and ignores stale 400 corrections", async () => {
    let resolverAntiguo: ((respuesta: Response) => void) | undefined
    fetchMock
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolverAntiguo = resolve
          }),
      )
      .mockResolvedValueOnce(
        respuestaHttp(respuestaDto({ data: [{ ...filaLlena, codigo: "ACT-001" }] })),
      )
    const { rerenderCon, sanear } = montarVista({ consulta: "q=antigua" })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    rerenderCon({ consulta: "q=actual" })

    expect(await screen.findByText("ACT-001")).toBeInTheDocument()
    resolverAntiguo?.(respuestaHttp(errorApi({ campo: "f.razaId", motivo: "Obsoleta" }), 400))
    await waitFor(() => expect(sanear).not.toHaveBeenCalled())
    expect(screen.getByText("ACT-001")).toBeInTheDocument()
    expect(screen.queryByText("Obsoleta")).not.toBeInTheDocument()
  })

  it("corrects sequential invalid fields one at a time, retaining the valid table (LA-044)", async () => {
    fetchMock.mockResolvedValueOnce(respuestaHttp(respuestaDto()))
    const { sanear, rerenderCon } = montarVista()
    expect(await screen.findByText("MT-001")).toBeInTheDocument()

    fetchMock.mockResolvedValueOnce(
      respuestaHttp(
        errorApi({ campo: "f.razaId", motivo: "Valor de filtro no permitido", requestId: "seq-1" }),
        400,
      ),
    )
    rerenderCon({ consulta: "f.razaId=in:raza-mala&f.sexoKey=eq:999&pageSize=50" })

    await waitFor(() => expect(sanear).toHaveBeenCalledTimes(1))
    const primeraSaneada = sanear.mock.calls[0]?.[0] as URLSearchParams
    expect(primeraSaneada.has("f.razaId")).toBe(false)
    expect(primeraSaneada.get("f.sexoKey")).toBe("eq:999")
    expect(primeraSaneada.get("pageSize")).toBe("50")
    expect(screen.getByText("MT-001")).toBeInTheDocument()

    fetchMock.mockResolvedValueOnce(
      respuestaHttp(
        errorApi({
          campo: "f.sexoKey",
          motivo: "Valor de filtro no permitido",
          requestId: "seq-2",
        }),
        400,
      ),
    )
    rerenderCon({ consulta: "f.sexoKey=eq:999&pageSize=50" })

    await waitFor(() => expect(sanear).toHaveBeenCalledTimes(2))
    const segundaSaneada = sanear.mock.calls[1]?.[0] as URLSearchParams
    expect(segundaSaneada.has("f.sexoKey")).toBe(false)
    expect(segundaSaneada.get("pageSize")).toBe("50")
    expect(screen.getByText("MT-001")).toBeInTheDocument()
  })

  it("ignores a stale 200 response that resolves after a newer query (LA-045)", async () => {
    let resolverAntiguo: ((respuesta: Response) => void) | undefined
    fetchMock
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolverAntiguo = resolve
          }),
      )
      .mockResolvedValueOnce(
        respuestaHttp(respuestaDto({ data: [{ ...filaLlena, codigo: "ACT-001" }] })),
      )
    const { rerenderCon } = montarVista({ consulta: "q=antigua" })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    rerenderCon({ consulta: "q=actual" })

    expect(await screen.findByText("ACT-001")).toBeInTheDocument()

    resolverAntiguo?.(respuestaHttp(respuestaDto({ data: [{ ...filaLlena, codigo: "OLD-999" }] })))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(screen.getByText("ACT-001")).toBeInTheDocument()
    expect(screen.queryByText("OLD-999")).not.toBeInTheDocument()
  })
})
