// @vitest-environment jsdom

/**
 * Ruta del panel de sanidad (Issue #212, SAN-001/SAN-003/SAN-014).
 *
 * Casa patrón (configuracion-hub-route.test.tsx): las vistas se prueban vía
 * el componente exportado (`SanidadRouteView`) con loader data pineada por
 * props; el loader fail-closed se prueba invocando `Route.options.loader`
 * con los server functions mockeados (sin runtime de TanStack Start).
 *
 * Cubre:
 * - Loader fail-closed por card: el fallo/rechazo de UNA fuente degrada esa
 *   card a `null` sin tumbar las demás (degradación por card).
 * - SAN-001: título "Sanidad" + subtítulo "Panel de control · {finca}".
 * - SAN-003: "Registrar aplicación" (y la fila de Próximas) abre el
 *   FormularioVacuna con el producto precargado vía `productoIdInicial`.
 * - SAN-014/#210: "+ Entrada almacén" abre el FormularioEntradaAlmacen
 *   cableado a `registrarEntradaAlmacenFn`.
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
  obtenerMetricasPanelSanidadFn,
  listarProximasPanelSanidadFn,
  listarUltimasPanelSanidadFn,
  listarStockPanelSanidadFn,
  listarHistorialPanelSanidadFn,
} from "../src/server/sanidad-panel.server.js"
import { registrarEntradaAlmacenFn } from "../src/server/sanidad-almacen.server.js"
import { listarCatalogoSanidadFn } from "../src/server/sanidad-catalogo-actions.server.js"
import {
  Route as SanidadRoute,
  type SanidadPanelLoaderData,
  SanidadRouteView,
} from "../src/routes/_app/fincas/$fincaId/sanidad.js"

vi.mock("../src/server/sanidad-panel.server.js", () => ({
  obtenerMetricasPanelSanidadFn: vi.fn(),
  listarProximasPanelSanidadFn: vi.fn(),
  listarUltimasPanelSanidadFn: vi.fn(),
  listarStockPanelSanidadFn: vi.fn(),
  listarHistorialPanelSanidadFn: vi.fn(),
}))
vi.mock("../src/server/sanidad-almacen.server.js", () => ({
  registrarEntradaAlmacenFn: vi.fn(),
  listarEntradasAlmacenFn: vi.fn(),
}))
vi.mock("../src/server/sanidad-catalogo-actions.server.js", () => ({
  listarCatalogoSanidadFn: vi.fn(),
}))

beforeAll(() => {
  // vaul Drawer en jsdom (patrón formulario-entrada-almacen.test.tsx).
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
  vi.mocked(obtenerMetricasPanelSanidadFn).mockReset()
  vi.mocked(listarProximasPanelSanidadFn).mockReset()
  vi.mocked(listarUltimasPanelSanidadFn).mockReset()
  vi.mocked(listarStockPanelSanidadFn).mockReset()
  vi.mocked(listarHistorialPanelSanidadFn).mockReset()
  vi.mocked(registrarEntradaAlmacenFn).mockReset()
  vi.mocked(listarCatalogoSanidadFn).mockReset()
})

const FINCA_ID = "finca-esperanza"

const SESION = {
  usuarioId: "user-1",
  nombre: "Admin",
  email: "admin@ganaweb.test",
  fincaActivaId: FINCA_ID,
  fincaActivaNombre: "Finca Esperanza",
  rol: "administrador",
  permisos: [
    { modulo: "sanidad", accion: "ver" },
    { modulo: "sanidad", accion: "crear" },
  ],
  fincas: [],
} as const

const METRICAS = {
  aplicacionesEstaSemana: 5,
  animalesEnTratamiento: 3,
  stockCritico: 2,
  productosAgotados: 1,
}

const PROXIMAS = {
  estaSemana: [
    {
      productoId: "prod-aftosa",
      codigo: "VAC-AFTOSA",
      descripcion: "Vacuna fiebre aftosa",
      proposito: "Vacuna",
      cantidadAnimales: 12,
      venceFecha: "2026-08-06",
    },
  ],
  proximaSemana: [],
  esteMes: [],
}

const ULTIMAS = [
  {
    id: "apl-1",
    fecha: "2026-08-04",
    productoCodigo: "VAC-AFTOSA",
    productoDescripcion: "Vacuna fiebre aftosa",
    objetivo: "animal",
    cantidadAnimales: 1,
    responsable: "María",
  },
]

const STOCK = [
  {
    productoId: "prod-aftosa",
    codigo: "VAC-AFTOSA",
    descripcion: "Vacuna fiebre aftosa",
    dosisDisponibles: 0,
    estado: "agotado",
  },
]

const CATALOGO = {
  tipo: "catalogo",
  stockMinimoDosis: 20,
  filas: [
    {
      id: "prod-aftosa",
      codigo: "VAC-AFTOSA",
      descripcion: "Vacuna fiebre aftosa",
      mlMgPorDosis: 2,
      tipoTratamiento: "vacuna",
      precioDosis: 3500,
      comentarios: null,
      activo: true,
      stockDisponible: 142,
      estadoStock: "ok",
    },
  ],
}

function mockearLoaderTodoOk() {
  vi.mocked(obtenerMetricasPanelSanidadFn).mockResolvedValue({ tipo: "ok", metricas: METRICAS })
  vi.mocked(listarProximasPanelSanidadFn).mockResolvedValue({ tipo: "ok", periodos: PROXIMAS })
  vi.mocked(listarUltimasPanelSanidadFn).mockResolvedValue({ tipo: "ok", aplicaciones: ULTIMAS })
  vi.mocked(listarStockPanelSanidadFn).mockResolvedValue({ tipo: "ok", alertas: STOCK })
  vi.mocked(listarCatalogoSanidadFn).mockResolvedValue(CATALOGO)
}

const loaderSanidad = SanidadRoute.options.loader as unknown as (opts: {
  params: { fincaId: string }
  context: { sesion: typeof SESION }
}) => Promise<SanidadPanelLoaderData>

describe("sanidad route — loader fail-closed por card", () => {
  it("todas las fuentes ok: loader devuelve las 4 cards y el catálogo", async () => {
    mockearLoaderTodoOk()

    const data = await loaderSanidad({ params: { fincaId: FINCA_ID }, context: { sesion: SESION } })

    expect(data.fincaNombre).toBe("Finca Esperanza")
    expect(data.metricas).toEqual(METRICAS)
    expect(data.proximas).toEqual(PROXIMAS)
    expect(data.ultimas).toEqual(ULTIMAS)
    expect(data.stock).toEqual(STOCK)
    expect(data.productosVacuna).toEqual([
      { id: "prod-aftosa", descripcion: "Vacuna fiebre aftosa", mlPorDosis: 2, dosisDisponibles: 142 },
    ])
    expect(data.productosEntrada).toEqual([
      { id: "prod-aftosa", codigo: "VAC-AFTOSA", descripcion: "Vacuna fiebre aftosa" },
    ])
  })

  it("el fallo de métricas degrada solo esa card (no tumba el panel)", async () => {
    vi.mocked(obtenerMetricasPanelSanidadFn).mockRejectedValue(new Error("timeout"))
    vi.mocked(listarProximasPanelSanidadFn).mockResolvedValue({ tipo: "ok", periodos: PROXIMAS })
    vi.mocked(listarUltimasPanelSanidadFn).mockResolvedValue({ tipo: "ok", aplicaciones: ULTIMAS })
    vi.mocked(listarStockPanelSanidadFn).mockResolvedValue({ tipo: "ok", alertas: STOCK })
    vi.mocked(listarCatalogoSanidadFn).mockResolvedValue(CATALOGO)

    const data = await loaderSanidad({ params: { fincaId: FINCA_ID }, context: { sesion: SESION } })

    expect(data.metricas).toBeNull()
    // Las demás cards siguen cargadas.
    expect(data.proximas).toEqual(PROXIMAS)
    expect(data.ultimas).toEqual(ULTIMAS)
    expect(data.stock).toEqual(STOCK)
  })

  it("una denegación RBAC degrada la card a null (fail-closed de presentación)", async () => {
    vi.mocked(obtenerMetricasPanelSanidadFn).mockResolvedValue({
      tipo: "permiso_denegado",
      permiso: "sanidad:ver",
    })
    vi.mocked(listarProximasPanelSanidadFn).mockResolvedValue({ tipo: "ok", periodos: PROXIMAS })
    vi.mocked(listarUltimasPanelSanidadFn).mockResolvedValue({ tipo: "ok", aplicaciones: ULTIMAS })
    vi.mocked(listarStockPanelSanidadFn).mockResolvedValue({ tipo: "ok", alertas: STOCK })
    vi.mocked(listarCatalogoSanidadFn).mockResolvedValue(CATALOGO)

    const data = await loaderSanidad({ params: { fincaId: FINCA_ID }, context: { sesion: SESION } })

    expect(data.metricas).toBeNull()
    expect(data.proximas).toEqual(PROXIMAS)
  })

  it("el fallo del catálogo no tumba las cards: productos vacíos", async () => {
    vi.mocked(obtenerMetricasPanelSanidadFn).mockResolvedValue({ tipo: "ok", metricas: METRICAS })
    vi.mocked(listarProximasPanelSanidadFn).mockResolvedValue({ tipo: "ok", periodos: PROXIMAS })
    vi.mocked(listarUltimasPanelSanidadFn).mockResolvedValue({ tipo: "ok", aplicaciones: ULTIMAS })
    vi.mocked(listarStockPanelSanidadFn).mockResolvedValue({ tipo: "ok", alertas: STOCK })
    vi.mocked(listarCatalogoSanidadFn).mockRejectedValue(new Error("connection lost"))

    const data = await loaderSanidad({ params: { fincaId: FINCA_ID }, context: { sesion: SESION } })

    expect(data.metricas).toEqual(METRICAS)
    expect(data.productosVacuna).toEqual([])
    expect(data.productosEntrada).toEqual([])
  })
})

function dataPineada(overrides: Partial<SanidadPanelLoaderData> = {}): SanidadPanelLoaderData {
  return {
    fincaNombre: "Finca Esperanza",
    permisos: [...SESION.permisos],
    metricas: METRICAS,
    proximas: PROXIMAS,
    ultimas: ULTIMAS,
    stock: STOCK,
    productosVacuna: [
      { id: "prod-aftosa", descripcion: "Vacuna fiebre aftosa", mlPorDosis: 2, dosisDisponibles: 142 },
    ],
    productosEntrada: [
      { id: "prod-aftosa", codigo: "VAC-AFTOSA", descripcion: "Vacuna fiebre aftosa" },
    ],
    ...overrides,
  }
}

function renderVista(overrides: Partial<SanidadPanelLoaderData> = {}) {
  return render(
    <SanidadRouteView
      fincaId={FINCA_ID}
      data={dataPineada(overrides)}
      onVerHistorial={() => {}}
      onNavegar={() => {}}
    />,
  )
}

describe("sanidad route — SAN-001: encabezado", () => {
  it("muestra el título Sanidad y el subtítulo con la finca", () => {
    renderVista()

    expect(screen.getByRole("heading", { level: 1, name: "Sanidad" })).toBeInTheDocument()
    expect(screen.getByText("Panel de control · Finca Esperanza")).toBeInTheDocument()
  })
})

describe("sanidad route — SAN-003: registro de aplicación con producto precargado", () => {
  it("clic en una fila de Próximas abre el FormularioVacuna con el producto precargado", async () => {
    const user = userEvent.setup()
    renderVista()

    // La fila de Próximas abre el registro con el producto precargado.
    await user.click(screen.getByRole("button", { name: /Vacuna fiebre aftosa.*12 animales/ }))

    // El drawer muestra el formulario con el producto ya seleccionado.
    expect(await screen.findByText("Registrar vacuna")).toBeInTheDocument()
    expect(screen.getByText("Vacuna fiebre aftosa — 142 dosis")).toBeInTheDocument()
  })

  it("el botón Registrar aplicación abre el formulario sin producto precargado", async () => {
    const user = userEvent.setup()
    renderVista()

    await user.click(screen.getByRole("button", { name: "Registrar aplicación" }))

    expect(await screen.findByText("Registrar vacuna")).toBeInTheDocument()
    expect(screen.getByText("Elegir producto")).toBeInTheDocument()
  })
})

describe("sanidad route — SAN-014/#210: entrada de almacén", () => {
  it("+ Entrada almacén abre el formulario y guarda vía registrarEntradaAlmacenFn", async () => {
    const user = userEvent.setup()
    vi.mocked(registrarEntradaAlmacenFn).mockResolvedValue({ tipo: "registrada", entradaId: "ent-1" })
    renderVista()

    await user.click(screen.getByRole("button", { name: "+ Entrada almacén" }))

    expect(await screen.findByText("Nueva entrada de almacén")).toBeInTheDocument()

    // Selecciona el producto y llena la dosis para poder guardar.
    await user.click(screen.getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: /VAC-AFTOSA/ }))
    await user.type(screen.getByLabelText("Dosis"), "10")
    await user.click(screen.getByRole("button", { name: "Registrar entrada" }))

    expect(registrarEntradaAlmacenFn).toHaveBeenCalledTimes(1)
    const llamada = vi.mocked(registrarEntradaAlmacenFn).mock.calls[0]?.[0] as {
      data: { fincaId: string; productoId: string; dosis: number }
    }
    expect(llamada.data.fincaId).toBe(FINCA_ID)
    expect(llamada.data.productoId).toBe("prod-aftosa")
    expect(llamada.data.dosis).toBe(10)
  })
})
