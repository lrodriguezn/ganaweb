// @vitest-environment jsdom

/**
 * PanelSanidad — panel desktop del módulo Sanidad (Issue #212,
 * RF-SANIDAD v0.2 §4).
 *
 * Reglas cubiertas (TS-001):
 * - SAN-001: título "Sanidad" + subtítulo "Panel de control · {finca}".
 * - SAN-002: 4 MetricCards con valores; las de stock navegables al listado.
 * - SAN-003/SAN-052: Próximas agrupadas en Esta semana / Próxima semana /
 *   Este mes; clic en una fila → onRegistrarAplicacion(productoId).
 * - SAN-004: últimas 4 registradas + enlace "Ver historial →".
 * - SAN-005: hasta 4 alertas de stock con badge (Agotado / "N dosis" / OK).
 * - SAN-006/D-007: Accesos con el copy confirmado ("Entradas y stock").
 * - PE-001/SAN-061: los botones de acción se gatean por PERMISO
 *   (tienePermiso), nunca por rol.
 * - Degradación por card: una fuente caída muestra su aviso sin tumbar el panel.
 */

import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  type AlertaStockPanelVista,
  PanelSanidad,
  type PeriodosRefuerzosPanelVista,
  type UltimaAplicacionPanelVista,
} from "../src/ganado/panel-sanidad"
import { crearPermisos } from "../src/ganado/types"

afterEach(() => cleanup())

const PERMISOS_VER_Y_CREAR = crearPermisos([
  { modulo: "sanidad", accion: "ver" },
  { modulo: "sanidad", accion: "crear" },
])
const PERMISOS_SOLO_VER = crearPermisos([{ modulo: "sanidad", accion: "ver" }])

const METRICAS = {
  aplicacionesEstaSemana: 5,
  animalesEnTratamiento: 3,
  stockCritico: 2,
  productosAgotados: 1,
}

const PROXIMAS: PeriodosRefuerzosPanelVista = {
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
  proximaSemana: [
    {
      productoId: "prod-cepa",
      codigo: "VAC-CEPA",
      descripcion: "Vacuna cepa",
      proposito: "Vacuna",
      cantidadAnimales: 4,
      venceFecha: "2026-08-12",
    },
  ],
  esteMes: [
    {
      productoId: "prod-iverm",
      codigo: "IVERMECTINA",
      descripcion: "Ivermectina 1%",
      proposito: "Tratamiento",
      cantidadAnimales: 8,
      venceFecha: "2026-08-25",
    },
  ],
}

const ULTIMAS: readonly UltimaAplicacionPanelVista[] = [
  {
    id: "apl-1",
    fecha: "2026-08-04",
    productoDescripcion: "Vacuna fiebre aftosa",
    objetivo: "animal",
    cantidadAnimales: 1,
    responsable: "María",
  },
  {
    id: "apl-2",
    fecha: "2026-08-03",
    productoDescripcion: "Ivermectina 1%",
    objetivo: "lote",
    cantidadAnimales: 18,
    responsable: null,
  },
]

const STOCK: readonly AlertaStockPanelVista[] = [
  {
    productoId: "prod-aftosa",
    codigo: "VAC-AFTOSA",
    descripcion: "Vacuna fiebre aftosa",
    dosisDisponibles: 0,
    estado: "agotado",
  },
  {
    productoId: "prod-iverm",
    codigo: "IVERMECTINA",
    descripcion: "Ivermectina 1%",
    dosisDisponibles: 7,
    estado: "bajo",
  },
  {
    productoId: "prod-cepa",
    codigo: "VAC-CEPA",
    descripcion: "Vacuna cepa",
    dosisDisponibles: 140,
    estado: "ok",
  },
]

function renderPanel(overrides: Partial<Parameters<typeof PanelSanidad>[0]> = {}) {
  return render(
    <PanelSanidad
      fincaNombre="Finca Esperanza"
      permisos={PERMISOS_VER_Y_CREAR}
      metricas={METRICAS}
      proximas={PROXIMAS}
      ultimas={ULTIMAS}
      stock={STOCK}
      onRegistrarAplicacion={() => {}}
      onEntradaAlmacen={() => {}}
      hrefHistorial="/fincas/finca-1/sanidad/historial"
      onVerHistorial={() => {}}
      onNavegarAcceso={() => {}}
      {...overrides}
    />,
  )
}

describe("PanelSanidad — SAN-001: encabezado", () => {
  it("muestra el título Sanidad y el subtítulo con la finca", () => {
    renderPanel()

    expect(screen.getByRole("heading", { level: 1, name: "Sanidad" })).toBeInTheDocument()
    expect(screen.getByText("Panel de control · Finca Esperanza")).toBeInTheDocument()
  })
})

describe("PanelSanidad — SAN-002: métricas", () => {
  it("renderiza las 4 MetricCards con sus valores", () => {
    renderPanel()

    expect(screen.getByText("Aplicaciones esta semana")).toBeInTheDocument()
    expect(screen.getByText("Animales en tratamiento")).toBeInTheDocument()
    expect(screen.getByText("Stock crítico")).toBeInTheDocument()
    expect(screen.getByText("Productos agotados")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("las métricas de stock navegan al listado cuando se provee el callback", async () => {
    const user = userEvent.setup()
    const onVerStock = vi.fn()
    renderPanel({ onVerStock })

    const cardCritico = screen.getByText("Stock crítico").closest("button")
    expect(cardCritico).not.toBeNull()
    await user.click(cardCritico as HTMLButtonElement)

    expect(onVerStock).toHaveBeenCalledTimes(1)
  })
})

describe("PanelSanidad — SAN-003/SAN-052: próximas aplicaciones", () => {
  it("agrupa en los tres períodos de la semana natural", () => {
    renderPanel()

    const proximas = screen.getByRole("region", { name: "Próximas aplicaciones" })
    expect(within(proximas).getByText("Esta semana")).toBeInTheDocument()
    expect(within(proximas).getByText("Próxima semana")).toBeInTheDocument()
    expect(within(proximas).getByText("Este mes")).toBeInTheDocument()
    expect(within(proximas).getByText(/Vacuna fiebre aftosa/)).toBeInTheDocument()
    expect(within(proximas).getByText(/12 animales/)).toBeInTheDocument()
    expect(within(proximas).getByText(/vence 2026-08-06/)).toBeInTheDocument()
  })

  it("clic en una fila abre el registro con el producto precargado (SAN-003)", async () => {
    const user = userEvent.setup()
    const onRegistrarAplicacion = vi.fn()
    renderPanel({ onRegistrarAplicacion })

    const fila = screen.getByRole("button", { name: /Vacuna fiebre aftosa.*12 animales/ })
    await user.click(fila)

    expect(onRegistrarAplicacion).toHaveBeenCalledWith("prod-aftosa")
  })

  it("sin refuerzos pendientes muestra el estado vacío", () => {
    renderPanel({
      proximas: { estaSemana: [], proximaSemana: [], esteMes: [] },
    })

    const proximas = screen.getByRole("region", { name: "Próximas aplicaciones" })
    expect(within(proximas).getByText(/sin refuerzos pendientes/i)).toBeInTheDocument()
  })
})

describe("PanelSanidad — SAN-004: últimas registradas", () => {
  it("muestra producto, objetivo + N animales, fecha y responsable", () => {
    renderPanel()

    const registradas = screen.getByRole("region", { name: "Últimas aplicaciones registradas" })
    expect(within(registradas).getByText("Vacuna fiebre aftosa")).toBeInTheDocument()
    expect(within(registradas).getByText(/Animal · 1/)).toBeInTheDocument()
    expect(within(registradas).getByText(/Lote · 18/)).toBeInTheDocument()
    expect(within(registradas).getByText(/2026-08-04 · María/)).toBeInTheDocument()
    // Sin responsable conocido: guión, no "null".
    expect(within(registradas).queryByText(/null/)).not.toBeInTheDocument()
  })

  it("el enlace Ver historial navega al historial", async () => {
    const user = userEvent.setup()
    const onVerHistorial = vi.fn()
    renderPanel({ onVerHistorial })

    await user.click(screen.getByRole("link", { name: /Ver historial/ }))

    expect(onVerHistorial).toHaveBeenCalledTimes(1)
  })
})

describe("PanelSanidad — SAN-005: alertas de stock", () => {
  it("muestra el badge según el estado: Agotado / N dosis / OK", () => {
    renderPanel()

    const stock = screen.getByRole("region", { name: "Alertas de stock" })
    expect(within(stock).getByText("Agotado")).toBeInTheDocument()
    expect(within(stock).getByText("7 dosis")).toBeInTheDocument()
    expect(within(stock).getByText("OK")).toBeInTheDocument()
  })
})

describe("PanelSanidad — SAN-006/D-007: accesos", () => {
  it("muestra los cuatro accesos con el copy confirmado", () => {
    renderPanel()

    const accesos = screen.getByRole("region", { name: "Accesos" })
    expect(within(accesos).getByText("Catálogo de productos")).toBeInTheDocument()
    expect(within(accesos).getByText("Productos sanitarios y dosis")).toBeInTheDocument()
    expect(within(accesos).getByText("Historial de aplicaciones")).toBeInTheDocument()
    expect(within(accesos).getByText("Registro completo por animal")).toBeInTheDocument()
    expect(within(accesos).getByText("Almacén e inventario")).toBeInTheDocument()
    // D-007: copy confirmado "Entradas y stock" (el diseño decía vencimientos).
    expect(within(accesos).getByText("Entradas y stock")).toBeInTheDocument()
    expect(within(accesos).getByText("Diagnósticos veterinarios")).toBeInTheDocument()
    expect(within(accesos).getByText("Revisiones y tratamientos")).toBeInTheDocument()
  })

  it("cada acceso navega a su destino", async () => {
    const user = userEvent.setup()
    const onNavegarAcceso = vi.fn()
    renderPanel({ onNavegarAcceso })

    const accesos = screen.getByRole("region", { name: "Accesos" })
    await user.click(within(accesos).getByRole("button", { name: /Historial de aplicaciones/ }))
    await user.click(within(accesos).getByRole("button", { name: /Almacén e inventario/ }))

    expect(onNavegarAcceso).toHaveBeenNthCalledWith(1, "historial")
    expect(onNavegarAcceso).toHaveBeenNthCalledWith(2, "almacen")
  })
})

describe("PanelSanidad — PE-001: acciones gateadas por permiso", () => {
  it("con sanidad:crear muestra Registrar aplicación y + Entrada almacén", () => {
    renderPanel()

    expect(screen.getByRole("button", { name: "Registrar aplicación" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "+ Entrada almacén" })).toBeInTheDocument()
  })

  it("sin sanidad:crear oculta ambos botones (solo lectura)", () => {
    renderPanel({ permisos: PERMISOS_SOLO_VER })

    expect(screen.queryByRole("button", { name: "Registrar aplicación" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "+ Entrada almacén" })).not.toBeInTheDocument()
  })
})

describe("PanelSanidad — degradación por card", () => {
  it("una fuente caída muestra su aviso sin tumbar las demás cards", () => {
    renderPanel({ metricas: null })

    expect(screen.getByText(/no se pudo cargar las métricas/i)).toBeInTheDocument()
    // Las demás cards siguen presentes.
    expect(screen.getByRole("region", { name: "Próximas aplicaciones" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Alertas de stock" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Accesos" })).toBeInTheDocument()
  })
})
