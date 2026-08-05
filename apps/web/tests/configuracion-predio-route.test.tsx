// @vitest-environment jsdom

/**
 * Issue #151 — vista del predio (RF-CONFIG-MAESTROS v1.0, CM-050/CM-051).
 *
 * Cubre:
 * - Loader: datos de la finca + tipos de explotación, denials → redirects,
 *   fallo RPC → {tipo:"error"}, fail-closed del catálogo de tipos.
 * - Vista: codigo SOLO lectura, campos precargados, guardar feliz (toast +
 *   invalidate), errores de campo desde `validacion`, modo solo lectura sin
 *   `configuracion:editar` (sin botón guardar), estados error/no_encontrado.
 * - CM-051: ausencia total de affordances de crear/borrar finca.
 *
 * Patrón de la casa: la vista se prueba vía `ConfiguracionPredioView` con
 * loader data pineada por props; beforeLoad/loader se invocan directamente
 * (sin runtime de TanStack Start).
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import type { DatosBasicosFinca } from "@ganaweb/aplicacion"
import { toast } from "@ganaweb/ui"
import { isRedirect } from "@tanstack/react-router"
import {
  ConfiguracionPredioView,
  Route as PredioRoute,
} from "../src/routes/_app/fincas/$fincaId/configuracion/predio.js"
import {
  editarFincaAction,
  listarCatalogoGlobalAction,
  obtenerDatosFincaAction,
} from "../src/server/configuracion-actions.js"

vi.mock("../src/server/configuracion-actions.js", () => ({
  obtenerDatosFincaAction: vi.fn(),
  listarCatalogoGlobalAction: vi.fn(),
  editarFincaAction: vi.fn(),
}))

// Spy de toast sin tumbar el resto del barrel de @ganaweb/ui.
vi.mock("@ganaweb/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ganaweb/ui")>()
  return { ...actual, toast: vi.fn() }
})

beforeAll(() => {
  // Radix Select necesita estas APIs que jsdom no implementa.
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
  vi.mocked(obtenerDatosFincaAction).mockReset()
  vi.mocked(listarCatalogoGlobalAction).mockReset()
  vi.mocked(editarFincaAction).mockReset()
  vi.mocked(toast).mockReset()
})

// El loader SIEMPRE espera una promesa del catálogo de tipos (en producción
// nunca devuelve undefined); default feliz para los tests que no lo pinean.
beforeEach(() => {
  vi.mocked(listarCatalogoGlobalAction).mockResolvedValue({ tipo: "lista", filas: [] })
})

const FINCA_ID = "f1"

const DATOS_FINCA: DatosBasicosFinca = {
  codigo: "FIN001",
  nombre: "Finca La Esperanza",
  departamento: "Antioquia",
  municipio: "Yarumal",
  vereda: "El Silencio",
  areaHectareas: 42.5,
  capacidadMaxima: 100,
  tipoExplotacionId: "tipo-2",
}

const TIPOS_EXPLOTACION = [
  { id: "tipo-1", nombre: "Lechero", descripcion: null },
  { id: "tipo-2", nombre: "Doble propósito", descripcion: null },
] as const

function loaderOk(overrides: Record<string, unknown> = {}) {
  return {
    tipo: "ok" as const,
    datos: DATOS_FINCA,
    tiposExplotacion: [...TIPOS_EXPLOTACION],
    puedeEditar: true,
    ...overrides,
  }
}

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

const beforeLoadPredio = PredioRoute.options.beforeLoad as unknown as (opts: {
  context: { sesion: typeof SESION_CON_VER | typeof SESION_SIN_VER }
}) => void
const loaderPredio = PredioRoute.options.loader as unknown as (opts: {
  params: { fincaId: string }
  context: { sesion: { permisos: readonly { modulo: string; accion: string }[] } }
}) => Promise<unknown>

describe("predio — RBAC (CM-021/CM-050)", () => {
  it("sin configuracion:ver beforeLoad redirige a '/'", () => {
    let capturado: unknown = null
    try {
      beforeLoadPredio({ context: { sesion: SESION_SIN_VER } })
    } catch (error) {
      capturado = error
    }
    expect(destinoRedirect(capturado)).toBe("/")
  })

  it("con configuracion:ver beforeLoad no redirige", () => {
    expect(() => beforeLoadPredio({ context: { sesion: SESION_CON_VER } })).not.toThrow()
  })

  it("loader: no_autenticado redirige a '/login'", async () => {
    vi.mocked(obtenerDatosFincaAction).mockResolvedValueOnce({ tipo: "no_autenticado" })
    const capturado = await loaderPredio({
      params: { fincaId: FINCA_ID },
      context: { sesion: { permisos: [] } },
    }).catch((error: unknown) => error)
    expect(destinoRedirect(capturado)).toBe("/login")
  })

  it("loader: finca_no_autorizada redirige a '/'", async () => {
    vi.mocked(obtenerDatosFincaAction).mockResolvedValueOnce({ tipo: "finca_no_autorizada" })
    const capturado = await loaderPredio({
      params: { fincaId: FINCA_ID },
      context: { sesion: { permisos: [] } },
    }).catch((error: unknown) => error)
    expect(destinoRedirect(capturado)).toBe("/")
  })

  it("loader: permiso_denegado redirige a '/'", async () => {
    vi.mocked(obtenerDatosFincaAction).mockResolvedValueOnce({
      tipo: "permiso_denegado",
      permiso: "configuracion:ver",
    })
    const capturado = await loaderPredio({
      params: { fincaId: FINCA_ID },
      context: { sesion: { permisos: [] } },
    }).catch((error: unknown) => error)
    expect(destinoRedirect(capturado)).toBe("/")
  })
})

describe("predio — loader (CM-050)", () => {
  it("devuelve datos + tipos + puedeEditar cuando tiene configuracion:editar", async () => {
    vi.mocked(obtenerDatosFincaAction).mockResolvedValueOnce({
      tipo: "finca",
      datos: DATOS_FINCA,
    })
    vi.mocked(listarCatalogoGlobalAction).mockResolvedValueOnce({
      tipo: "lista",
      filas: [...TIPOS_EXPLOTACION],
    })
    const resultado = await loaderPredio({
      params: { fincaId: FINCA_ID },
      context: {
        sesion: {
          permisos: [
            { modulo: "configuracion", accion: "ver" },
            { modulo: "configuracion", accion: "editar" },
          ],
        },
      },
    })
    expect(resultado).toEqual(loaderOk())
    expect(vi.mocked(listarCatalogoGlobalAction)).toHaveBeenCalledWith({
      data: { catalogo: "tiposExplotacion" },
    })
  })

  it("sin configuracion:editar devuelve puedeEditar false (solo lectura)", async () => {
    vi.mocked(obtenerDatosFincaAction).mockResolvedValueOnce({
      tipo: "finca",
      datos: DATOS_FINCA,
    })
    vi.mocked(listarCatalogoGlobalAction).mockResolvedValueOnce({
      tipo: "lista",
      filas: [...TIPOS_EXPLOTACION],
    })
    const resultado = await loaderPredio({
      params: { fincaId: FINCA_ID },
      context: { sesion: { permisos: [{ modulo: "configuracion", accion: "ver" }] } },
    })
    expect(resultado).toMatchObject({ tipo: "ok", puedeEditar: false })
  })

  it("no_encontrado pasa 1:1 al resultado del loader", async () => {
    vi.mocked(obtenerDatosFincaAction).mockResolvedValueOnce({ tipo: "no_encontrado" })
    vi.mocked(listarCatalogoGlobalAction).mockResolvedValueOnce({ tipo: "lista", filas: [] })
    const resultado = await loaderPredio({
      params: { fincaId: FINCA_ID },
      context: { sesion: { permisos: [] } },
    })
    expect(resultado).toEqual({ tipo: "no_encontrado" })
  })

  it("fallo RPC de obtenerDatosFincaAction devuelve {tipo:'error'} (fail-closed)", async () => {
    vi.mocked(obtenerDatosFincaAction).mockRejectedValueOnce(new Error("rpc caido"))
    vi.mocked(listarCatalogoGlobalAction).mockResolvedValueOnce({ tipo: "lista", filas: [] })
    const resultado = await loaderPredio({
      params: { fincaId: FINCA_ID },
      context: { sesion: { permisos: [] } },
    })
    expect(resultado).toEqual({ tipo: "error" })
  })

  it("fallo del catálogo de tipos degrada a opciones vacías (fail-closed)", async () => {
    vi.mocked(obtenerDatosFincaAction).mockResolvedValueOnce({
      tipo: "finca",
      datos: DATOS_FINCA,
    })
    vi.mocked(listarCatalogoGlobalAction).mockRejectedValueOnce(new Error("rpc caido"))
    const resultado = await loaderPredio({
      params: { fincaId: FINCA_ID },
      context: { sesion: { permisos: [] } },
    })
    expect(resultado).toMatchObject({ tipo: "ok", tiposExplotacion: [] })
  })
})

describe("predio — vista (CM-050)", () => {
  it("renderiza codigo SOLO lectura y los campos precargados", () => {
    render(
      <ConfiguracionPredioView
        fincaId={FINCA_ID}
        resultado={loaderOk()}
        onNavegar={() => {}}
        onReintentar={() => {}}
        onGuardar={vi.fn()}
        onGuardado={() => {}}
      />,
    )
    const codigo = screen.getByLabelText("Código") as HTMLInputElement
    expect(codigo).toHaveAttribute("readonly")
    expect(codigo.value).toBe("FIN001")
    expect(screen.getByText("El código de la finca no se edita.")).toBeInTheDocument()

    expect((screen.getByLabelText(/Nombre/) as HTMLInputElement).value).toBe("Finca La Esperanza")
    expect((screen.getByLabelText("Departamento") as HTMLInputElement).value).toBe("Antioquia")
    expect((screen.getByLabelText("Municipio") as HTMLInputElement).value).toBe("Yarumal")
    expect((screen.getByLabelText("Vereda") as HTMLInputElement).value).toBe("El Silencio")
    expect((screen.getByLabelText("Área (ha)") as HTMLInputElement).value).toBe("42.5")
    expect((screen.getByLabelText("Capacidad máxima") as HTMLInputElement).value).toBe("100")
  })

  it("el select de tipo de explotación ofrece el catálogo global", async () => {
    const user = userEvent.setup()
    render(
      <ConfiguracionPredioView
        fincaId={FINCA_ID}
        resultado={loaderOk()}
        onNavegar={() => {}}
        onReintentar={() => {}}
        onGuardar={vi.fn()}
        onGuardado={() => {}}
      />,
    )
    const trigger = screen.getByLabelText("Tipo de explotación")
    await user.click(trigger)
    const listbox = await screen.findByRole("listbox")
    expect(within(listbox).getByText("Lechero")).toBeInTheDocument()
    expect(within(listbox).getByText("Doble propósito")).toBeInTheDocument()
    expect(within(listbox).getByText("Sin tipo de explotación")).toBeInTheDocument()
  })

  it("guardar feliz: envía los datos, muestra toast e invalida", async () => {
    const user = userEvent.setup()
    const onGuardar = vi.fn().mockResolvedValue({ tipo: "actualizado" })
    const onGuardado = vi.fn()
    render(
      <ConfiguracionPredioView
        fincaId={FINCA_ID}
        resultado={loaderOk()}
        onNavegar={() => {}}
        onReintentar={() => {}}
        onGuardar={onGuardar}
        onGuardado={onGuardado}
      />,
    )

    const nombre = screen.getByLabelText(/Nombre/)
    await user.clear(nombre)
    await user.type(nombre, "Finca El Recreo")
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }))

    expect(onGuardar).toHaveBeenCalledWith({
      nombre: "Finca El Recreo",
      departamento: "Antioquia",
      municipio: "Yarumal",
      vereda: "El Silencio",
      area_hectareas: 42.5,
      capacidad_maxima: 100,
      tipo_explotacion_id: "tipo-2",
    })
    expect(vi.mocked(toast)).toHaveBeenCalledWith({ title: "Finca actualizada" })
    expect(onGuardado).toHaveBeenCalledTimes(1)
  })

  it("campos vacíos viajan como null (semántica de campos presentes)", async () => {
    const user = userEvent.setup()
    const onGuardar = vi.fn().mockResolvedValue({ tipo: "actualizado" })
    render(
      <ConfiguracionPredioView
        fincaId={FINCA_ID}
        resultado={loaderOk()}
        onNavegar={() => {}}
        onReintentar={() => {}}
        onGuardar={onGuardar}
        onGuardado={() => {}}
      />,
    )
    await user.clear(screen.getByLabelText("Vereda"))
    await user.clear(screen.getByLabelText("Área (ha)"))
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }))
    expect(onGuardar).toHaveBeenCalledWith(
      expect.objectContaining({ vereda: "", area_hectareas: null }),
    )
  })

  it("errores de validacion se mapean a errores de campo (CM-050)", async () => {
    const user = userEvent.setup()
    const onGuardar = vi.fn().mockResolvedValue({
      tipo: "validacion",
      errores: [{ campo: "nombre", detalle: "El nombre es obligatorio.", regla: "CM-050" }],
    })
    const onGuardado = vi.fn()
    render(
      <ConfiguracionPredioView
        fincaId={FINCA_ID}
        resultado={loaderOk()}
        onNavegar={() => {}}
        onReintentar={() => {}}
        onGuardar={onGuardar}
        onGuardado={onGuardado}
      />,
    )
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }))
    expect(screen.getByText("El nombre es obligatorio.")).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre/)).toHaveAttribute("aria-invalid", "true")
    expect(onGuardado).not.toHaveBeenCalled()
    expect(vi.mocked(toast)).not.toHaveBeenCalled()
  })

  it("sin configuracion:editar: solo lectura, sin botón guardar (CM-050)", () => {
    render(
      <ConfiguracionPredioView
        fincaId={FINCA_ID}
        resultado={loaderOk({ puedeEditar: false })}
        onNavegar={() => {}}
        onReintentar={() => {}}
        onGuardar={vi.fn()}
        onGuardado={() => {}}
      />,
    )
    expect(
      screen.getByText("No tienes permiso para editar los datos de la finca."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Guardar/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre/)).toBeDisabled()
    expect(screen.getByLabelText("Departamento")).toBeDisabled()
    expect(screen.getByLabelText("Tipo de explotación")).toBeDisabled()
  })

  it("CM-051: no hay affordances de crear ni borrar finca", () => {
    render(
      <ConfiguracionPredioView
        fincaId={FINCA_ID}
        resultado={loaderOk()}
        onNavegar={() => {}}
        onReintentar={() => {}}
        onGuardar={vi.fn()}
        onGuardado={() => {}}
      />,
    )
    // Solo el back del header + guardar.
    expect(screen.getAllByRole("button")).toHaveLength(2)
    expect(screen.queryByRole("button", { name: /Crear|Nueva|Eliminar|Borrar/ })).toBeNull()
  })

  it("resultado error muestra estado con reintento", async () => {
    const user = userEvent.setup()
    const onReintentar = vi.fn()
    render(
      <ConfiguracionPredioView
        fincaId={FINCA_ID}
        resultado={{ tipo: "error" }}
        onNavegar={() => {}}
        onReintentar={onReintentar}
        onGuardar={vi.fn()}
        onGuardado={() => {}}
      />,
    )
    expect(screen.getByText("No se pudieron cargar los datos de la finca")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(onReintentar).toHaveBeenCalledTimes(1)
  })

  it("resultado no_encontrado muestra estado con vuelta al hub", async () => {
    const user = userEvent.setup()
    const onNavegar = vi.fn()
    render(
      <ConfiguracionPredioView
        fincaId={FINCA_ID}
        resultado={{ tipo: "no_encontrado" }}
        onNavegar={onNavegar}
        onReintentar={() => {}}
        onGuardar={vi.fn()}
        onGuardado={() => {}}
      />,
    )
    expect(screen.getByText("No se encontró la finca")).toBeInTheDocument()
    // Back del header y acción del EmptyState comparten nombre; la acción es
    // la última en el DOM.
    const acciones = screen.getAllByRole("button", { name: "Volver a Configuración" })
    await user.click(acciones[acciones.length - 1])
    expect(onNavegar).toHaveBeenCalledWith(`/fincas/${FINCA_ID}/configuracion`)
  })
})
