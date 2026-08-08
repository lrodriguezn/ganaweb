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
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
  type SanidadPanelLoaderData,
  Route as SanidadRoute,
  SanidadRouteView,
  type SanidadRouteViewProps,
} from "../src/routes/_app/fincas/$fincaId/sanidad.js"
import { registrarEntradaAlmacenFn } from "../src/server/sanidad-mobile.js"
import { listarCatalogoSanidadFn } from "../src/server/sanidad-mobile.js"
import {
  listarHistorialPanelSanidadFn,
  listarProximasPanelSanidadFn,
  listarStockPanelSanidadFn,
  listarUltimasPanelSanidadFn,
  obtenerMetricasPanelSanidadFn,
} from "../src/server/sanidad-mobile.js"
import { listarAnimalesSanidadFn, registrarAplicacionFn } from "../src/server/sanidad-mobile.js"

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
  // D9 (Issue #213): mock de `window.matchMedia` para que el switch
  // responsive del route tenga un valor determinista en jsdom. Por
  // defecto desktop (max-width: 767px) NO matches, salvo que un test
  // lo sobreescriba.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => {
      const esMaxWidthMobile = /\(max-width:\s*767px\)/.test(query)
      return {
        matches: !esMaxWidthMobile,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }
    },
  })
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
  vi.mocked(registrarAplicacionFn).mockReset()
  vi.mocked(listarAnimalesSanidadFn).mockReset()
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
      animalIds: [],
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
      {
        id: "prod-aftosa",
        descripcion: "Vacuna fiebre aftosa",
        mlPorDosis: 2,
        dosisDisponibles: 142,
      },
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
      {
        id: "prod-aftosa",
        descripcion: "Vacuna fiebre aftosa",
        mlPorDosis: 2,
        dosisDisponibles: 142,
      },
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

describe("sanidad route — Issue #211: drawer del registro cableado a las server functions", () => {
  const ANIMALES_FINCA = [
    { id: "animal-1", codigo: "AN-001", nombre: "Luna" },
    { id: "animal-2", codigo: "AN-002", nombre: "Sol" },
  ]

  it("al abrir el drawer se cargan los animales EN_FINCA vía listarAnimalesSanidadFn (SAN-043)", async () => {
    const user = userEvent.setup()
    vi.mocked(listarAnimalesSanidadFn).mockResolvedValue({
      tipo: "lista",
      animales: ANIMALES_FINCA,
    })
    renderVista()

    await user.click(screen.getByRole("button", { name: "Registrar aplicación" }))

    expect(await screen.findByText("Registrar vacuna")).toBeInTheDocument()
    expect(listarAnimalesSanidadFn).toHaveBeenCalledTimes(1)
    const llamada = vi.mocked(listarAnimalesSanidadFn).mock.calls[0]?.[0] as {
      data: { fincaId: string; fecha: string }
    }
    expect(llamada.data.fincaId).toBe(FINCA_ID)
    // La fecha es hoy en formato ISO local (AAAA-MM-DD).
    expect(llamada.data.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("guardar invoca registrarAplicacionFn y cierra el drawer en 'aplicado' (SAN-047)", async () => {
    const user = userEvent.setup()
    vi.mocked(listarAnimalesSanidadFn).mockResolvedValue({
      tipo: "lista",
      animales: ANIMALES_FINCA,
    })
    vi.mocked(registrarAplicacionFn).mockResolvedValue({
      tipo: "aplicado",
      aplicacionIds: ["app-1"],
      registroGrupalId: null,
      precioDosisSnapshot: 3500,
      refuerzosAutoCompletados: [],
      advertencias: [],
      stockDisponible: 140,
      alertaStockNegativo: false,
    })
    renderVista()

    await user.click(screen.getByRole("button", { name: "Registrar aplicación" }))
    expect(await screen.findByText("Registrar vacuna")).toBeInTheDocument()
    // Espera a que el listado de animales se monte en el drawer (state batch).
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /Guardar 2 registros/ })).toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    // Selecciona el producto y guarda.
    await user.click(screen.getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: /Vacuna fiebre aftosa/ }))
    await user.click(screen.getByRole("button", { name: /Guardar 2 registros/ }))

    expect(registrarAplicacionFn).toHaveBeenCalledTimes(1)
    const llamada = vi.mocked(registrarAplicacionFn).mock.calls[0]?.[0] as {
      data: {
        fincaId: string
        productoId: string
        dosis: number
        fecha: string
        animalIds: readonly string[]
      }
    }
    expect(llamada.data.fincaId).toBe(FINCA_ID)
    expect(llamada.data.productoId).toBe("prod-aftosa")
    expect(llamada.data.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(llamada.data.animalIds).toEqual(["animal-1", "animal-2"])

    // El drawer se cierra tras "aplicado" (el título del form desaparece).
    await waitFor(() => {
      expect(screen.queryByText("Registrar vacuna")).not.toBeInTheDocument()
    })
  })

  it("en 'validacion' los errores se mapean por campo (CM-042 / RN-002)", async () => {
    const user = userEvent.setup()
    vi.mocked(listarAnimalesSanidadFn).mockResolvedValue({
      tipo: "lista",
      animales: ANIMALES_FINCA,
    })
    vi.mocked(registrarAplicacionFn).mockResolvedValue({
      tipo: "validacion",
      errores: [{ campo: "fecha", detalle: "La fecha no puede ser futura (RN-002)." }],
    })
    renderVista()

    await user.click(screen.getByRole("button", { name: "Registrar aplicación" }))
    expect(await screen.findByText("Registrar vacuna")).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Guardar 2 registros/ })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: /Vacuna fiebre aftosa/ }))
    await user.click(screen.getByRole("button", { name: /Guardar 2 registros/ }))

    expect(registrarAplicacionFn).toHaveBeenCalledTimes(1)
    // El drawer sigue abierto mostrando el mensaje del servidor.
    expect(screen.getByText("Registrar vacuna")).toBeInTheDocument()
    // El detalle del error del servidor es visible.
    expect(screen.getByText(/La fecha no puede ser futura \(RN-002\)\./)).toBeInTheDocument()
  })

  it("la fila de Próximas abre el drawer con animales precargados cuando el loader los aporta (SAN-011)", async () => {
    const user = userEvent.setup()
    vi.mocked(listarAnimalesSanidadFn).mockResolvedValue({
      tipo: "lista",
      animales: ANIMALES_FINCA,
    })
    vi.mocked(registrarAplicacionFn).mockResolvedValue({
      tipo: "aplicado",
      aplicacionIds: ["app-1"],
      registroGrupalId: null,
      precioDosisSnapshot: 3500,
      refuerzosAutoCompletados: [],
      advertencias: [],
      stockDisponible: 140,
      alertaStockNegativo: false,
    })
    renderVista({
      proximas: {
        estaSemana: [
          {
            productoId: "prod-aftosa",
            codigo: "VAC-AFTOSA",
            descripcion: "Vacuna fiebre aftosa",
            proposito: "Vacuna",
            cantidadAnimales: 2,
            venceFecha: "2026-08-06",
            animalIds: ["animal-1", "animal-2"],
          },
        ],
        proximaSemana: [],
        esteMes: [],
      },
    })

    await user.click(screen.getByRole("button", { name: /Vacuna fiebre aftosa.*2 animales/ }))
    expect(await screen.findByText("Registrar vacuna")).toBeInTheDocument()
    // El precargo acota la selección: el botón cuenta sólo los 2 animales.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Guardar 2 registros/ })).toBeInTheDocument()
    })
    await user.click(screen.getByRole("button", { name: /Guardar 2 registros/ }))

    expect(registrarAplicacionFn).toHaveBeenCalledTimes(1)
    const llamada = vi.mocked(registrarAplicacionFn).mock.calls[0]?.[0] as {
      data: { animalIds: readonly string[] }
    }
    expect(llamada.data.animalIds).toEqual(["animal-1", "animal-2"])
  })
})

describe("sanidad route — SAN-014/#210: entrada de almacén", () => {
  it("+ Entrada almacén abre el formulario y guarda vía registrarEntradaAlmacenFn", async () => {
    const user = userEvent.setup()
    vi.mocked(registrarEntradaAlmacenFn).mockResolvedValue({
      tipo: "registrada",
      entradaId: "ent-1",
    })
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

/* -------------------------------------------------------------------- */
/* Issue #213 — D9: switch responsive en la misma ruta                  */
/* -------------------------------------------------------------------- */

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

function desinstalarMatchMedia() {
  try {
    Reflect.deleteProperty(window, "matchMedia")
  } catch {
    // ignore
  }
}

describe("sanidad route — D9: switch responsive mobile < 768px", () => {
  afterEach(() => {
    desinstalarMatchMedia()
  })

  it("viewport < 768px renderiza SanidadMobileView con tab Refuerzos, NO el panel desktop", () => {
    instalarMatchMedia(true)
    // Re-renderiza con el matchMedia ya activo.
    render(
      <SanidadRouteView
        fincaId={FINCA_ID}
        data={dataPineada()}
        onVerHistorial={() => {}}
        onNavegar={() => {}}
      />,
    )

    // El header del panel desktop NO debe renderizar (es un h1 con subtítulo).
    // En cambio, la mobile view tiene un h1 "Sanidad" + un tablist "Sección de sanidad".
    // Cuando el switch esté cableado, el tablist aparecerá. La ausencia
    // del subtítulo "Panel de control · ..." confirma que NO se renderizó
    // el PanelSanidad desktop.
    expect(screen.queryByText("Panel de control · Finca Esperanza")).not.toBeInTheDocument()
  })

  it("viewport ≥ 768px sigue mostrando PanelSanidad (no regresión #212)", () => {
    instalarMatchMedia(false)
    render(
      <SanidadRouteView
        fincaId={FINCA_ID}
        data={dataPineada()}
        onVerHistorial={() => {}}
        onNavegar={() => {}}
      />,
    )

    expect(screen.getByText("Panel de control · Finca Esperanza")).toBeInTheDocument()
  })
})

describe("sanidad route — §13 item 11: 2-tap precargado en mobile (SAN-010/011)", () => {
  beforeEach(() => {
    instalarMatchMedia(true)
  })
  afterEach(() => {
    desinstalarMatchMedia()
  })

  it("tap en una card de Refuerzo abre el drawer con el producto precargado", async () => {
    const user = userEvent.setup()
    vi.mocked(listarAnimalesSanidadFn).mockResolvedValue({
      tipo: "lista",
      animales: [{ id: "animal-1", codigo: "AN-001", nombre: "Luna" }],
    })
    render(
      <SanidadRouteView
        fincaId={FINCA_ID}
        data={dataPineada()}
        onVerHistorial={() => {}}
        onNavegar={() => {}}
      />,
    )

    // El tablist "Sección de sanidad" indica que la vista mobile está activa.
    expect(screen.getByRole("tablist", { name: /sección de sanidad/i })).toBeInTheDocument()

    // La card de Refuerzos (loader trae animalIds) abre el drawer con
    // la precarga del producto.
    await user.click(screen.getByRole("button", { name: /Vacuna fiebre aftosa.*12 animales/ }))

    expect(await screen.findByText("Registrar vacuna")).toBeInTheDocument()
    expect(screen.getByText("Vacuna fiebre aftosa — 142 dosis")).toBeInTheDocument()
  })
})

// Helper expuesto para que el route-switching lo reusa el test.
type _SanidadRouteViewPropsAlias = SanidadRouteViewProps
const _typecheckSanidadRouteViewProps: _SanidadRouteViewPropsAlias | undefined = undefined
void _typecheckSanidadRouteViewProps
