// @vitest-environment jsdom

/**
 * Catálogo de productos sanitarios — componentes reutilizables (Issue #209,
 * RF-SANIDAD v0.2 §6/§12).
 *
 * Reglas cubiertas (TS-001):
 * - SAN-022/KPI-10: cada fila muestra el stock calculado + semáforo
 *   (agotado ≤ 0, bajo < umbral, ok) recibido ya calculado del caso de uso.
 * - PE-001/SAN-061: las acciones se gatean por PERMISO (tienePermiso),
 *   nunca por nombre de rol.
 * - RN-050: sin botón de eliminar en ninguna vista — la única baja es
 *   inactivar/reactivar.
 * - SAN-021: inactivar/reactivar exige confirmación explícita
 *   (AlertDialog); el inactivo "dejará de aparecer en formularios y listas;
 *   se conserva en históricos".
 * - SAN-020: el formulario expone los campos del catálogo y muestra los
 *   errores del dominio con forma `{ campo, detalle }`.
 */

import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { crearPermisos, tienePermiso } from "../src/ganado/types"
import {
  CatalogoProductosSanitariosDesktop,
  CatalogoProductosSanitariosMobile,
  type FilaProductoSanitarioUI,
} from "../src/ganado/catalogo-productos-sanitarios"
import { FormularioProductoSanitario } from "../src/ganado/formulario-producto-sanitario"

beforeAll(() => {
  // Radix Select/AlertDialog en jsdom (patrón select-con-creacion.test.tsx).
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
})

function fila(overrides: Partial<FilaProductoSanitarioUI> = {}): FilaProductoSanitarioUI {
  return {
    id: "prod-1",
    codigo: "VAC-AFTOSA",
    descripcion: "Vacuna fiebre aftosa",
    mlMgPorDosis: 2,
    tipoTratamiento: "vacuna",
    precioDosis: 3500,
    comentarios: null,
    activo: true,
    stockDisponible: 148,
    estadoStock: "ok",
    ...overrides,
  }
}

const PERMISOS_ADMIN = crearPermisos([
  { modulo: "sanidad", accion: "ver" },
  { modulo: "sanidad", accion: "crear" },
  { modulo: "sanidad", accion: "editar" },
  { modulo: "sanidad", accion: "anular" },
])
const PERMISOS_SOLO_LECTURA = crearPermisos([{ modulo: "sanidad", accion: "ver" }])

describe("Catálogo desktop — SAN-022 / KPI-10", () => {
  it("cada fila muestra el stock calculado y el semáforo KPI-10", () => {
    render(
      <CatalogoProductosSanitariosDesktop
        filas={[
          fila({ id: "p-ok", codigo: "VAC-AFTOSA", stockDisponible: 148, estadoStock: "ok" }),
          fila({ id: "p-bajo", codigo: "IVERMECTINA", stockDisponible: 10, estadoStock: "bajo" }),
          fila({ id: "p-agotado", codigo: "VITAMINA-A", stockDisponible: 0, estadoStock: "agotado" }),
        ]}
        permisos={PERMISOS_ADMIN}
        onEditar={() => {}}
        onCambiarEstado={() => {}}
      />,
    )

    expect(screen.getByText("148")).toBeInTheDocument()
    expect(screen.getByText("10")).toBeInTheDocument()
    expect(screen.getByText("0")).toBeInTheDocument()
    expect(screen.getByText("OK")).toBeInTheDocument()
    expect(screen.getByText("10 dosis")).toBeInTheDocument()
    expect(screen.getByText("Agotado")).toBeInTheDocument()
  })

  it("PE-001: sin sanidad:editar/anular no hay acciones (gate por permiso, no por rol)", () => {
    render(
      <CatalogoProductosSanitariosDesktop
        filas={[fila()]}
        permisos={PERMISOS_SOLO_LECTURA}
        onEditar={() => {}}
        onCambiarEstado={() => {}}
      />,
    )

    expect(screen.queryByRole("button", { name: /editar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /inactivar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /reactivar/i })).not.toBeInTheDocument()
  })

  it("RN-050: ninguna vista expone botón de eliminar", () => {
    render(
      <CatalogoProductosSanitariosDesktop
        filas={[fila(), fila({ id: "prod-2", codigo: "IVERMECTINA", activo: false, estadoStock: "agotado", stockDisponible: 0 })]}
        permisos={PERMISOS_ADMIN}
        onEditar={() => {}}
        onCambiarEstado={() => {}}
      />,
    )

    expect(screen.queryAllByRole("button", { name: /eliminar|borrar/i })).toHaveLength(0)
  })

  it("SAN-021: el producto inactivo muestra la acción Reactivar", () => {
    render(
      <CatalogoProductosSanitariosDesktop
        filas={[fila({ activo: false })]}
        permisos={PERMISOS_ADMIN}
        onEditar={() => {}}
        onCambiarEstado={() => {}}
      />,
    )

    expect(screen.getByRole("button", { name: /reactivar/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^inactivar/i })).not.toBeInTheDocument()
  })
})

describe("Catálogo mobile — SAN-022 / SAN-021", () => {
  it("la card mobile muestra stock + semáforo y abre la confirmación al inactivar", async () => {
    const user = userEvent.setup()
    const onCambiarEstado = vi.fn()
    render(
      <CatalogoProductosSanitariosMobile
        filas={[fila({ stockDisponible: 5, estadoStock: "bajo" })]}
        permisos={PERMISOS_ADMIN}
        onEditar={() => {}}
        onCambiarEstado={onCambiarEstado}
      />,
    )

    expect(screen.getByText("5 dosis")).toBeInTheDocument()
    expect(screen.getByText("VAC-AFTOSA")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /inactivar vac-aftosa/i }))
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument()
    expect(screen.getByText(/¿Inactivar/i)).toBeInTheDocument()
    // SAN-021: el copy recuerda que se conserva en históricos.
    expect(screen.getByText(/históricos/i)).toBeInTheDocument()

    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: /^inactivar$/i }))
    expect(onCambiarEstado).toHaveBeenCalledTimes(1)
    expect(onCambiarEstado).toHaveBeenCalledWith(expect.objectContaining({ id: "prod-1" }), false)
  })

  it("RN-050: la vista mobile tampoco expone eliminar", () => {
    render(
      <CatalogoProductosSanitariosMobile
        filas={[fila()]}
        permisos={PERMISOS_ADMIN}
        onEditar={() => {}}
        onCambiarEstado={() => {}}
      />,
    )

    expect(screen.queryAllByRole("button", { name: /eliminar|borrar/i })).toHaveLength(0)
  })
})

describe("FormularioProductoSanitario — SAN-020", () => {
  it("renderiza los campos del catálogo (codigo*, descripcion*, tipo, numéricos, comentarios)", () => {
    render(<FormularioProductoSanitario onEnviar={() => {}} />)

    expect(screen.getByLabelText(/código/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tipo de tratamiento/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ml\/mg por dosis/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/precio por dosis/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/comentarios/i)).toBeInTheDocument()
  })

  it("SAN-020: los errores { campo, detalle } del dominio se muestran junto a su campo", () => {
    render(
      <FormularioProductoSanitario
        onEnviar={() => {}}
        errores={[
          { campo: "codigo", detalle: "El campo código es obligatorio." },
          { campo: "tipo_tratamiento", detalle: "El tipo de tratamiento debe ser uno de: reproductivo, no_reproductivo, vacuna." },
        ]}
      />,
    )

    expect(screen.getByText("El campo código es obligatorio.")).toBeInTheDocument()
    expect(
      screen.getByText(
        "El tipo de tratamiento debe ser uno de: reproductivo, no_reproductivo, vacuna.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/código/i)).toHaveAttribute("aria-invalid", "true")
  })

  it("SAN-020: enviar recolecta los valores digitados (trim incluido) y llama onEnviar", async () => {
    const user = userEvent.setup()
    const onEnviar = vi.fn()
    render(<FormularioProductoSanitario onEnviar={onEnviar} />)

    await user.type(screen.getByLabelText(/código/i), "  VAC-AFTOSA ")
    await user.type(screen.getByLabelText(/descripción/i), "Vacuna fiebre aftosa")
    await user.type(screen.getByLabelText(/ml\/mg por dosis/i), "2.5")
    await user.type(screen.getByLabelText(/precio por dosis/i), "3500")
    await user.click(screen.getByRole("button", { name: /guardar/i }))

    expect(onEnviar).toHaveBeenCalledTimes(1)
    const datos = onEnviar.mock.calls[0]?.[0] as Record<string, unknown>
    expect(datos.codigo).toBe("VAC-AFTOSA")
    expect(datos.descripcion).toBe("Vacuna fiebre aftosa")
    expect(datos.mlMgPorDosis).toBe("2.5")
    expect(datos.precioDosis).toBe("3500")
  })

  it("SAN-020: edición precarga los valores iniciales del producto", () => {
    render(
      <FormularioProductoSanitario
        onEnviar={() => {}}
        inicial={{
          codigo: "IVERMECTINA",
          descripcion: "Ivermectina 1%",
          mlMgPorDosis: 1,
          tipoTratamiento: "no_reproductivo",
          precioDosis: 1800,
          comentarios: "Uso externo",
        }}
      />,
    )

    expect(screen.getByLabelText(/código/i)).toHaveValue("IVERMECTINA")
    expect(screen.getByLabelText(/descripción/i)).toHaveValue("Ivermectina 1%")
    expect(screen.getByLabelText(/ml\/mg por dosis/i)).toHaveValue("1")
    expect(screen.getByLabelText(/precio por dosis/i)).toHaveValue("1800")
    expect(screen.getByLabelText(/comentarios/i)).toHaveValue("Uso externo")
  })
})

describe("gate por permiso — helper compartido", () => {
  it("PE-001: tienePermiso decide por módulo:acción, no por rol", () => {
    expect(tienePermiso(PERMISOS_SOLO_LECTURA, "sanidad", "ver")).toBe(true)
    expect(tienePermiso(PERMISOS_SOLO_LECTURA, "sanidad", "editar")).toBe(false)
    expect(tienePermiso(PERMISOS_ADMIN, "sanidad", "anular")).toBe(true)
  })
})
