// @vitest-environment jsdom

/**
 * Issue #151 — catálogos globales solo lectura (RF-CONFIG-MAESTROS v1.0,
 * CM-025/CM-053/CM-054).
 *
 * Los tres catálogos (Razas, Tipos de explotación, Calidades) se sirven desde
 * la ruta ÚNICA `$maestro.tsx` (issue #152: antes había un `$catalogo.tsx`
 * hermano que sombreaba los CRUD). Cubre:
 * - beforeLoad: gate configuracion:ver + slug desconocido → redirect al hub.
 * - Loader: denials → redirects, fallo RPC → {tipo:"error"}.
 * - Vista: columnas por catálogo (CM-054: razas agrega origen y
 *   tipo_produccion), búsqueda client-side, nota CM-053, estados vacíos y
 *   AUSENCIA total de affordances de escritura (CM-025).
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { FilaCatalogoGlobalConfiguracion } from "@ganaweb/aplicacion"
import { isRedirect } from "@tanstack/react-router"
import {
  CATALOGOS_RUTA,
  ConfiguracionCatalogoView,
  catalogoPorSlug,
  filtrarFilas,
} from "../src/configuracion/catalogo-global.js"
import { Route as CatalogoRoute } from "../src/routes/_app/fincas/$fincaId/configuracion/$maestro.js"
import { listarCatalogoGlobalAction } from "../src/server/configuracion-actions.js"

vi.mock("../src/server/configuracion-actions.js", () => ({
  listarCatalogoGlobalAction: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.mocked(listarCatalogoGlobalAction).mockReset()
})

const FINCA_ID = "f1"

const FILAS_RAZAS: readonly FilaCatalogoGlobalConfiguracion[] = [
  {
    id: "r1",
    nombre: "Holstein",
    descripcion: "Raza lechera",
    origen: "Países Bajos",
    tipoProduccion: "Leche",
  },
  { id: "r2", nombre: "Brahman", descripcion: null, origen: "India", tipoProduccion: "Carne" },
  { id: "r3", nombre: "Cebú", descripcion: null, origen: "India", tipoProduccion: "Carne" },
]

const FILAS_TIPOS: readonly FilaCatalogoGlobalConfiguracion[] = [
  { id: "t1", nombre: "Lechero", descripcion: "Producción de leche" },
  { id: "t2", nombre: "Doble propósito", descripcion: null },
]

const FILAS_CALIDADES: readonly FilaCatalogoGlobalConfiguracion[] = [
  { id: "c1", nombre: "Excelente", descripcion: "Genética superior" },
  { id: "c2", nombre: "Buena", descripcion: null },
]

const SESION_CON_VER = { permisos: [{ modulo: "configuracion", accion: "ver" }] } as const
const SESION_SIN_VER = { permisos: [{ modulo: "animales", accion: "ver" }] } as const

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

const beforeLoadCatalogo = CatalogoRoute.options.beforeLoad as unknown as (opts: {
  context: { sesion: typeof SESION_CON_VER | typeof SESION_SIN_VER }
  params: { fincaId: string; maestro: string }
}) => void
const loaderCatalogo = CatalogoRoute.options.loader as unknown as (opts: {
  params: { fincaId: string; maestro: string }
}) => Promise<unknown>

describe("catálogos — definición (slugs de MAESTROS_HUB)", () => {
  it("expone exactamente los tres catálogos globales con sus slugs", () => {
    expect(CATALOGOS_RUTA.map((item) => item.slug)).toEqual([
      "razas",
      "tipos-explotacion",
      "calidades",
    ])
    expect(catalogoPorSlug("razas")?.catalogo).toBe("razas")
    expect(catalogoPorSlug("tipos-explotacion")?.catalogo).toBe("tiposExplotacion")
    expect(catalogoPorSlug("calidades")?.catalogo).toBe("calidades")
    expect(catalogoPorSlug("veterinarios")).toBeUndefined()
  })
})

describe("catálogos — RBAC y routing", () => {
  it("sin configuracion:ver beforeLoad redirige a '/'", () => {
    let capturado: unknown = null
    try {
      beforeLoadCatalogo({
        context: { sesion: SESION_SIN_VER },
        params: { fincaId: FINCA_ID, maestro: "razas" },
      })
    } catch (error) {
      capturado = error
    }
    expect(destinoRedirect(capturado)).toBe("/")
  })

  it("slug desconocido redirige al hub (fail-closed)", () => {
    let capturado: unknown = null
    try {
      beforeLoadCatalogo({
        context: { sesion: SESION_CON_VER },
        params: { fincaId: FINCA_ID, maestro: "no-existe" },
      })
    } catch (error) {
      capturado = error
    }
    expect(destinoRedirect(capturado)).toBe(`/fincas/${FINCA_ID}/configuracion`)
  })

  it("los tres slugs conocidos con permiso no redirigen", () => {
    for (const { slug } of CATALOGOS_RUTA) {
      expect(() =>
        beforeLoadCatalogo({
          context: { sesion: SESION_CON_VER },
          params: { fincaId: FINCA_ID, maestro: slug },
        }),
      ).not.toThrow()
    }
  })

  it("loader: no_autenticado redirige a '/login'", async () => {
    vi.mocked(listarCatalogoGlobalAction).mockResolvedValueOnce({ tipo: "no_autenticado" })
    const capturado = await loaderCatalogo({
      params: { fincaId: FINCA_ID, maestro: "razas" },
    }).catch((error: unknown) => error)
    expect(destinoRedirect(capturado)).toBe("/login")
  })

  it("loader: finca_no_autorizada redirige a '/'", async () => {
    vi.mocked(listarCatalogoGlobalAction).mockResolvedValueOnce({ tipo: "finca_no_autorizada" })
    const capturado = await loaderCatalogo({
      params: { fincaId: FINCA_ID, maestro: "razas" },
    }).catch((error: unknown) => error)
    expect(destinoRedirect(capturado)).toBe("/")
  })

  it("loader: fallo RPC devuelve {tipo:'error'} (fail-closed)", async () => {
    vi.mocked(listarCatalogoGlobalAction).mockRejectedValueOnce(new Error("rpc caido"))
    const resultado = await loaderCatalogo({ params: { fincaId: FINCA_ID, maestro: "razas" } })
    expect(resultado).toEqual({ tipo: "error" })
  })

  it("loader: lista pasa 1:1 con las filas del catálogo", async () => {
    vi.mocked(listarCatalogoGlobalAction).mockResolvedValueOnce({
      tipo: "lista",
      filas: FILAS_RAZAS,
    })
    const resultado = await loaderCatalogo({ params: { fincaId: FINCA_ID, maestro: "razas" } })
    expect(resultado).toEqual({ tipo: "lista", filas: FILAS_RAZAS })
    expect(vi.mocked(listarCatalogoGlobalAction)).toHaveBeenCalledWith({
      data: { catalogo: "razas" },
    })
  })
})

describe("catálogos — vista razas (CM-054)", () => {
  const definicionRazas = catalogoPorSlug("razas")
  if (!definicionRazas) throw new Error("definicion razas ausente")

  function renderRazas(props: Partial<Parameters<typeof ConfiguracionCatalogoView>[0]> = {}) {
    return render(
      <ConfiguracionCatalogoView
        fincaId={FINCA_ID}
        definicion={definicionRazas}
        resultado={{ tipo: "lista", filas: FILAS_RAZAS }}
        onNavegar={() => {}}
        onReintentar={() => {}}
        {...props}
      />,
    )
  }

  it("muestra nombre, descripcion, origen y tipo de producción", () => {
    renderRazas()
    expect(screen.getByText("Razas")).toBeInTheDocument()
    expect(screen.getAllByText("Holstein").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Raza lechera").length).toBeGreaterThanOrEqual(1)
    // Columnas secundarias CM-054 (desktop header + mobile etiquetas).
    expect(screen.getAllByText(/Origen/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Tipo de producción/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Países Bajos").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Leche").length).toBeGreaterThanOrEqual(1)
  })

  it("CM-053: nota de catálogo global gestionado por la administración", () => {
    renderRazas()
    expect(
      screen.getByText("Catálogo global gestionado por la administración de GanaWeb."),
    ).toBeInTheDocument()
  })

  it("CM-025: ausencia total de affordances de escritura", () => {
    renderRazas()
    const botones = screen.getAllByRole("button")
    // Único botón: volver al hub. Las filas NO son botones.
    expect(botones).toHaveLength(1)
    expect(botones[0]).toHaveAttribute("aria-label", "Volver a Configuración")
    expect(
      screen.queryByRole("button", { name: /Crear|Nuevo|Editar|Eliminar|Inactivar/ }),
    ).toBeNull()
  })

  it("la búsqueda filtra client-side (insensible a diacríticos)", async () => {
    const user = userEvent.setup()
    renderRazas()
    const buscador = screen.getByLabelText(/Buscar en Razas/)
    await user.type(buscador, "bra")
    expect(screen.getAllByText("Brahman").length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText("Holstein")).not.toBeInTheDocument()

    await user.clear(buscador)
    await user.type(buscador, "cebu") // sin tilde → matchea "Cebú"
    expect(screen.getAllByText("Cebú").length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText("Brahman")).not.toBeInTheDocument()
  })

  it("búsqueda sin coincidencias muestra estado vacío", async () => {
    const user = userEvent.setup()
    renderRazas()
    await user.type(screen.getByLabelText(/Buscar en Razas/), "noexiste")
    expect(screen.getByText("Sin resultados")).toBeInTheDocument()
  })

  it("catálogo sin filas muestra estado vacío", () => {
    renderRazas({ resultado: { tipo: "lista", filas: [] } })
    expect(screen.getByText("Sin registros")).toBeInTheDocument()
  })

  it("resultado error muestra estado con reintento", async () => {
    const user = userEvent.setup()
    const onReintentar = vi.fn()
    renderRazas({ resultado: { tipo: "error" }, onReintentar })
    expect(screen.getByText("No se pudo cargar el catálogo")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(onReintentar).toHaveBeenCalledTimes(1)
  })
})

describe("catálogos — vista tipos de explotación y calidades (CM-054)", () => {
  it("tipos de explotación: solo nombre y descripcion (sin columnas de raza)", () => {
    const definicion = catalogoPorSlug("tipos-explotacion")
    if (!definicion) throw new Error("definicion tipos-explotacion ausente")
    render(
      <ConfiguracionCatalogoView
        fincaId={FINCA_ID}
        definicion={definicion}
        resultado={{ tipo: "lista", filas: FILAS_TIPOS }}
        onNavegar={() => {}}
        onReintentar={() => {}}
      />,
    )
    expect(screen.getByText("Tipos de explotación")).toBeInTheDocument()
    expect(screen.getAllByText("Lechero").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Producción de leche").length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText("Origen")).not.toBeInTheDocument()
    expect(screen.queryByText("Tipo de producción")).not.toBeInTheDocument()
  })

  it("calidades: solo nombre y descripcion", () => {
    const definicion = catalogoPorSlug("calidades")
    if (!definicion) throw new Error("definicion calidades ausente")
    render(
      <ConfiguracionCatalogoView
        fincaId={FINCA_ID}
        definicion={definicion}
        resultado={{ tipo: "lista", filas: FILAS_CALIDADES }}
        onNavegar={() => {}}
        onReintentar={() => {}}
      />,
    )
    expect(screen.getByText("Calidades")).toBeInTheDocument()
    expect(screen.getAllByText("Excelente").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Genética superior").length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText("Origen")).not.toBeInTheDocument()
  })
})

describe("filtrarFilas — búsqueda insensible", () => {
  it("vacío devuelve todas las filas; consulta matchea nombre y descripcion", () => {
    expect(filtrarFilas(FILAS_RAZAS, "  ")).toEqual(FILAS_RAZAS)
    expect(filtrarFilas(FILAS_RAZAS, "holstein").map((fila) => fila.id)).toEqual(["r1"])
    // descripcion "Raza lechera" también participa en la búsqueda.
    expect(filtrarFilas(FILAS_RAZAS, "lecher").map((fila) => fila.id)).toEqual(["r1"])
    // sin diacríticos y en mayúsculas matchea el nombre "Cebú".
    expect(filtrarFilas(FILAS_RAZAS, "CEBU").map((fila) => fila.id)).toEqual(["r3"])
    expect(filtrarFilas(FILAS_RAZAS, "noexiste")).toEqual([])
  })
})
