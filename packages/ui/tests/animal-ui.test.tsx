// @vitest-environment jsdom

import { readFileSync } from "node:fs"

import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  AnimalDesktopScreen,
  AnimalFichaDesktopScreen,
  AnimalFichaHeader,
  AnimalFichaMobileScreen,
  AnimalFormScreen,
  AnimalGallery,
  AnimalGenealogy,
  AnimalListMobile,
  AnimalTimeline,
} from "../src"

const animal = {
  id: "a-1",
  codigoAnimal: "MT-122",
  nombreAnimal: "Luna",
  sexo: "hembra" as const,
  categoriaReproductiva: "novilla" as const,
  salud: "sano" as const,
  estadoActual: "activo" as const,
  potrero: "Potrero 4",
  lote: "Lote Norte",
  imagenPrincipalUrl: "/luna.webp",
}

const nav = [
  { id: "inicio", label: "Inicio", href: "/", icon: () => null },
  { id: "animales", label: "Animales", href: "/animales", icon: () => null },
  { id: "tareas", label: "Tareas", href: "/tareas", icon: () => null },
  { id: "mas", label: "Más", href: "/mas", icon: () => null },
]

afterEach(() => cleanup())

describe("PR3 animal UI OpenPencil parity", () => {
  it("renders mobile animal cards with image, badges, location, selection state, and empty action", () => {
    const onPress = vi.fn()
    const { rerender } = render(
      <AnimalListMobile
        animales={[animal]}
        selectedIds={["a-1"]}
        onPressAnimal={onPress}
        onNuevoAnimal={vi.fn()}
        bottomNavItems={nav}
      />,
    )

    const card = screen.getByRole("button", { name: /MT-122 Luna/i })
    expect(card).toHaveAttribute("aria-pressed", "true")
    expect(within(card).getByRole("img", { name: /foto principal de Luna/i })).toHaveAttribute(
      "src",
      "/luna.webp",
    )
    expect(within(card).getByText("Novilla")).toBeInTheDocument()
    expect(within(card).getByText("Potrero 4 · Lote Norte")).toBeInTheDocument()

    rerender(
      <AnimalListMobile
        animales={[]}
        onPressAnimal={onPress}
        onNuevoAnimal={vi.fn()}
        bottomNavItems={nav}
      />,
    )
    expect(screen.getByText("No hay animales con estos filtros")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Registrar animal" })).toBeInTheDocument()
  })

  it("groups ficha timeline by year, keeps descending order, and exposes non-color pending state", () => {
    render(
      <AnimalTimeline
        eventos={[
          {
            id: "e-2026",
            dominio: "manejo",
            tipo: "foto",
            fecha: "2026-07-10",
            titulo: "Foto agregada",
            detalle: "Pendiente de subir",
            estadoLocal: "pendiente",
          },
          {
            id: "e-2025",
            dominio: "produccion",
            tipo: "peso",
            fecha: "2025-03-01",
            titulo: "Peso registrado",
            detalle: "320 kg",
          },
        ]}
      />,
    )

    const groups = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)
    expect(groups).toEqual(["2026", "2025"])
    expect(screen.getByText("Pendiente de subir")).toBeInTheDocument()
    expect(
      screen.getByText("Guardado local · se sincronizará al recuperar señal"),
    ).toBeInTheDocument()
  })

  it("shows persistent inactive/sold/dead banners and hides event actions on ficha header", () => {
    render(
      <AnimalFichaHeader
        animal={{ ...animal, estadoActual: "vendido" }}
        metrics={[{ label: "Edad", value: "3 años" }]}
        canEdit={true}
        canCreateEvents={true}
      />,
    )

    expect(screen.getByRole("status")).toHaveTextContent(
      "Animal vendido · la historia se conserva y las acciones de evento están ocultas",
    )
    expect(screen.queryByRole("button", { name: /Registrar evento/i })).not.toBeInTheDocument()
    expect(screen.getByText("3 años")).toBeInTheDocument()
  })

  it("enforces the five-image gallery limit and marks pending upload without color-only state", () => {
    render(
      <AnimalGallery
        images={[0, 1, 2, 3, 4].map((index) => ({
          id: `img-${index}`,
          src: `/animal-${index}.webp`,
          alt: `Foto ${index + 1}`,
          principal: index === 0,
          pendingUpload: index === 4,
        }))}
        onAddImage={vi.fn()}
        onMarkPrincipal={vi.fn()}
        onUnlink={vi.fn()}
      />,
    )

    expect(screen.getByText("5 de 5 fotos activas")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Límite de 5 fotos alcanzado" })).toBeDisabled()
    expect(screen.getByText("Principal")).toBeInTheDocument()
    expect(screen.getByText("Pendiente de subir")).toBeInTheDocument()
  })

  it("renders desktop/mobile form labels, contextual raza hint, offline note, and sticky save footer", () => {
    const { rerender } = render(
      <AnimalFormScreen mode="desktop" onSave={vi.fn()} onCancel={vi.fn()} />,
    )
    for (const label of [
      "Código *",
      "Nombre",
      "Nº de arete",
      "Sexo",
      "Raza",
      "Fecha de nacimiento",
      "Color",
      "Calidad",
      "Origen",
      "Madre",
      "Padre",
      "Potrero/Sector/Lote/Grupo",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }

    rerender(<AnimalFormScreen mode="mobile" onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(
      screen.getByText("¿No encuentras la raza? Créala sin salir del formulario."),
    ).toBeInTheDocument()
    expect(screen.getByText("Se sincronizará al recuperar señal")).toBeInTheDocument()
    expect(screen.getByRole("contentinfo")).toHaveAttribute("data-sticky-save", "true")
  })

  it("submits the animal form through onSave exactly once per Guardar click", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(<AnimalFormScreen mode="desktop" onSave={onSave} onCancel={vi.fn()} />)
    await user.type(screen.getByLabelText("Código *"), "NV-42")
    await user.type(screen.getByLabelText("Nombre"), "Novilla 42")
    await user.click(screen.getByRole("button", { name: "Guardar" }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const [formData] = onSave.mock.calls[0] as [FormData]
    expect(formData.get("codigo")).toBe("NV-42")
    expect(formData.get("nombre")).toBe("Novilla 42")
    expect(formData.get("sexoKey")).toBe("1")
  })

  it("composes desktop list and ficha structures named after OpenPencil frames", () => {
    render(
      <>
        <AnimalDesktopScreen animales={[animal]} selectedIds={["a-1"]} onNuevoAnimal={vi.fn()} />
        <AnimalFichaDesktopScreen animal={animal} timeline={[]} />
      </>,
    )

    expect(screen.getByTestId("op-f-300165")).toHaveAccessibleName("18 Animales · Desktop")
    expect(screen.getByRole("table", { name: "Animales" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Nuevo animal" })).toBeInTheDocument()
    expect(screen.getByText("1 seleccionado")).toBeInTheDocument()
    expect(screen.getByTestId("op-f-400107")).toHaveAccessibleName("19 Ficha Animal · Desktop")
    for (const card of ["Datos", "Reproducción", "Peso", "Timeline"]) {
      expect(screen.getByRole("region", { name: card })).toBeInTheDocument()
    }
  })

  it("guards the UI package test runner against focused tests in scripts and config", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>
    }
    const vitestConfig = readFileSync("vitest.config.ts", "utf8")

    expect(packageJson.scripts.test).toContain("--allowOnly=false")
    expect(vitestConfig).toMatch(/allowOnly:\s*false/)
  })

  it("renders mobile ficha frame 04 with header metrics, tabs, timeline, and bottom navigation", () => {
    render(
      <AnimalFichaMobileScreen
        animal={animal}
        timeline={[
          {
            id: "e-1",
            dominio: "manejo",
            tipo: "foto",
            fecha: "2026-07-10",
            titulo: "Foto agregada",
            detalle: "Imagen principal actualizada",
          },
        ]}
        metrics={[
          { label: "Edad", value: "3 años" },
          { label: "Último peso", value: "320 kg" },
        ]}
        bottomNavItems={nav}
        onRegistrarEvento={vi.fn()}
      />,
    )

    expect(screen.getByTestId("op-frame-0232")).toHaveAccessibleName("04 Ficha Animal · Mobile")
    expect(screen.getByText("MT-122")).toBeInTheDocument()
    expect(screen.getByText("3 años")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tab", { name: "Fotos" })).toBeInTheDocument()
    expect(screen.getByText("Foto agregada")).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Navegación inferior" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Registrar evento" })).toBeInTheDocument()
  })

  it("exports and renders genealogy relationships for animal ficha composition", () => {
    render(
      <AnimalGenealogy
        parents={{
          mother: { codigoAnimal: "MT-010", nombreAnimal: "Aurora" },
          father: { codigoAnimal: "TR-020", nombreAnimal: "Roble" },
        }}
        offspring={[
          { codigoAnimal: "CR-301", nombreAnimal: "Nube", relation: "Hija" },
          { codigoAnimal: "CR-302", relation: "Hijo" },
        ]}
      />,
    )

    expect(screen.getByRole("region", { name: "Genealogía" })).toBeInTheDocument()
    expect(screen.getByText("Madre")).toBeInTheDocument()
    expect(screen.getByText("MT-010 · Aurora")).toBeInTheDocument()
    expect(screen.getByText("Padre")).toBeInTheDocument()
    expect(screen.getByText("TR-020 · Roble")).toBeInTheDocument()
    expect(screen.getByText("Hija · CR-301 · Nube")).toBeInTheDocument()
    expect(screen.getByText("Hijo · CR-302")).toBeInTheDocument()
  })
})
