// @vitest-environment jsdom

/**
 * Issue #150 — CRUD genérico de maestros (RF-CONFIG-MAESTROS v1.0).
 *
 * Cubre:
 * - Tabla (CM-033): columnas nombre/código + estado + acciones; orden del
 *   servidor; filas mobile.
 * - Búsqueda (CM-034/S-2): client-side con total ≤ 50, en servidor con
 *   total > 50 (decisión documentada en maestro-crud.tsx).
 * - Toggle inactivos (CM-036) con badge neutral; estado vacío (CM-038);
 *   nota de integridad (CM-046); paginación 25/página sólo si total ≥ 100
 *   (CM-037/S-2).
 * - Tabs Lotes · Grupos (CM-035): una ruta, dos tabs, cada una con "+ Nuevo".
 * - Formulario (CM-039/CM-040/CM-041/CM-032): crear feliz (toast + cierre +
 *   refresh), errores de campo desde `validacion`, conflicto codigo, editar
 *   titula "Editar {nombre}", cierre con cambios pide confirmación.
 * - Inactivar/Activar (CM-044/CM-045) con copy del requisito y SIN botón de
 *   eliminar (RN-050).
 * - RBAC (CM-021/CM-022): gating de botones y redirects de ruta.
 *
 * Patrón de la casa: vistas exportadas con props pineadas; los redirects se
 * prueban invocando `Route.options.beforeLoad/loader` directamente.
 */

import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { isRedirect } from "@tanstack/react-router"

import type { MaestroFila } from "@ganaweb/aplicacion"
import {
  MaestroCrudView,
  type MaestroCrudViewProps,
  type MaestroListadoDatos,
  PAGE_SIZE_COMPLETO,
  PAGE_SIZE_PAGINA,
  UMBRAL_BUSQUEDA_SERVIDOR,
  UMBRAL_PAGINACION,
  filtrarFilasBusqueda,
} from "../src/configuracion/maestro-crud.js"
import { Route as MaestroRoute } from "../src/routes/_app/fincas/$fincaId/configuracion/$maestro.js"

const listarMock = vi.fn()
const crearMock = vi.fn()
const editarMock = vi.fn()
const cambiarEstadoMock = vi.fn()

vi.mock("../src/server/configuracion-actions.js", () => ({
  listarMaestroAction: (input: unknown) => listarMock(input),
  crearMaestroAction: (input: unknown) => crearMock(input),
  editarMaestroAction: (input: unknown) => editarMock(input),
  cambiarEstadoMaestroAction: (input: unknown) => cambiarEstadoMock(input),
}))

beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true, // desktop: el panel usa la rama Dialog
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  }
  if (typeof globalThis.ResizeObserver === "undefined") {
    class ResizeObserverPolyfill {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as unknown as { ResizeObserver: typeof ResizeObserverPolyfill }).ResizeObserver =
      ResizeObserverPolyfill
  }
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
  listarMock.mockReset()
  crearMock.mockReset()
  editarMock.mockReset()
  cambiarEstadoMock.mockReset()
})

const FINCA_ID = "f1"

function fila(id: string, nombre: string, extra: Record<string, string | number | null> = {}) {
  return { id, nombre, activo: 1, ...extra } as MaestroFila
}

function lista(
  filas: readonly MaestroFila[],
  overrides: Partial<MaestroListadoDatos> = {},
): MaestroListadoDatos {
  return {
    filas,
    total: filas.length,
    pagina: 1,
    pageSize: PAGE_SIZE_COMPLETO,
    ...overrides,
  }
}

function renderView(overrides: Partial<MaestroCrudViewProps> = {}) {
  const props: MaestroCrudViewProps = {
    fincaId: FINCA_ID,
    slug: "veterinarios",
    nombreMaestro: "Veterinarios",
    singular: "veterinario",
    permisos: { crear: true, editar: true, inactivar: true },
    resultado: { tipo: "lista", ...lista([]) },
    onRefrescar: vi.fn(),
    onVolver: vi.fn(),
    debounceBusquedaMs: 0,
    ...overrides,
  }
  const view = render(<MaestroCrudView {...props} />)
  return { props, ...view }
}

type RedirectResponse = Response & { options: { to?: string } }

function destinoRedirect(valor: unknown): string | null {
  if (!isRedirect(valor)) return null
  return (valor as RedirectResponse).options.to ?? null
}

describe("Tabla desktop (CM-033)", () => {
  it("columnas nombre + estado + acciones, en el orden que viene del servidor", () => {
    renderView({
      slug: "diagnosticos",
      nombreMaestro: "Diagnósticos",
      singular: "diagnóstico",
      resultado: {
        tipo: "lista",
        ...lista([fila("d1", "Brucelosis"), fila("d2", "Anaplasmosis")]),
      },
    })
    const tabla = screen.getByRole("table")
    const headers = within(tabla)
      .getAllByRole("columnheader")
      .map((th) => th.textContent)
    expect(headers).toEqual(["Nombre", "Estado", "Acciones"])
    const filas = within(tabla).getAllByRole("row").slice(1)
    expect(filas).toHaveLength(2)
    // El orden es el del servidor (nombre asc); la vista no re-ordena.
    expect(within(filas[0]).getByText("Brucelosis")).toBeInTheDocument()
    expect(within(filas[1]).getByText("Anaplasmosis")).toBeInTheDocument()
    expect(within(filas[0]).getByText("Activo")).toBeInTheDocument()
    expect(within(filas[0]).getByRole("button", { name: "Editar Brucelosis" })).toBeInTheDocument()
    expect(
      within(filas[0]).getByRole("button", { name: "Inactivar Brucelosis" }),
    ).toBeInTheDocument()
  })

  it("potreros muestra la columna Código junto al nombre", () => {
    renderView({
      slug: "potreros",
      nombreMaestro: "Potreros",
      singular: "potrero",
      resultado: { tipo: "lista", ...lista([fila("p1", "La Manga", { codigo: "P-01" })]) },
    })
    const tabla = screen.getByRole("table")
    const headers = within(tabla)
      .getAllByRole("columnheader")
      .map((th) => th.textContent)
    expect(headers).toEqual(["Nombre", "Código", "Estado", "Acciones"])
    expect(within(tabla).getByText("P-01")).toBeInTheDocument()
  })

  it("RN-050: nunca hay botón de eliminar", () => {
    renderView({
      resultado: { tipo: "lista", ...lista([fila("v1", "Ana")]) },
    })
    const botones = screen.getAllByRole("button")
    for (const boton of botones) {
      expect(boton.textContent ?? "").not.toMatch(/eliminar/i)
      expect(boton.getAttribute("aria-label") ?? "").not.toMatch(/eliminar/i)
    }
  })
})

describe("Búsqueda (CM-034, decisión S-2)", () => {
  it("client-side cuando total ≤ 50: filtra sin llamar al servidor", async () => {
    const user = userEvent.setup()
    renderView({
      resultado: {
        tipo: "lista",
        ...lista([fila("v1", "Ángel Pérez"), fila("v2", "Beatriz López")]),
      },
    })
    await user.type(screen.getByLabelText("Buscar en veterinarios"), "angel")
    // Búsqueda sin acentos ni mayúsculas. Cada fila existe en la tabla
    // desktop Y en la lista mobile (CSS conmuta), por eso getAll*.
    expect(screen.getAllByText("Ángel Pérez").length).toBeGreaterThanOrEqual(1)
    expect(screen.queryAllByText("Beatriz López")).toHaveLength(0)
    expect(listarMock).not.toHaveBeenCalled()
  })

  it("en servidor cuando total > 50: llama a listarMaestroAction con busqueda", async () => {
    const user = userEvent.setup()
    const filas = Array.from({ length: 60 }, (_, i) => fila(`v${i}`, `Veterinario ${i}`))
    listarMock.mockImplementation(async (input: { data: { opciones?: { pagina?: number } } }) => ({
      tipo: "lista",
      filas: filas.slice(0, 5),
      total: 60,
      pagina: input.data.opciones?.pagina ?? 1,
      pageSize: 100,
    }))
    renderView({
      resultado: { tipo: "lista", filas, total: 60, pagina: 1, pageSize: 100 },
    })
    await user.type(screen.getByLabelText("Buscar en veterinarios"), "veterinario 3")
    await waitFor(() => {
      expect(listarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            maestro: "veterinarios",
            opciones: expect.objectContaining({ busqueda: "veterinario 3" }),
          }),
        }),
      )
    })
  })

  it("filtrarFilasBusqueda ignora acentos y mayúsculas", () => {
    const filas = [fila("1", "Diagnóstico"), fila("2", "Otro")]
    expect(filtrarFilasBusqueda(filas, "diagnostico", ["nombre"])).toHaveLength(1)
    expect(filtrarFilasBusqueda(filas, "", ["nombre"])).toHaveLength(2)
  })
})

describe("Toggle inactivos (CM-036)", () => {
  it("por defecto sólo activos; al activarlo consulta con incluirInactivos y muestra badge Inactivo", async () => {
    const user = userEvent.setup()
    listarMock.mockResolvedValue({
      tipo: "lista",
      filas: [fila("v1", "Ana"), { ...fila("v2", "Bruno"), activo: 0 }],
      total: 2,
      pagina: 1,
      pageSize: 100,
    })
    renderView({
      resultado: { tipo: "lista", ...lista([fila("v1", "Ana")]) },
    })
    expect(screen.queryAllByText("Inactivo")).toHaveLength(0)
    await user.click(screen.getByLabelText("Mostrar inactivos"))
    await waitFor(() => {
      expect(listarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            opciones: expect.objectContaining({ incluirInactivos: true }),
          }),
        }),
      )
    })
    await screen.findAllByText("Inactivo")
    expect(screen.getAllByText("Inactivo").length).toBeGreaterThanOrEqual(1)
  })
})

describe("Estado vacío (CM-038) y nota de integridad (CM-046)", () => {
  it("vacío con copy del requisito y CTA que abre el panel de creación", async () => {
    const user = userEvent.setup()
    renderView()
    expect(screen.getByText("Aún no hay veterinarios.")).toBeInTheDocument()
    expect(screen.getByText("Crea el primero.")).toBeInTheDocument()
    const cta = screen.getAllByRole("button", { name: "+ Nuevo" })
    expect(cta.length).toBeGreaterThanOrEqual(1)
    await user.click(cta[0])
    expect(await screen.findByText("Nuevo veterinario")).toBeInTheDocument()
  })

  it("nota bajo la tabla: los registros usados en eventos se inactivan", () => {
    renderView({
      resultado: { tipo: "lista", ...lista([fila("v1", "Ana")]) },
    })
    expect(
      screen.getByText("Los registros usados en eventos no se eliminan: se inactivan."),
    ).toBeInTheDocument()
  })
})

describe("Paginación (CM-037/S-2)", () => {
  const filasPagina = Array.from({ length: 25 }, (_, i) => fila(`v${i}`, `V ${i}`))

  it("con total ≥ 100 aparecen controles 25/página y la llamada usa pagina/pageSize", async () => {
    const user = userEvent.setup()
    listarMock.mockImplementation(
      async (input: { data: { opciones?: { pagina?: number; pageSize?: number } } }) => ({
        tipo: "lista",
        filas: filasPagina,
        total: 120,
        pagina: input.data.opciones?.pagina ?? 1,
        pageSize: input.data.opciones?.pageSize ?? PAGE_SIZE_PAGINA,
      }),
    )
    renderView({
      resultado: { tipo: "lista", filas: filasPagina, total: 120, pagina: 1, pageSize: 25 },
    })
    const nav = screen.getByRole("navigation", { name: "Paginación" })
    expect(within(nav).getByText("Página 1 de 5")).toBeInTheDocument()
    await user.click(within(nav).getByRole("button", { name: "Siguiente" }))
    await waitFor(() => {
      expect(listarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            opciones: expect.objectContaining({ pagina: 2, pageSize: PAGE_SIZE_PAGINA }),
          }),
        }),
      )
    })
  })

  it("con total < 100 no hay controles de paginación", () => {
    renderView({
      resultado: { tipo: "lista", ...lista([fila("v1", "Ana")]) },
    })
    expect(screen.queryByRole("navigation", { name: "Paginación" })).not.toBeInTheDocument()
  })
})

describe("Tabs Lotes · Grupos (CM-035)", () => {
  it("una ruta con dos tabs; cada tab lista su maestro y tiene '+ Nuevo'", async () => {
    const user = userEvent.setup()
    listarMock.mockResolvedValue({
      tipo: "lista",
      filas: [fila("g1", "Grupo Levante")],
      total: 1,
      pagina: 1,
      pageSize: 100,
    })
    renderView({
      slug: "lotes-grupos",
      nombreMaestro: "Lotes · Grupos",
      singular: "lote",
      resultado: { tipo: "lista", ...lista([fila("l1", "Lote Norte")]) },
    })
    const tablist = screen.getByRole("tablist", { name: "Lotes y grupos" })
    const tabs = within(tablist).getAllByRole("tab")
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Lotes", "Grupos"])
    // Tab Lotes activa por defecto (semilla del loader). Cada fila se
    // renderiza en la tabla desktop y en la lista mobile.
    const panelLotesPorId = document.getElementById("panel-lotes")
    expect(panelLotesPorId).not.toBeNull()
    expect(
      within(panelLotesPorId as HTMLElement).getAllByText("Lote Norte").length,
    ).toBeGreaterThanOrEqual(1)
    expect(
      within(panelLotesPorId as HTMLElement).getAllByRole("button", { name: "+ Nuevo" }).length,
    ).toBeGreaterThanOrEqual(1)

    // Cambiar a Grupos carga su maestro.
    await user.click(within(tablist).getByRole("tab", { name: "Grupos" }))
    await waitFor(() => {
      expect(listarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ maestro: "grupos" }),
        }),
      )
    })
    const panelGrupos = document.getElementById("panel-grupos")
    expect(panelGrupos).not.toBeNull()
    await within(panelGrupos as HTMLElement).findAllByText("Grupo Levante")
    expect(
      within(panelGrupos as HTMLElement).getAllByRole("button", { name: "+ Nuevo" }).length,
    ).toBeGreaterThanOrEqual(1)
  })
})

describe("Formulario crear/editar (CM-039/CM-041/CM-032)", () => {
  it("crear feliz: toast, cierre del panel y refresh (router.invalidate)", async () => {
    const user = userEvent.setup()
    crearMock.mockResolvedValue({ tipo: "creado", id: "n1" })
    const { props } = renderView()
    await user.click(screen.getAllByRole("button", { name: "+ Nuevo" })[0])
    const nombre = await screen.findByLabelText(/Nombre/)
    await user.type(nombre, "Ana María")
    await user.click(screen.getByRole("button", { name: "Guardar" }))
    await waitFor(() => {
      expect(crearMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fincaId: FINCA_ID,
            maestro: "veterinarios",
            datos: expect.objectContaining({ nombre: "Ana María" }),
          }),
        }),
      )
    })
    expect(await screen.findByText("Veterinario creado")).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText("Nuevo veterinario")).not.toBeInTheDocument())
    expect(props.onRefrescar).toHaveBeenCalled()
    // Recarga local de la consulta vigente tras la mutación.
    await waitFor(() => expect(listarMock).toHaveBeenCalled())
  })

  it("validacion del servidor mapea errores por campo (CM-041)", async () => {
    const user = userEvent.setup()
    crearMock.mockResolvedValue({
      tipo: "validacion",
      errores: [{ campo: "nombre", detalle: "El nombre es obligatorio.", regla: "CM-026" }],
    })
    renderView()
    await user.click(screen.getAllByRole("button", { name: "+ Nuevo" })[0])
    await user.click(await screen.findByRole("button", { name: "Guardar" }))
    const campo = await screen.findByLabelText(/Nombre/)
    expect(campo).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByRole("alert")).toHaveTextContent("El nombre es obligatorio.")
    // El panel sigue abierto con el formulario intacto.
    expect(screen.getByText("Nuevo veterinario")).toBeInTheDocument()
  })

  it("duplicado de nombre activo → error en el campo nombre (CM-041)", async () => {
    const user = userEvent.setup()
    crearMock.mockResolvedValue({
      tipo: "validacion",
      errores: [
        { campo: "nombre", detalle: "Ya existe un registro con ese nombre.", regla: "CM-041" },
      ],
    })
    renderView()
    await user.click(screen.getAllByRole("button", { name: "+ Nuevo" })[0])
    await user.type(await screen.findByLabelText(/Nombre/), "Repetido")
    await user.click(screen.getByRole("button", { name: "Guardar" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya existe un registro con ese nombre.",
    )
  })

  it("conflicto codigo → error de campo con copy es-CO (CM-032)", async () => {
    const user = userEvent.setup()
    crearMock.mockResolvedValue({ tipo: "conflicto", campo: "codigo" })
    renderView({
      slug: "potreros",
      nombreMaestro: "Potreros",
      singular: "potrero",
    })
    await user.click(screen.getAllByRole("button", { name: "+ Nuevo" })[0])
    await user.type(await screen.findByLabelText(/Código/), "P-01")
    await user.type(screen.getByLabelText(/Nombre/), "La Manga")
    await user.click(screen.getByRole("button", { name: "Guardar" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya existe un registro con ese código en la finca.",
    )
  })

  it("editar titula 'Editar {nombre}' y carga los valores del registro", async () => {
    const user = userEvent.setup()
    editarMock.mockResolvedValue({ tipo: "actualizado" })
    renderView({
      slug: "potreros",
      nombreMaestro: "Potreros",
      singular: "potrero",
      resultado: {
        tipo: "lista",
        ...lista([fila("p1", "La Manga", { codigo: "P-01", area_hectareas: 12.5 })]),
      },
    })
    await user.click(screen.getAllByRole("button", { name: "Editar La Manga" })[0])
    expect(await screen.findByText("Editar La Manga")).toBeInTheDocument()
    const nombre = screen.getByLabelText(/Nombre/) as HTMLInputElement
    const codigo = screen.getByLabelText(/Código/) as HTMLInputElement
    const area = screen.getByLabelText(/Área/) as HTMLInputElement
    expect(nombre).toHaveValue("La Manga")
    expect(codigo).toHaveValue("P-01")
    expect(area).toHaveValue("12.5")
    await user.clear(nombre)
    await user.type(nombre, "La Manga Renombrada")
    await user.click(screen.getByRole("button", { name: "Guardar" }))
    await waitFor(() => {
      expect(editarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            maestro: "potreros",
            id: "p1",
            datos: expect.objectContaining({ nombre: "La Manga Renombrada", codigo: "P-01" }),
          }),
        }),
      )
    })
    expect(await screen.findByText("Potrero actualizado")).toBeInTheDocument()
  })

  it("cierre con cambios sin guardar pide confirmación (CM-039)", async () => {
    const user = userEvent.setup()
    renderView()
    await user.click(screen.getAllByRole("button", { name: "+ Nuevo" })[0])
    await user.type(await screen.findByLabelText(/Nombre/), "Cambio sin guardar")
    await user.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(await screen.findByText("¿Cerrar sin guardar?")).toBeInTheDocument()
    expect(
      screen.getByText("Los cambios que hiciste no se han guardado y se perderán."),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Cerrar sin guardar" }))
    await waitFor(() => expect(screen.queryByText("Nuevo veterinario")).not.toBeInTheDocument())
  })
})

describe("Inseminadores y switch de veterinarios (CM-040)", () => {
  it("crear desde Inseminadores fuerza es_inseminador = 1 (campo oculto)", async () => {
    const user = userEvent.setup()
    crearMock.mockResolvedValue({ tipo: "creado", id: "i1" })
    renderView({
      slug: "inseminadores",
      nombreMaestro: "Inseminadores",
      singular: "inseminador",
    })
    await user.click(screen.getAllByRole("button", { name: "+ Nuevo" })[0])
    await screen.findByText("Nuevo inseminador")
    // El panel vive en un portal: se busca en el documento completo.
    const oculto = document.body.querySelector(
      'input[type="hidden"][name="es_inseminador"]',
    ) as HTMLInputElement | null
    expect(oculto).not.toBeNull()
    expect(oculto?.value).toBe("1")
    // El switch de veterinarios NO aparece en la vista inseminadores.
    expect(screen.queryByLabelText("También es inseminador")).not.toBeInTheDocument()
    await user.type(screen.getByLabelText(/Nombre/), "Carlos IA")
    await user.click(screen.getByRole("button", { name: "Guardar" }))
    await waitFor(() => {
      expect(crearMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            maestro: "inseminadores",
            datos: expect.objectContaining({ es_inseminador: 1, nombre: "Carlos IA" }),
          }),
        }),
      )
    })
  })

  it("Veterinarios muestra el switch editable 'También es inseminador'", async () => {
    const user = userEvent.setup()
    crearMock.mockResolvedValue({ tipo: "creado", id: "v9" })
    renderView()
    await user.click(screen.getAllByRole("button", { name: "+ Nuevo" })[0])
    const switchInseminador = await screen.findByLabelText("También es inseminador")
    expect(switchInseminador).toHaveAttribute("aria-checked", "false")
    await user.click(switchInseminador)
    expect(switchInseminador).toHaveAttribute("aria-checked", "true")
    await user.type(screen.getByLabelText(/Nombre/), "Dra. Dual")
    await user.click(screen.getByRole("button", { name: "Guardar" }))
    await waitFor(() => {
      expect(crearMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            maestro: "veterinarios",
            datos: expect.objectContaining({ es_inseminador: 1 }),
          }),
        }),
      )
    })
  })
})

describe("Inactivar/Activar (CM-044/CM-045)", () => {
  it("inactivar pide confirmación con el copy del requisito y llama con activo=false", async () => {
    const user = userEvent.setup()
    cambiarEstadoMock.mockResolvedValue({ tipo: "estado_actualizado", activo: false })
    const { props } = renderView({
      resultado: { tipo: "lista", ...lista([fila("v1", "Ana")]) },
    })
    await user.click(screen.getAllByRole("button", { name: "Inactivar Ana" })[0])
    expect(await screen.findByText("¿Inactivar Ana?")).toBeInTheDocument()
    expect(
      screen.getByText("Dejará de aparecer en formularios y listas; se conserva en históricos."),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Inactivar" }))
    await waitFor(() => {
      expect(cambiarEstadoMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fincaId: FINCA_ID,
            maestro: "veterinarios",
            id: "v1",
            activo: false,
          }),
        }),
      )
    })
    expect(await screen.findByText("Registro inactivado")).toBeInTheDocument()
    expect(props.onRefrescar).toHaveBeenCalled()
  })

  it("activar un registro inactivo llama con activo=true", async () => {
    const user = userEvent.setup()
    cambiarEstadoMock.mockResolvedValue({ tipo: "estado_actualizado", activo: true })
    renderView({
      resultado: { tipo: "lista", ...lista([{ ...fila("v1", "Bruno"), activo: 0 }]) },
    })
    expect(screen.getAllByText("Inactivo").length).toBeGreaterThanOrEqual(1)
    await user.click(screen.getAllByRole("button", { name: "Activar Bruno" })[0])
    expect(await screen.findByText("¿Activar Bruno?")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Activar" }))
    await waitFor(() => {
      expect(cambiarEstadoMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: "v1", activo: true }),
        }),
      )
    })
  })
})

describe("RBAC de la vista (CM-022)", () => {
  it("sin configuracion:crear no hay '+ Nuevo'", () => {
    renderView({ permisos: { crear: false, editar: true, inactivar: true } })
    expect(screen.queryByRole("button", { name: "+ Nuevo" })).not.toBeInTheDocument()
  })

  it("sin configuracion:editar no hay acciones de edición", () => {
    renderView({
      permisos: { crear: true, editar: false, inactivar: true },
      resultado: { tipo: "lista", ...lista([fila("v1", "Ana")]) },
    })
    expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument()
  })

  it("sin configuracion:inactivar no hay acciones de estado", () => {
    renderView({
      permisos: { crear: true, editar: true, inactivar: false },
      resultado: { tipo: "lista", ...lista([fila("v1", "Ana")]) },
    })
    expect(screen.queryByRole("button", { name: /Inactivar|Activar/ })).not.toBeInTheDocument()
  })
})

describe("Ruta $maestro — RBAC y loader (CM-021)", () => {
  const beforeLoad = MaestroRoute.options.beforeLoad as unknown as (opts: {
    context: { sesion: { permisos: readonly { modulo: string; accion: string }[] } }
    params: { fincaId: string; maestro: string }
  }) => void
  const loader = MaestroRoute.options.loader as unknown as (opts: {
    params: { fincaId: string; maestro: string }
  }) => Promise<unknown>

  const SESION_VER = { permisos: [{ modulo: "configuracion", accion: "ver" }] }

  it("sin configuracion:ver beforeLoad redirige a '/'", () => {
    let capturado: unknown = null
    try {
      beforeLoad({
        context: { sesion: { permisos: [] } },
        params: { fincaId: FINCA_ID, maestro: "veterinarios" },
      })
    } catch (error) {
      capturado = error
    }
    expect(destinoRedirect(capturado)).toBe("/")
  })

  it("slug desconocido o de otro issue redirige al hub", () => {
    for (const slug of ["no-existe", "razas", "predio", "calidades"]) {
      let capturado: unknown = null
      try {
        beforeLoad({
          context: { sesion: SESION_VER },
          params: { fincaId: FINCA_ID, maestro: slug },
        })
      } catch (error) {
        capturado = error
      }
      expect(destinoRedirect(capturado)).toBe(`/fincas/${FINCA_ID}/configuracion`)
    }
  })

  it("slug editable conocido con permiso no redirige", () => {
    expect(() =>
      beforeLoad({
        context: { sesion: SESION_VER },
        params: { fincaId: FINCA_ID, maestro: "lotes-grupos" },
      }),
    ).not.toThrow()
  })

  it("loader: denials redirigen y el fallo RPC devuelve {tipo:'error'}", async () => {
    listarMock.mockResolvedValueOnce({ tipo: "no_autenticado" })
    let capturado = await loader({ params: { fincaId: FINCA_ID, maestro: "veterinarios" } }).catch(
      (error: unknown) => error,
    )
    expect(destinoRedirect(capturado)).toBe("/login")

    listarMock.mockResolvedValueOnce({
      tipo: "permiso_denegado",
      permiso: "configuracion:ver",
    })
    capturado = await loader({ params: { fincaId: FINCA_ID, maestro: "veterinarios" } }).catch(
      (error: unknown) => error,
    )
    expect(destinoRedirect(capturado)).toBe("/")

    listarMock.mockRejectedValueOnce(new Error("rpc caido"))
    const resultado = await loader({ params: { fincaId: FINCA_ID, maestro: "veterinarios" } })
    expect(resultado).toEqual({ tipo: "error" })
  })

  it("loader: total < 100 devuelve la lista completa (pageSize 100) en una llamada", async () => {
    listarMock.mockResolvedValue({
      tipo: "lista",
      filas: [fila("v1", "Ana")],
      total: 1,
      pagina: 1,
      pageSize: 100,
    })
    const resultado = await loader({ params: { fincaId: FINCA_ID, maestro: "veterinarios" } })
    expect(resultado).toMatchObject({ tipo: "lista", total: 1, pageSize: 100 })
    expect(listarMock).toHaveBeenCalledTimes(1)
    expect(listarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          maestro: "veterinarios",
          opciones: expect.objectContaining({ pagina: 1, pageSize: PAGE_SIZE_COMPLETO }),
        }),
      }),
    )
  })

  it("loader: total ≥ 100 corrige a 25/página (segunda llamada con pageSize 25)", async () => {
    listarMock.mockImplementation(
      async (input: { data: { opciones?: { pagina?: number; pageSize?: number } } }) => ({
        tipo: "lista",
        filas: filasDe(25),
        total: 120,
        pagina: 1,
        pageSize: input.data.opciones?.pageSize ?? 100,
      }),
    )
    const resultado = await loader({ params: { fincaId: FINCA_ID, maestro: "veterinarios" } })
    expect(listarMock).toHaveBeenCalledTimes(2)
    expect(listarMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          opciones: expect.objectContaining({ pagina: 1, pageSize: PAGE_SIZE_PAGINA }),
        }),
      }),
    )
    expect(resultado).toMatchObject({ tipo: "lista", total: 120, pageSize: 25 })
  })

  it("loader: lotes-grupos carga lotes por defecto (CM-035)", async () => {
    listarMock.mockResolvedValue({ tipo: "lista", filas: [], total: 0, pagina: 1, pageSize: 100 })
    await loader({ params: { fincaId: FINCA_ID, maestro: "lotes-grupos" } })
    expect(listarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ maestro: "lotes" }),
      }),
    )
  })
})

function filasDe(cantidad: number): MaestroFila[] {
  return Array.from({ length: cantidad }, (_, i) => fila(`id${i}`, `Registro ${i}`))
}

describe("Umbrales documentados (S-2)", () => {
  it("constantes del contrato de búsqueda/paginación", () => {
    expect(UMBRAL_BUSQUEDA_SERVIDOR).toBe(50)
    expect(UMBRAL_PAGINACION).toBe(100)
    expect(PAGE_SIZE_PAGINA).toBe(25)
    expect(PAGE_SIZE_COMPLETO).toBe(100)
  })
})
