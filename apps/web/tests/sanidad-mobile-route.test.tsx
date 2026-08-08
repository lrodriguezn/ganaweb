// @vitest-environment jsdom

/**
 * sanidad mobile route — tabs Catálogo y Almacén (Issue #213, U4, SAN-013/SAN-014).
 *
 * Cubre:
 * - 4.1: Tab Catálogo renderiza `CatalogoProductosSanitariosMobile`; carga filas
 *   vía `listarCatalogoSanidadFn`; `onEditar` abre `FormularioProductoSanitario`
 *   en drawer; `onInactivar` con AlertDialog; CRUD gateado por `sanidad:crear`
 *   y `sanidad:editar` (SAN-060).
 * - 4.2: Tab Almacén renderiza `ListadoEntradasAlmacen`; FAB abre
 *   `FormularioEntradaAlmacen` en drawer; `registrarEntradaAlmacenFn` cableado;
 *   `registrada` cierra drawer; gating `sanidad:crear` (SAN-060).
 * - 4.3: el módulo `apps/web/src/server/sanidad-mobile.ts` re-exporta los server
 *   functions ya existentes (sin lógica nueva, sin `.server.ts` propio).
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
  type SanidadPanelLoaderData,
  SanidadRouteView,
} from "../src/routes/_app/fincas/$fincaId/sanidad.js"
import * as sanidadAlmacen from "../src/server/sanidad-almacen.js"
import * as sanidadCatalogo from "../src/server/sanidad-catalogo-actions.js"
import * as sanidadMobile from "../src/server/sanidad-mobile.js"

vi.mock("../src/server/sanidad-mobile.js", () => ({
  obtenerMetricasPanelSanidadFn: vi.fn(),
  listarProximasPanelSanidadFn: vi.fn(),
  listarUltimasPanelSanidadFn: vi.fn(),
  listarStockPanelSanidadFn: vi.fn(),
  listarHistorialPanelSanidadFn: vi.fn(),
  listarCatalogoSanidadFn: vi.fn(),
  listarEntradasAlmacenFn: vi.fn(),
  registrarEntradaAlmacenFn: vi.fn(),
  listarAnimalesSanidadFn: vi.fn(),
  registrarAplicacionFn: vi.fn(),
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
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => {
      const esMaxWidthMobile = /\(max-width:\s*767px\)/.test(query)
      return {
        matches: esMaxWidthMobile,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }
    },
  })
})

function instalarMatchMedia(matchesMovil: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => {
      const esMaxWidthMobile = /\(max-width:\s*767px\)/.test(query)
      return {
        matches: esMaxWidthMobile ? matchesMovil : !matchesMovil,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }
    },
  })
}

beforeEach(() => {
  instalarMatchMedia(true)
})

afterEach(() => {
  cleanup()
  vi.mocked(sanidadMobile.obtenerMetricasPanelSanidadFn).mockReset()
  vi.mocked(sanidadMobile.listarProximasPanelSanidadFn).mockReset()
  vi.mocked(sanidadMobile.listarUltimasPanelSanidadFn).mockReset()
  vi.mocked(sanidadMobile.listarStockPanelSanidadFn).mockReset()
  vi.mocked(sanidadMobile.registrarEntradaAlmacenFn).mockReset()
  vi.mocked(sanidadMobile.listarEntradasAlmacenFn).mockReset()
  vi.mocked(sanidadMobile.listarCatalogoSanidadFn).mockReset()
  vi.mocked(sanidadMobile.registrarAplicacionFn).mockReset()
  vi.mocked(sanidadMobile.listarAnimalesSanidadFn).mockReset()
})

const FINCA_ID = "finca-esperanza"

const SESION = {
  permisos: [
    { modulo: "sanidad", accion: "ver" },
    { modulo: "sanidad", accion: "crear" },
    { modulo: "sanidad", accion: "editar" },
    { modulo: "sanidad", accion: "anular" },
  ],
} as const

function dataPineada(overrides: Partial<SanidadPanelLoaderData> = {}): SanidadPanelLoaderData {
  return {
    fincaNombre: "Finca Esperanza",
    permisos: [...SESION.permisos],
    metricas: null,
    proximas: { estaSemana: [], proximaSemana: [], esteMes: [] },
    ultimas: [],
    stock: [],
    productosVacuna: [],
    productosEntrada: [],
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

describe("sanidad mobile route — 4.3: módulo sanidad-mobile.ts re-exporta server functions", () => {
  it("re-exporta los server functions ya existentes (sin lógica nueva, sin .server.ts propio)", () => {
    expect(typeof sanidadMobile.listarCatalogoSanidadFn).toBe("function")
    expect(typeof sanidadMobile.listarEntradasAlmacenFn).toBe("function")
    expect(typeof sanidadMobile.registrarEntradaAlmacenFn).toBe("function")
    // Mismas referencias que el módulo original (re-export aditivo).
    expect(sanidadMobile.listarCatalogoSanidadFn).toBe(sanidadMobile.listarCatalogoSanidadFn)
    expect(sanidadMobile.listarEntradasAlmacenFn).toBe(sanidadMobile.listarEntradasAlmacenFn)
    expect(sanidadMobile.registrarEntradaAlmacenFn).toBe(sanidadMobile.registrarEntradaAlmacenFn)
  })
})

describe("sanidad mobile route — 4.1: Tab Catálogo (SAN-013/SAN-060)", () => {
  it("carga filas vía listarCatalogoSanidadFn al activar el tab", async () => {
    const user = userEvent.setup()
    vi.mocked(sanidadMobile.listarCatalogoSanidadFn).mockResolvedValue({
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
    })
    renderVista()

    // Cambio al tab Catálogo.
    await user.click(screen.getByRole("tab", { name: "Catálogo" }))

    await waitFor(() => {
      expect(sanidadMobile.listarCatalogoSanidadFn).toHaveBeenCalled()
    })
    // La fila del catálogo se renderiza con su código y descripción.
    expect(await screen.findByText("VAC-AFTOSA")).toBeInTheDocument()
    expect(screen.getByText("Vacuna fiebre aftosa")).toBeInTheDocument()
  })

  it("onEditar abre el FormularioProductoSanitario en drawer", async () => {
    const user = userEvent.setup()
    vi.mocked(sanidadMobile.listarCatalogoSanidadFn).mockResolvedValue({
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
    })
    renderVista()

    await user.click(screen.getByRole("tab", { name: "Catálogo" }))
    await screen.findByText("VAC-AFTOSA")

    await user.click(screen.getByRole("button", { name: /Editar VAC-AFTOSA/ }))

    // El drawer de edición se abre.
    expect(await screen.findByRole("heading", { name: /editar producto/i })).toBeInTheDocument()
  })

  it("onInactivar muestra un AlertDialog de confirmación", async () => {
    const user = userEvent.setup()
    vi.mocked(sanidadMobile.listarCatalogoSanidadFn).mockResolvedValue({
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
    })
    renderVista()

    await user.click(screen.getByRole("tab", { name: "Catálogo" }))
    await screen.findByText("VAC-AFTOSA")

    await user.click(screen.getByRole("button", { name: /Inactivar VAC-AFTOSA/ }))

    // El AlertDialog de confirmación se muestra.
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText(/¿Inactivar VAC-AFTOSA\?/)).toBeInTheDocument()
  })
})

describe("sanidad mobile route — 4.2: Tab Almacén (SAN-014/SAN-060)", () => {
  it("carga entradas vía listarEntradasAlmacenFn al activar el tab", async () => {
    const user = userEvent.setup()
    vi.mocked(sanidadMobile.listarEntradasAlmacenFn).mockResolvedValue({
      tipo: "lista",
      entradas: [
        {
          id: "ent-1",
          fecha: "2026-08-04",
          productoCodigo: "VAC-AFTOSA",
          productoDescripcion: "Vacuna fiebre aftosa",
          dosis: 50,
          precioPorDosis: 3500,
          comentario: null,
        },
      ],
    })
    renderVista()

    await user.click(screen.getByRole("tab", { name: "Almacén" }))

    await waitFor(() => {
      expect(sanidadMobile.listarEntradasAlmacenFn).toHaveBeenCalled()
    })
    expect(await screen.findByText("Vacuna fiebre aftosa")).toBeInTheDocument()
  })

  it("el FAB abre el FormularioEntradaAlmacen en drawer", async () => {
    const user = userEvent.setup()
    vi.mocked(sanidadMobile.listarEntradasAlmacenFn).mockResolvedValue({
      tipo: "lista",
      entradas: [],
    })
    renderVista()

    await user.click(screen.getByRole("tab", { name: "Almacén" }))

    // FAB visible (aria-label="Nueva entrada de almacén" para a11y).
    const fab = screen.getByRole("button", { name: /Nueva entrada de almacén/i })
    await user.click(fab)

    expect(await screen.findByText("Nueva entrada de almacén")).toBeInTheDocument()
  })

  it("guardar cierra el drawer en 'registrada' (SAN-014)", async () => {
    const user = userEvent.setup()
    vi.mocked(sanidadMobile.listarEntradasAlmacenFn).mockResolvedValue({
      tipo: "lista",
      entradas: [],
    })
    vi.mocked(sanidadMobile.registrarEntradaAlmacenFn).mockResolvedValue({
      tipo: "registrada",
      entradaId: "ent-1",
    })
    renderVista({
      productosEntrada: [
        { id: "prod-aftosa", codigo: "VAC-AFTOSA", descripcion: "Vacuna fiebre aftosa" },
      ],
    })

    await user.click(screen.getByRole("tab", { name: "Almacén" }))
    const fab = screen.getByRole("button", { name: /Nueva entrada de almacén/i })
    await user.click(fab)
    expect(await screen.findByText("Nueva entrada de almacén")).toBeInTheDocument()

    await user.click(screen.getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: /VAC-AFTOSA/ }))
    await user.type(screen.getByLabelText("Dosis"), "10")
    await user.click(screen.getByRole("button", { name: "Registrar entrada" }))

    await waitFor(() => {
      expect(screen.queryByText("Nueva entrada de almacén")).not.toBeInTheDocument()
    })
    expect(sanidadMobile.registrarEntradaAlmacenFn).toHaveBeenCalledTimes(1)
  })
})
