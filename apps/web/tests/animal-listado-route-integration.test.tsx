// @vitest-environment jsdom

/**
 * #108 (PR 3) — route wiring integration: the desktop branch consumes the #107
 * endpoint through the typed route adapter and renders `AnimalListadoDesktop`;
 * the mobile branch consumes the #155 mobile contract resolved by the loader
 * (issue #156); ficha navigation is wired through spies (the route maps them to
 * TanStack navigation).
 *
 * The route is exercised through the exported `AnimalsListRouteView` so the
 * loader data (visual permission projection + mobile first page) can be pinned
 * without a TanStack Start runtime — the same pattern as
 * `animal-create-e2e.test.tsx`. The #107 transport is stubbed at the `fetch`
 * seam; the adapter, the LA-040–063 state machine, and the presentational
 * table run for real. The loader-side mobile resolver is pinned separately in
 * `animal-mobile-list-loader.test.ts` (focused stubbed-deps coverage).
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

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
  getAnimalMobileListAction: vi.fn(),
  getAnimalCatalogsAction: vi.fn(),
  getAnimalListadoPreferenciasAction: vi.fn(),
  getAnimalListadoVisualPermissionsAction: vi.fn(),
}))

const fetchMock = vi.fn()

beforeAll(() => {
  // The #111 export dialog is a Radix Dialog; opening it calls pointer-capture
  // + scroll APIs jsdom lacks (same carve-out as the dialog/toast tests).
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

function listadoMobileLista(): AnimalsListRouteViewProps["listadoMobile"] {
  return {
    tipo: "lista",
    resultado: {
      data: [
        {
          id: "animal-mobile",
          codigo: "MOB-001",
          nombre: "Mobile",
          sexo: { key: "1", label: "Hembra" },
          raza: { id: "raza-1", label: "Holstein" },
          categoriaReproductiva: { key: "prenada", label: "Preñada" },
          salud: { key: "0", label: "Sano" },
          esDeMonta: false,
          propietario: { id: "prop-1", label: "Don Juan" },
          madre: { codigo: "MT-101", nombre: "Estrella" },
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
      totalSinFiltro: 1,
      hayMas: false,
    },
  }
}

function listadoMobileDenegado(): AnimalsListRouteViewProps["listadoMobile"] {
  return { tipo: "permiso_denegado" }
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
      listadoMobile={listadoMobileLista()}
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

  it("the mobile branch renders the #155 first page — #107 rows never feed the mobile list", async () => {
    fetchMock.mockResolvedValue(respuestaHttp(respuestaDto()))
    montarVista()

    await screen.findByText("MT-001")
    const tabla = screen.getByRole("table", { name: "Listado de animales" })
    expect(within(tabla).queryByText("MOB-001")).not.toBeInTheDocument()

    const movil = screen.getByLabelText("03 Animales · Mobile")
    const card = within(movil).getByRole("button", { name: /MOB-001 Mobile/ })
    expect(within(movil).queryByText("MT-001")).not.toBeInTheDocument()
    // Real categoria/salud + procedencia resuelta (issue #156, LM-001).
    expect(within(card).getByText("Preñada")).toBeInTheDocument()
    expect(within(card).getByText("Sana")).toBeInTheDocument()
    expect(within(card).getByText("Hembra · Holstein")).toBeInTheDocument()
    expect(within(card).getByText("Propietario: Don Juan")).toBeInTheDocument()
    expect(within(card).getByText("Madre: MT-101 · Estrella")).toBeInTheDocument()
  })

  it("renders the #107 desktop table even when the loader denies the mobile branch", async () => {
    fetchMock.mockResolvedValue(respuestaHttp(respuestaDto()))
    montarVista({ listadoMobile: listadoMobileDenegado() })

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
    const movil = screen.getByLabelText("03 Animales · Mobile")
    // Both branches expose "Nuevo animal" with a full grant — click the
    // desktop one (the button NOT inside the mobile section).
    const botonesNuevo = screen.getAllByRole("button", { name: "Nuevo animal" })
    expect(botonesNuevo.length).toBe(2)
    const botonEscritorio = botonesNuevo.find((boton) => !movil.contains(boton))
    expect(botonEscritorio).toBeDefined()
    await user.click(botonEscritorio as HTMLElement)
    expect(nuevo).toHaveBeenCalledTimes(1)

    rerenderCon({ permissions: { canCreate: false, canExport: false } })
    await waitFor(() =>
      expect(screen.queryAllByRole("button", { name: "Nuevo animal" })).toHaveLength(0),
    )
    expect(screen.queryByRole("button", { name: "Exportar" })).not.toBeInTheDocument()
    expect(await screen.findByText("MT-001")).toBeInTheDocument()
  })

  it("LM-RBAC-03: the mobile '+' sources canCreate from the loader permissions projection", async () => {
    fetchMock.mockResolvedValue(respuestaHttp(respuestaDto()))
    const { nuevo, rerenderCon } = montarVista()
    await screen.findByText("MT-001")

    const movil = screen.getByLabelText("03 Animales · Mobile")
    const botonNuevo = within(movil).getByRole("button", { name: "Nuevo animal" })
    await userEvent.setup().click(botonNuevo)
    expect(nuevo).toHaveBeenCalledTimes(1)

    // A viewer without animales:crear loses the mobile '+' even with data.
    rerenderCon({ permissions: { canCreate: false, canExport: true } })
    await waitFor(() =>
      expect(
        within(screen.getByLabelText("03 Animales · Mobile")).queryByRole("button", {
          name: "Nuevo animal",
        }),
      ).not.toBeInTheDocument(),
    )
    expect(
      within(screen.getByLabelText("03 Animales · Mobile")).getByRole("button", {
        name: /MOB-001 Mobile/,
      }),
    ).toBeInTheDocument()
  })
})

describe("#109 route query controller (Unit 2)", () => {
  it("renders a catalog-backed route filter and commits its stable ID", async () => {
    fetchMock.mockResolvedValue(respuestaHttp(respuestaDto()))
    const { navegar } = montarVista()

    // #141 migrated the filter to Radix Select: the trigger is a combobox
    // button and the options render in a portal, so selectOptions no longer
    // applies — open the listbox and pick the option by its visible label.
    const user = userEvent.setup()
    await user.click(screen.getByRole("combobox", { name: "Raza" }))
    await user.click(await screen.findByRole("option", { name: "Holstein" }))

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

/** A real binary artifact response the export transport can `.blob()`. */
function respuestaExportacion(
  bytes: Uint8Array,
  nombreArchivo: string,
  contentType = "text/csv; charset=utf-8",
): Response {
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  })
}

describe("#111 export wiring (PR6) — Exportar opens the dialog and confirms a download (LA-070/074, LA-RBAC-03)", () => {
  const createObjectURLOriginal = URL.createObjectURL
  const revokeObjectURLOriginal = URL.revokeObjectURL
  let createObjectURL: ReturnType<typeof vi.fn>
  let clickSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // jsdom lacks the download primitives the real transport uses (anchor +
    // object URL); capture them so the download side effect is verifiable.
    createObjectURL = vi.fn(() => "blob:descarga")
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = vi.fn()
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined)
  })

  afterEach(() => {
    clickSpy.mockRestore()
    URL.createObjectURL = createObjectURLOriginal
    URL.revokeObjectURL = revokeObjectURLOriginal
  })

  it("Exportar opens the export dialog while the list and filters stay in place", async () => {
    fetchMock.mockResolvedValue(respuestaHttp(respuestaDto()))
    montarVista()
    await screen.findByText("MT-001")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole("button", { name: "Exportar" }))

    expect(await screen.findByRole("dialog", { name: "Exportar animales" })).toBeInTheDocument()
    // Non-destructive: the table is still mounted behind the dialog. Radix
    // marks the background `aria-hidden` while open, so include hidden nodes.
    expect(
      screen.getByRole("table", { name: "Listado de animales", hidden: true }),
    ).toBeInTheDocument()
  })

  it("confirming the export triggers the download transport and announces success (LA-070)", async () => {
    fetchMock.mockResolvedValueOnce(respuestaHttp(respuestaDto()))
    fetchMock.mockResolvedValueOnce(
      respuestaExportacion(
        new TextEncoder().encode("codigo,nombre\nMT-001,Mariposa\n"),
        "animales_vista_20260731-120000.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    )
    montarVista()
    await screen.findByText("MT-001")

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Exportar" }))
    const dialogo = await screen.findByRole("dialog", { name: "Exportar animales" })
    // Confirm with the default selection (Vista actual + XLSX).
    await user.click(within(dialogo).getByRole("button", { name: "Exportar" }))

    // The download transport ran against the export endpoint with the
    // dialog's format/scope, and a real client download was triggered.
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1))
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const urlExport = new URL(String(fetchMock.mock.calls[1]?.[0]), "http://localhost")
    expect(urlExport.pathname).toBe("/api/fincas/finca-1/animales/exportar")
    expect(urlExport.searchParams.get("format")).toBe("xlsx")
    expect(urlExport.searchParams.get("scope")).toBe("vista")

    // Success is announced and the dialog closes; the list remains in place.
    expect(await screen.findByText("Exportación lista")).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(screen.getByRole("table", { name: "Listado de animales" })).toBeInTheDocument()
  })

  it("the export request carries the active filters, scope, and format (LA-076 wiring)", async () => {
    fetchMock.mockResolvedValueOnce(respuestaHttp(respuestaDto()))
    fetchMock.mockResolvedValueOnce(
      respuestaExportacion(new Uint8Array([1]), "animales_todas_20260731-120000.csv"),
    )
    montarVista({ consulta: "q=toros&f.razaId=in:raza-1" })
    await screen.findByText("MT-001")

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Exportar" }))
    const dialogo = await screen.findByRole("dialog", { name: "Exportar animales" })
    await user.selectOptions(within(dialogo).getByLabelText("Alcance"), "todas")
    await user.selectOptions(within(dialogo).getByLabelText("Formato"), "csv")
    await user.click(within(dialogo).getByRole("button", { name: "Exportar" }))

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1))
    const urlExport = new URL(String(fetchMock.mock.calls[1]?.[0]), "http://localhost")
    expect(urlExport.pathname).toBe("/api/fincas/finca-1/animales/exportar")
    expect(urlExport.searchParams.get("format")).toBe("csv")
    expect(urlExport.searchParams.get("scope")).toBe("todas")
    // The active filters ride along — the same closure feeds a retry, so
    // Reintentar preserves filters/scope/format (LA-076).
    expect(urlExport.searchParams.get("q")).toBe("toros")
    expect(urlExport.searchParams.get("f.razaId")).toBe("in:raza-1")
  })

  it("without canExport the entry point is absent and the dialog never opens (LA-RBAC-03)", async () => {
    fetchMock.mockResolvedValue(respuestaHttp(respuestaDto()))
    montarVista({ permissions: { canCreate: true, canExport: false } })
    await screen.findByText("MT-001")

    expect(screen.queryByRole("button", { name: "Exportar" })).not.toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    // The table stays usable for a view-only profile.
    expect(screen.getByRole("table", { name: "Listado de animales" })).toBeInTheDocument()
  })
})
