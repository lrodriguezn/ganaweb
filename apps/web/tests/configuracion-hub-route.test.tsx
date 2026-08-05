// @vitest-environment jsdom

/**
 * Issue #149 — hub Configuración · Maestros (RF-CONFIG-MAESTROS v1.0).
 *
 * Cubre:
 * - Hub desktop (CM-003..CM-008): 15 items en 3 grupos, badge S-3, doble
 *   conteo "N · M", degradado "—", vacío bloqueante con la dependencia.
 * - Hub mobile (CM-009/CM-010): filas consolidadas con conteo compuesto,
 *   globales presentes, orden del frame-20188.
 * - Sub-menú mobile (S-1): miembros de la fila consolidada con conteos.
 * - CM-014: estado de error con reintento y skeleton (pendingComponent).
 * - RBAC (CM-015/CM-021): beforeLoad redirige sin `configuracion:ver`;
 *   loader redirige denials del server function; fallo RPC → {tipo:"error"};
 *   grupoId desconocido → redirect al hub; gating del botón en MasView.
 *
 * Patrón de la casa: las vistas se prueban vía los componentes exportados
 * (ConfiguracionHubView / ConfiguracionGrupoView / MasView) con loader data
 * pineada por props; los redirects de ruta se prueban invocando
 * `Route.options.beforeLoad/loader` (sin runtime de TanStack Start).
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { isRedirect } from "@tanstack/react-router"

import type { MaestroResumen } from "@ganaweb/ui"
import {
  FILAS_CONSOLIDADAS_MOVIL,
  MAESTROS_HUB,
  type MaestroHubId,
  rutaConfiguracionMaestro,
} from "../src/configuracion/definicion-maestros.js"
import { puedeVerConfiguracion } from "../src/configuracion/permisos-configuracion.js"
import {
  ConfiguracionHubView,
  Route as ConfiguracionRoute,
  construirFilasMovil,
} from "../src/routes/_app/fincas/$fincaId/configuracion.js"
import {
  ConfiguracionGrupoView,
  Route as GrupoRoute,
  miembrosDeFila,
} from "../src/routes/_app/fincas/$fincaId/configuracion/grupo/$grupoId.js"
import { MasView } from "../src/routes/_app/mas.js"
import { resumenMaestrosAction } from "../src/server/configuracion-actions.js"

// El módulo de server functions no debe cargar el runtime de TanStack Start.
vi.mock("../src/server/configuracion-actions.js", () => ({
  resumenMaestrosAction: vi.fn(),
}))

// La cadena mas.tsx → _app.tsx → server/auth.js importa createServerFn.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain: Record<string, unknown> = {}
    chain.validator = () => chain
    chain.handler = (fn: unknown) => fn
    return chain
  },
}))

afterEach(() => {
  cleanup()
  vi.mocked(resumenMaestrosAction).mockReset()
})

const FINCA_ID = "f1"

/** 15 items con la forma exacta que emite el harness (issue #148). */
function itemsFixture(
  overrides: Partial<Record<MaestroHubId, Partial<MaestroResumen>>> = {},
): MaestroResumen[] {
  return MAESTROS_HUB.map((definicion) => ({
    id: definicion.id,
    nombre: definicion.nombre,
    grupo: definicion.grupo,
    registros: 0,
    ...(definicion.requeridoPara ? { requeridoPara: definicion.requeridoPara } : {}),
    ruta: rutaConfiguracionMaestro(FINCA_ID, definicion.id),
    ...overrides[definicion.id],
  }))
}

/** Fixture principal: conteos del frame, inseminadores vacío bloqueante, sectores degradado. */
function itemsDisenio(): MaestroResumen[] {
  return itemsFixture({
    veterinarios: { registros: 4 },
    propietarios: { registros: 12 },
    // inseminadores vacío → alerta bloqueante "requerido para Servicios IA"
    predio: { registros: 1 },
    potreros: { registros: 8 },
    sectores: { registros: 4, degradado: true },
    lotesGrupos: { registros: 6, registrosSecundario: 3 },
    hierros: { registros: 5 },
    diagnosticos: { registros: 7 },
    motivosVentas: { registros: 3 },
    causasMuerte: { registros: 5 },
    lugaresCompras: { registros: 4 },
    razas: { registros: 18 },
    tiposExplotacion: { registros: 4 },
    calidades: { registros: 3 },
  })
}

const SESION_CON_PERMISO = {
  permisos: [{ modulo: "configuracion", accion: "ver" }],
} as const
const SESION_SIN_PERMISO = {
  permisos: [{ modulo: "animales", accion: "ver" }],
} as const

type RedirectResponse = Response & {
  options: { to?: string; params?: Record<string, string> }
}

/** Issue #198: resuelve `to` con huecos `$param` + `params` a la URL final. */
function destinoRedirect(valor: unknown): string | null {
  if (!isRedirect(valor)) return null
  const { to, params } = (valor as RedirectResponse).options
  if (!to) return null
  return Object.entries(params ?? {}).reduce(
    (ruta, [clave, valorParam]) => ruta.replace(`$${clave}`, valorParam),
    to,
  )
}

describe("ConfiguracionHubView — desktop (CM-003..CM-008)", () => {
  it("renderiza los 15 items en los 3 grupos con los nombres del diseño", () => {
    render(
      <ConfiguracionHubView
        fincaId={FINCA_ID}
        resultado={{ tipo: "resumen", items: itemsDisenio() }}
        onNavegar={() => {}}
        onReintentar={() => {}}
      />,
    )
    expect(screen.getByText("Configuración")).toBeInTheDocument()
    expect(screen.getByText("Maestros")).toBeInTheDocument()
    expect(
      screen.getByText("Datos base que alimentan los formularios de registro"),
    ).toBeInTheDocument()
    // Grupos desktop (MaestroGrid)
    expect(screen.getByText("Personas")).toBeInTheDocument()
    expect(screen.getByText("Ubicación")).toBeInTheDocument()
    expect(screen.getByText("Clasificación y comerciales")).toBeInTheDocument()
    // Cada maestro se renderiza en desktop Y mobile (CSS conmuta)
    for (const definicion of MAESTROS_HUB) {
      if (FILAS_CONSOLIDADAS_MOVIL.some((fila) => fila.miembros.includes(definicion.id))) {
        continue // los miembros consolidados no tienen fila propia en mobile
      }
      expect(screen.getAllByText(definicion.nombre).length).toBeGreaterThanOrEqual(1)
    }
    // 15 cards desktop + 10 filas mobile sueltas + 2 consolidadas + back = 28 botones
    expect(screen.getAllByRole("button")).toHaveLength(28)
  })

  it("CM-011/S-3: badge '7 de 8 requeridos completos' junto al título", () => {
    render(
      <ConfiguracionHubView
        fincaId={FINCA_ID}
        resultado={{ tipo: "resumen", items: itemsDisenio() }}
        onNavegar={() => {}}
        onReintentar={() => {}}
      />,
    )
    expect(screen.getByText("7 de 8 requeridos completos")).toBeInTheDocument()
  })

  it("CM-008: Lotes · Grupos muestra el doble conteo '6 · 3'", () => {
    render(
      <ConfiguracionHubView
        fincaId={FINCA_ID}
        resultado={{ tipo: "resumen", items: itemsDisenio() }}
        onNavegar={() => {}}
        onReintentar={() => {}}
      />,
    )
    // desktop card + fila mobile
    expect(screen.getAllByText("6 · 3")).toHaveLength(2)
  })

  it("CM-014: item degradado muestra '—' y el hub sigue renderizando los 15", () => {
    render(
      <ConfiguracionHubView
        fincaId={FINCA_ID}
        resultado={{ tipo: "resumen", items: itemsDisenio() }}
        onNavegar={() => {}}
        onReintentar={() => {}}
      />,
    )
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1)
    // el conteo compuesto del grupo consolidado incluye el degradado
    expect(screen.getByText("1 · 8 · —")).toBeInTheDocument()
  })

  it("vacío bloqueante muestra 'requerido para {proceso}' como texto", () => {
    render(
      <ConfiguracionHubView
        fincaId={FINCA_ID}
        resultado={{ tipo: "resumen", items: itemsDisenio() }}
        onNavegar={() => {}}
        onReintentar={() => {}}
      />,
    )
    // desktop card + fila mobile
    expect(screen.getAllByText(/Vacío · requerido para Servicios IA/)).toHaveLength(2)
  })

  it("CM-015: click en card navega a maestro.ruta (CRUD de #150)", async () => {
    const user = userEvent.setup()
    const onNavegar = vi.fn()
    render(
      <ConfiguracionHubView
        fincaId={FINCA_ID}
        resultado={{ tipo: "resumen", items: itemsDisenio() }}
        onNavegar={onNavegar}
        onReintentar={() => {}}
      />,
    )
    const cards = screen.getAllByRole("button", { name: /Veterinarios/ })
    await user.click(cards[0])
    expect(onNavegar).toHaveBeenCalledWith(`/fincas/${FINCA_ID}/configuracion/veterinarios`)
  })
})

describe("ConfiguracionHubView — CM-007 (card Predios)", () => {
  function itemsPredioIncompleto(): MaestroResumen[] {
    return itemsDisenio().map((item) =>
      item.id === "predio" ? { ...item, registros: 0, etiquetaVacio: "Incompleto" } : item,
    )
  }

  it("finca completa: la card Predios muestra '1 registro'", () => {
    render(
      <ConfiguracionHubView
        fincaId={FINCA_ID}
        resultado={{ tipo: "resumen", items: itemsDisenio() }}
        onNavegar={() => {}}
        onReintentar={() => {}}
      />,
    )
    // Desktop card (mobile va consolidada en "Predios · Potreros · Sectores").
    expect(screen.getAllByText("1 registro").length).toBeGreaterThanOrEqual(1)
  })

  it("finca incompleta: la card Predios muestra 'Incompleto' en vez de 'Vacío'", () => {
    render(
      <ConfiguracionHubView
        fincaId={FINCA_ID}
        resultado={{ tipo: "resumen", items: itemsPredioIncompleto() }}
        onNavegar={() => {}}
        onReintentar={() => {}}
      />,
    )
    const cardPredios = screen.getByRole("button", { name: /^PrediosIncompleto/ })
    expect(within(cardPredios).getByText("Incompleto")).toBeInTheDocument()
    expect(within(cardPredios).queryByText(/Vacío/)).not.toBeInTheDocument()
  })
})

describe("ConfiguracionHubView — mobile (CM-009/CM-010)", () => {
  it("filas consolidadas con conteo compuesto y globales presentes, en orden del diseño", () => {
    render(
      <ConfiguracionHubView
        fincaId={FINCA_ID}
        resultado={{ tipo: "resumen", items: itemsDisenio() }}
        onNavegar={() => {}}
        onReintentar={() => {}}
      />,
    )
    const nav = screen.getByRole("navigation", { name: "Maestros" })
    const nombresFilas = within(nav)
      .getAllByRole("button")
      .map((boton) => within(boton).getAllByText(/.+/)[0]?.textContent ?? "")
    expect(nombresFilas).toEqual([
      "Veterinarios",
      "Propietarios",
      "Inseminadores",
      "Predios · Potreros · Sectores",
      "Lotes · Grupos",
      "Hierros",
      "Diagnósticos",
      "Motivos de venta",
      "Causas de muerte · Lugares de compra",
      "Razas",
      "Tipos de explotación",
      "Calidades",
    ])
    // conteos compuestos construidos de los miembros
    expect(within(nav).getByText("1 · 8 · —")).toBeInTheDocument()
    expect(within(nav).getByText("5 · 4")).toBeInTheDocument()
  })

  it("S-1: la fila consolidada navega al sub-menú del grupo", async () => {
    const user = userEvent.setup()
    const onNavegar = vi.fn()
    render(
      <ConfiguracionHubView
        fincaId={FINCA_ID}
        resultado={{ tipo: "resumen", items: itemsDisenio() }}
        onNavegar={onNavegar}
        onReintentar={() => {}}
      />,
    )
    await user.click(screen.getByRole("button", { name: /Predios · Potreros · Sectores/ }))
    expect(onNavegar).toHaveBeenCalledWith(`/fincas/${FINCA_ID}/configuracion/grupo/ubicacion`)
  })
})

describe("ConfiguracionHubView — CM-014 (error y skeleton)", () => {
  it("error del loader muestra estado con reintento", async () => {
    const user = userEvent.setup()
    const onReintentar = vi.fn()
    render(
      <ConfiguracionHubView
        fincaId={FINCA_ID}
        resultado={{ tipo: "error" }}
        onNavegar={() => {}}
        onReintentar={onReintentar}
      />,
    )
    expect(screen.getByText("No se pudieron cargar los maestros")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(onReintentar).toHaveBeenCalledTimes(1)
  })

  it("pendingComponent renderiza el skeleton con aria-busy", () => {
    const Skeleton = ConfiguracionRoute.options.pendingComponent
    expect(Skeleton).toBeDefined()
    const { container } = render(<Skeleton />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})

describe("construirFilasMovil — S-1", () => {
  it("reemplaza los miembros consolidados por su fila en la posición del primer miembro", () => {
    const filas = construirFilasMovil(itemsDisenio())
    expect(filas).toHaveLength(12)
    expect(filas[3]).toMatchObject({
      tipo: "consolidada",
      fila: { id: "ubicacion" },
      conteo: "1 · 8 · —",
    })
    expect(filas[8]).toMatchObject({
      tipo: "consolidada",
      fila: { id: "clasificacion-comercial" },
      conteo: "5 · 4",
    })
  })

  it("miembro ausente aporta '—' al conteo compuesto (fail-closed)", () => {
    const items = itemsDisenio().filter((item) => item.id !== "sectores")
    const filas = construirFilasMovil(items)
    const consolidada = filas.find(
      (fila) => fila.tipo === "consolidada" && fila.fila.id === "ubicacion",
    )
    expect(consolidada).toMatchObject({ conteo: "1 · 8 · —" })
  })
})

describe("ConfiguracionGrupoView — sub-menú mobile (S-1)", () => {
  const filaUbicacion = FILAS_CONSOLIDADAS_MOVIL[0]

  it("lista los miembros de la fila consolidada con sus conteos", () => {
    render(
      <ConfiguracionGrupoView
        fincaId={FINCA_ID}
        fila={filaUbicacion}
        resultado={{ tipo: "resumen", items: itemsDisenio() }}
        onNavegar={() => {}}
        onReintentar={() => {}}
      />,
    )
    expect(screen.getByText("Predios · Potreros · Sectores")).toBeInTheDocument()
    const filas = screen.getAllByRole("button")
    // back + 3 miembros
    expect(filas).toHaveLength(4)
    expect(screen.getByText("Predios")).toBeInTheDocument()
    expect(screen.getByText("Potreros")).toBeInTheDocument()
    expect(screen.getByText("Sectores")).toBeInTheDocument()
    // miembro degradado muestra "—"
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("miembrosDeFila preserva el orden de la definición", () => {
    const miembros = miembrosDeFila(filaUbicacion, itemsDisenio())
    expect(miembros.map((m) => m.id)).toEqual(["predio", "potreros", "sectores"])
  })

  it("CM-007: la fila del predio muestra 'Incompleto' si la finca está incompleta", () => {
    render(
      <ConfiguracionGrupoView
        fincaId={FINCA_ID}
        fila={filaUbicacion}
        resultado={{
          tipo: "resumen",
          items: itemsDisenio().map((item) =>
            item.id === "predio" ? { ...item, registros: 0, etiquetaVacio: "Incompleto" } : item,
          ),
        }}
        onNavegar={() => {}}
        onReintentar={() => {}}
      />,
    )
    expect(screen.getByText("Incompleto")).toBeInTheDocument()
  })

  it("back navega al hub", async () => {
    const user = userEvent.setup()
    const onNavegar = vi.fn()
    render(
      <ConfiguracionGrupoView
        fincaId={FINCA_ID}
        fila={filaUbicacion}
        resultado={{ tipo: "resumen", items: itemsDisenio() }}
        onNavegar={onNavegar}
        onReintentar={() => {}}
      />,
    )
    await user.click(screen.getByRole("button", { name: "Volver a Maestros" }))
    expect(onNavegar).toHaveBeenCalledWith(`/fincas/${FINCA_ID}/configuracion`)
  })

  it("error del loader muestra estado con reintento", () => {
    render(
      <ConfiguracionGrupoView
        fincaId={FINCA_ID}
        fila={filaUbicacion}
        resultado={{ tipo: "error" }}
        onNavegar={() => {}}
        onReintentar={() => {}}
      />,
    )
    expect(screen.getByText("No se pudieron cargar los maestros")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument()
  })
})

describe("RBAC — CM-015/CM-021", () => {
  const beforeLoadHub = ConfiguracionRoute.options.beforeLoad as unknown as (opts: {
    context: { sesion: typeof SESION_CON_PERMISO | typeof SESION_SIN_PERMISO }
  }) => void
  const beforeLoadGrupo = GrupoRoute.options.beforeLoad as unknown as (opts: {
    context: { sesion: typeof SESION_CON_PERMISO | typeof SESION_SIN_PERMISO }
    params: { fincaId: string; grupoId: string }
  }) => void
  const loaderHub = ConfiguracionRoute.options.loader as unknown as (opts: {
    params: { fincaId: string }
  }) => Promise<unknown>

  it("puedeVerConfiguracion: solo configuracion:ver pasa", () => {
    expect(puedeVerConfiguracion([{ modulo: "configuracion", accion: "ver" }])).toBe(true)
    expect(puedeVerConfiguracion([{ modulo: "animales", accion: "ver" }])).toBe(false)
    expect(puedeVerConfiguracion([])).toBe(false)
  })

  it("hub: sin configuracion:ver beforeLoad redirige a '/'", () => {
    let capturado: unknown = null
    try {
      beforeLoadHub({ context: { sesion: SESION_SIN_PERMISO } })
    } catch (error) {
      capturado = error
    }
    expect(destinoRedirect(capturado)).toBe("/")
  })

  it("hub: con configuracion:ver beforeLoad no redirige", () => {
    expect(() => beforeLoadHub({ context: { sesion: SESION_CON_PERMISO } })).not.toThrow()
  })

  it("grupo: grupoId desconocido redirige al hub", () => {
    let capturado: unknown = null
    try {
      beforeLoadGrupo({
        context: { sesion: SESION_CON_PERMISO },
        params: { fincaId: FINCA_ID, grupoId: "no-existe" },
      })
    } catch (error) {
      capturado = error
    }
    expect(destinoRedirect(capturado)).toBe(`/fincas/${FINCA_ID}/configuracion`)
  })

  it("grupo: grupoId conocido con permiso no redirige", () => {
    expect(() =>
      beforeLoadGrupo({
        context: { sesion: SESION_CON_PERMISO },
        params: { fincaId: FINCA_ID, grupoId: "ubicacion" },
      }),
    ).not.toThrow()
  })

  it("loader: permiso_denegado redirige a '/'", async () => {
    vi.mocked(resumenMaestrosAction).mockResolvedValueOnce({
      tipo: "permiso_denegado",
      permiso: "configuracion:ver",
    })
    const capturado = await loaderHub({ params: { fincaId: FINCA_ID } }).catch(
      (error: unknown) => error,
    )
    expect(destinoRedirect(capturado)).toBe("/")
  })

  it("loader: finca_no_autorizada redirige a '/'", async () => {
    vi.mocked(resumenMaestrosAction).mockResolvedValueOnce({ tipo: "finca_no_autorizada" })
    const capturado = await loaderHub({ params: { fincaId: FINCA_ID } }).catch(
      (error: unknown) => error,
    )
    expect(destinoRedirect(capturado)).toBe("/")
  })

  it("loader: no_autenticado redirige a '/login'", async () => {
    vi.mocked(resumenMaestrosAction).mockResolvedValueOnce({ tipo: "no_autenticado" })
    const capturado = await loaderHub({ params: { fincaId: FINCA_ID } }).catch(
      (error: unknown) => error,
    )
    expect(destinoRedirect(capturado)).toBe("/login")
  })

  it("loader: fallo RPC devuelve {tipo:'error'} (fail-closed, sin throw)", async () => {
    vi.mocked(resumenMaestrosAction).mockRejectedValueOnce(new Error("rpc caido"))
    const resultado = await loaderHub({ params: { fincaId: FINCA_ID } })
    expect(resultado).toEqual({ tipo: "error" })
  })

  it("MasView: sin configuracion:ver no renderiza el botón Configuración", () => {
    render(
      <MasView
        nombre="Ana"
        email="ana@example.com"
        fincaActivaId={FINCA_ID}
        permisos={[{ modulo: "animales", accion: "ver" }]}
        onNavegarAConfiguracion={() => {}}
        onCerrarSesion={() => {}}
      />,
    )
    expect(screen.queryByRole("button", { name: "Configuración" })).not.toBeInTheDocument()
  })

  it("MasView: con configuracion:ver navega al hub de la finca activa", async () => {
    const user = userEvent.setup()
    const onNavegarAConfiguracion = vi.fn()
    render(
      <MasView
        nombre="Ana"
        email="ana@example.com"
        fincaActivaId={FINCA_ID}
        permisos={[{ modulo: "configuracion", accion: "ver" }]}
        onNavegarAConfiguracion={onNavegarAConfiguracion}
        onCerrarSesion={() => {}}
      />,
    )
    await user.click(screen.getByRole("button", { name: "Configuración" }))
    expect(onNavegarAConfiguracion).toHaveBeenCalledWith(`/fincas/${FINCA_ID}/configuracion`)
  })
})
