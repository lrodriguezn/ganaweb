// @vitest-environment jsdom

/**
 * Issue #149 — MaestroCard / MaestroFilaConsolidada / MaestroGrid /
 * MaestrosProgreso (RF-CONFIG-MAESTROS v1.0).
 *
 * Cubre: variantes card/fila (CM-009), doble conteo "N · M" (CM-008),
 * degradación "—" sin alerta de vacío (CM-014), alertas de vacío bloqueante
 * y no bloqueante (frame-20073), y el ajuste S-3 de MaestrosProgreso
 * (total = los 8 fijos con `requeridoPara`; degradados no cuentan).
 * Verificación estática de a11y: foco visible, targets ≥48px, textos de
 * alerta presentes (no solo icono).
 */

import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  MaestroCard,
  MaestroFilaConsolidada,
  MaestroGrid,
  MaestrosProgreso,
} from "../src/ganado/maestro-card"
import type { MaestroResumen } from "../src/ganado/types"

afterEach(() => {
  cleanup()
})

function maestro(overrides: Partial<MaestroResumen> = {}): MaestroResumen {
  return {
    id: "veterinarios",
    nombre: "Veterinarios",
    grupo: "personas",
    registros: 4,
    ruta: "/fincas/f1/configuracion/veterinarios",
    ...overrides,
  }
}

describe("MaestroCard — conteos", () => {
  it("muestra el conteo plural y singular", () => {
    const { unmount } = render(<MaestroCard maestro={maestro()} onPress={() => {}} />)
    expect(screen.getByText("4 registros")).toBeInTheDocument()
    unmount()

    render(<MaestroCard maestro={maestro({ registros: 1 })} onPress={() => {}} />)
    expect(screen.getByText("1 registro")).toBeInTheDocument()
  })

  it("CM-008: registrosSecundario renderiza el doble conteo 'N · M'", () => {
    render(
      <MaestroCard
        maestro={maestro({
          id: "lotesGrupos",
          nombre: "Lotes · Grupos",
          registros: 6,
          registrosSecundario: 3,
        })}
        onPress={() => {}}
      />,
    )
    expect(screen.getByText("6 · 3")).toBeInTheDocument()
  })

  it("CM-014: degradado muestra '—' sin alerta de vacío", () => {
    render(
      <MaestroCard
        maestro={maestro({ registros: 0, degradado: true, requeridoPara: "Servicios IA" })}
        onPress={() => {}}
      />,
    )
    expect(screen.getByText("—")).toBeInTheDocument()
    expect(screen.queryByText(/Vacío/)).not.toBeInTheDocument()
  })

  it("vacío bloqueante muestra la dependencia en texto (no solo icono)", () => {
    const { container } = render(
      <MaestroCard
        maestro={maestro({ id: "inseminadores", registros: 0, requeridoPara: "Servicios IA" })}
        onPress={() => {}}
      />,
    )
    expect(screen.getByText(/Vacío · requerido para Servicios IA/)).toBeInTheDocument()
    expect(container.querySelector(".text-peligro-600")).not.toBeNull()
  })

  it("vacío no bloqueante muestra alerta 'Vacío' en color alerta", () => {
    const { container } = render(
      <MaestroCard maestro={maestro({ id: "sectores", registros: 0 })} onPress={() => {}} />,
    )
    expect(screen.getByText("Vacío")).toBeInTheDocument()
    expect(container.querySelector(".text-alerta-600")).not.toBeNull()
  })

  it("CM-007: etiquetaVacio reemplaza 'Vacío' en el vacío no bloqueante", () => {
    const { container } = render(
      <MaestroCard
        maestro={maestro({ id: "predio", registros: 0, etiquetaVacio: "Incompleto" })}
        onPress={() => {}}
      />,
    )
    expect(screen.getByText("Incompleto")).toBeInTheDocument()
    expect(screen.queryByText("Vacío")).not.toBeInTheDocument()
    // Conserva el color alerta del vacío no bloqueante.
    expect(container.querySelector(".text-alerta-600")).not.toBeNull()
  })

  it("CM-007: el vacío bloqueante ignora etiquetaVacio (muestra la dependencia)", () => {
    render(
      <MaestroCard
        maestro={maestro({ registros: 0, requeridoPara: "Servicios IA", etiquetaVacio: "Otro" })}
        onPress={() => {}}
      />,
    )
    expect(screen.getByText(/Vacío · requerido para Servicios IA/)).toBeInTheDocument()
    expect(screen.queryByText("Otro")).not.toBeInTheDocument()
  })

  it("CM-007: degradado tiene prioridad sobre etiquetaVacio ('—')", () => {
    render(
      <MaestroCard
        maestro={maestro({ registros: 0, degradado: true, etiquetaVacio: "Incompleto" })}
        onPress={() => {}}
      />,
    )
    expect(screen.getByText("—")).toBeInTheDocument()
    expect(screen.queryByText("Incompleto")).not.toBeInTheDocument()
  })

  it("invoca onPress con el maestro", async () => {
    const user = userEvent.setup()
    const onPress = vi.fn()
    const item = maestro()
    render(<MaestroCard maestro={item} onPress={onPress} />)
    await user.click(screen.getByRole("button", { name: /Veterinarios/ }))
    expect(onPress).toHaveBeenCalledWith(item)
  })

  it("a11y: foco visible y conteo con tabular-nums (clase num)", () => {
    const { container } = render(<MaestroCard maestro={maestro()} onPress={() => {}} />)
    const boton = screen.getByRole("button", { name: /Veterinarios/ })
    expect(boton.className).toContain("focus-visible:")
    expect(boton.className).toContain("min-h-[64px]")
    expect(container.querySelector(".num")).not.toBeNull()
  })
})

describe("MaestroCard — variante fila (CM-009)", () => {
  it("fila de 56px con chevron visible", () => {
    const { container } = render(
      <MaestroCard maestro={maestro()} onPress={() => {}} variante="fila" />,
    )
    const boton = screen.getByRole("button", { name: /Veterinarios/ })
    // target ≥48px (CM-070)
    expect(boton.className).toContain("min-h-[56px]")
    // el chevron de la fila no se oculta en desktop
    const chevron = container.querySelector("svg")
    expect(chevron).not.toBeNull()
    expect(chevron?.className.baseVal ?? "").not.toContain("md:hidden")
  })

  it("la variante card oculta el chevron en desktop (md:hidden)", () => {
    const { container } = render(<MaestroCard maestro={maestro()} onPress={() => {}} />)
    const chevron = container.querySelector("svg")
    expect(chevron?.className.baseVal ?? "").toContain("md:hidden")
  })
})

describe("MaestroFilaConsolidada — S-1", () => {
  it("renderiza label compuesto y conteo triple; navega al presionar", async () => {
    const user = userEvent.setup()
    const onPress = vi.fn()
    render(
      <MaestroFilaConsolidada
        label="Predios · Potreros · Sectores"
        conteo="1 · 8 · 4"
        onPress={onPress}
      />,
    )
    expect(screen.getByText("Predios · Potreros · Sectores")).toBeInTheDocument()
    expect(screen.getByText("1 · 8 · 4")).toBeInTheDocument()
    const boton = screen.getByRole("button", { name: /Predios · Potreros · Sectores/ })
    expect(boton.className).toContain("min-h-[56px]")
    expect(boton.className).toContain("focus-visible:")
    await user.click(boton)
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})

describe("MaestroGrid", () => {
  const items: MaestroResumen[] = [
    maestro(),
    maestro({ id: "predio", nombre: "Predios", grupo: "ubicacion", registros: 1 }),
    maestro({ id: "hierros", nombre: "Hierros", grupo: "clasificacion", registros: 2 }),
  ]

  it("agupa en Personas / Ubicación / Clasificación y comerciales", () => {
    render(<MaestroGrid maestros={items} onPress={() => {}} />)
    expect(screen.getByText("Personas")).toBeInTheDocument()
    expect(screen.getByText("Ubicación")).toBeInTheDocument()
    expect(screen.getByText("Clasificación y comerciales")).toBeInTheDocument()
  })

  it("variante fila: lista apilada sin encabezados de grupo", () => {
    render(<MaestroGrid maestros={items} onPress={() => {}} variante="fila" />)
    expect(screen.queryByText("Personas")).not.toBeInTheDocument()
    expect(screen.getAllByRole("button")).toHaveLength(3)
  })
})

describe("MaestrosProgreso — S-3 (los 8 fijos)", () => {
  const REQUERIDOS = [
    "veterinarios",
    "propietarios",
    "inseminadores",
    "potreros",
    "hierros",
    "diagnosticos",
    "motivosVentas",
    "causasMuerte",
  ] as const

  function quinceMaestros(opts: {
    completos?: readonly string[]
    noRequeridosConRegistros?: readonly string[]
  }): MaestroResumen[] {
    const completos = new Set(opts.completos ?? [])
    const conRegistrosExtra = new Set(opts.noRequeridosConRegistros ?? [])
    const base: MaestroResumen[] = REQUERIDOS.map((id) => ({
      id,
      nombre: id,
      grupo: "personas",
      registros: completos.has(id) ? 3 : 0,
      requeridoPara: "Proceso",
      ruta: `/configuracion/${id}`,
    }))
    const globales: MaestroResumen[] = ["razas", "tiposExplotacion", "calidades"].map((id) => ({
      id,
      nombre: id,
      grupo: "clasificacion",
      registros: conRegistrosExtra.has(id) ? 9 : 0,
      ruta: `/configuracion/${id}`,
    }))
    return [...base, ...globales]
  }

  it("el total son los 8 con requeridoPara; no-requeridos con registros no lo alteran", () => {
    render(
      <MaestrosProgreso
        maestros={quinceMaestros({
          completos: ["veterinarios", "propietarios"],
          noRequeridosConRegistros: ["razas", "tiposExplotacion", "calidades"],
        })}
      />,
    )
    expect(screen.getByText("2 de 8 requeridos completos")).toBeInTheDocument()
  })

  it("los 8 completos → desaparece (null)", () => {
    const { container } = render(
      <MaestrosProgreso maestros={quinceMaestros({ completos: REQUERIDOS })} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("item degradado no cuenta como completo", () => {
    // El servidor degrada con registros 0; acá se fuerza el caso con
    // registros > 0 + degradado para probar el guard `!degradado` de S-3.
    const items = quinceMaestros({ completos: REQUERIDOS }).map((m) =>
      m.id === "hierros" ? { ...m, degradado: true } : m,
    )
    render(<MaestrosProgreso maestros={items} />)
    expect(screen.getByText("7 de 8 requeridos completos")).toBeInTheDocument()
  })
})
