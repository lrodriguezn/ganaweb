// @vitest-environment jsdom

import { readFileSync } from "node:fs"
import { renderToString } from "react-dom/server"

import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

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
})

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
      "Potrero",
      "Sector",
      "Lote",
      "Grupo",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }

    // 3.2 — when fieldErrors is omitted, no role="alert" and no aria-invalid="true"
    // renders on any input/select. Existing edit-mode test (:336) relies on the same
    // prop being undefined by default; this is the explicit omit assertion.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    for (const input of screen.getAllByRole("textbox")) {
      expect(input).not.toHaveAttribute("aria-invalid", "true")
    }
    for (const combobox of screen.getAllByRole("combobox")) {
      expect(combobox).not.toHaveAttribute("aria-invalid", "true")
    }

    rerender(<AnimalFormScreen mode="mobile" onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(
      screen.getByText("¿No encuentras la raza? Créala sin salir del formulario."),
    ).toBeInTheDocument()
    expect(screen.getByText("Se sincronizará al recuperar señal")).toBeInTheDocument()
    expect(screen.getByRole("contentinfo")).toHaveAttribute("data-sticky-save", "true")
    // Same omit-by-default pin on the mobile layout — alert markup must not render
    // when the create route does not supply fieldErrors.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("submits the animal form through onSave exactly once per Guardar click", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <AnimalFormScreen
        mode="desktop"
        onSave={onSave}
        onCancel={vi.fn()}
        catalogOptions={{ sexo: [{ value: "1", label: "Hembra" }] }}
      />,
    )
    await user.type(screen.getByLabelText("Código *"), "NV-42")
    await user.type(screen.getByLabelText("Nombre"), "Novilla 42")
    await user.click(screen.getByRole("button", { name: "Guardar" }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const [formData] = onSave.mock.calls[0] as [FormData]
    expect(formData.get("codigo")).toBe("NV-42")
    expect(formData.get("nombre")).toBe("Novilla 42")
    expect(formData.get("sexoKey")).toBe("1")
  })

  it("keeps server-rendered controls disabled until hydration enables the interactive form", () => {
    const props = { mode: "desktop" as const, onSave: vi.fn(), onCancel: vi.fn() }
    const serverMarkup = renderToString(<AnimalFormScreen {...props} />)

    expect(serverMarkup).toContain('aria-busy="true"')
    expect(serverMarkup).toContain('disabled=""')

    render(<AnimalFormScreen {...props} />)
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled()
    expect(screen.getByLabelText("Código *")).toBeEnabled()
  })

  it("renders per-field error under the named input with ARIA wiring when fieldErrors is supplied", () => {
    render(
      <AnimalFormScreen
        mode="desktop"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        fieldErrors={{ codigo: "Requerido" }}
      />,
    )

    // The codigo input must be marked invalid and point at the alert id via aria-describedby.
    const codigoInput = screen.getByLabelText("Código *")
    expect(codigoInput).toHaveAttribute("aria-invalid", "true")
    const describedBy = codigoInput.getAttribute("aria-describedby")
    expect(describedBy).toBeTruthy()
    const alert = describedBy ? document.getElementById(describedBy) : null
    expect(alert).not.toBeNull()
    expect(alert).toHaveAttribute("role", "alert")
    expect(alert).toHaveTextContent("Requerido")

    // The error text lives under the input (not somewhere unrelated) — getByText
    // scans from the form root, so the placement is implicit; the explicit ARIA
    // association above is the spec's authoritative contract.
    expect(screen.getByText("Requerido")).toBeInTheDocument()

    // Other fields without an error must NOT be marked invalid (no blanket aria-invalid).
    const nombreInput = screen.getByLabelText("Nombre")
    expect(nombreInput).not.toHaveAttribute("aria-invalid", "true")
    expect(nombreInput).not.toHaveAttribute("aria-describedby")

    // Sibling fields must not pick up the codigo alert id.
    const allAlerts = screen.getAllByRole("alert")
    expect(allAlerts).toHaveLength(1)
    expect(allAlerts[0]).toHaveTextContent("Requerido")
  })

  it("renders per-field error under named CatalogSelectField (Sexo) with ARIA wiring", () => {
    render(
      <AnimalFormScreen
        mode="desktop"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        fieldErrors={{ sexoKey: "Sexo requerido" }}
      />,
    )

    // Sexo is rendered via CatalogSelectField (Radix Select). The trigger carries the
    // aria-invalid / aria-describedby wiring — the alert <p> lives next to it.
    const sexoTrigger = screen.getByRole("combobox", { name: "Sexo" })
    expect(sexoTrigger).toHaveAttribute("aria-invalid", "true")
    const describedBy = sexoTrigger.getAttribute("aria-describedby")
    expect(describedBy).toBeTruthy()
    const alert = describedBy ? document.getElementById(describedBy) : null
    expect(alert).not.toBeNull()
    expect(alert).toHaveAttribute("role", "alert")
    expect(alert).toHaveTextContent("Sexo requerido")
  })

  it("uses labeled catalog selectors for CA-UI-001/003 while preserving form payload keys", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <AnimalFormScreen
        mode="desktop"
        onSave={onSave}
        onCancel={vi.fn()}
        initialValues={{ origen: "origen-compra", sexoKey: 1 }}
        catalogOptions={{
          sexo: [
            { value: "0", label: "Macho" },
            { value: "1", label: "Hembra" },
            { value: "2", label: "Pajuela" },
          ],
          origen: [{ value: "origen-compra", label: "Compra externa" }],
        }}
      />,
    )

    expect(screen.getByRole("combobox", { name: "Sexo" })).toHaveTextContent("Hembra")
    expect(screen.getByRole("combobox", { name: "Origen" })).toHaveTextContent("Compra externa")
    expect(screen.queryByText(/^1$/)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText("Código *"), "NV-43")
    await user.type(screen.getByLabelText("Nombre"), "Novilla 43")
    await user.click(screen.getByRole("combobox", { name: "Sexo" }))
    expect(screen.getByRole("option", { name: "Macho" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Hembra" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Pajuela" })).toBeInTheDocument()
    await user.click(screen.getByRole("option", { name: "Macho" }))

    await user.click(screen.getByRole("button", { name: "Guardar" }))
    const [formData] = onSave.mock.calls[0] as [FormData]
    expect(formData.get("sexoKey")).toBe("0")
    expect(formData.get("origen")).toBe("origen-compra")
  })

  it("uses dynamic sexo options, serializes selection, and fails closed without a catalog", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const { rerender } = render(
      <>
        <AnimalFormScreen
          mode="desktop"
          onSave={onSave}
          onCancel={vi.fn()}
          catalogOptions={{
            sexo: [
              { value: "0", label: "Macho" },
              { value: "1", label: "Hembra" },
            ],
          }}
        />
        <AnimalFormScreen
          mode="mobile"
          onSave={vi.fn()}
          onCancel={vi.fn()}
          catalogOptions={{
            sexo: [
              { value: "0", label: "Macho" },
              { value: "1", label: "Hembra" },
            ],
          }}
        />
      </>,
    )
    const sexoControls = screen.getAllByRole("combobox", { name: "Sexo" })
    expect(sexoControls).toHaveLength(2)
    expect(sexoControls[0]).not.toHaveAttribute("id", sexoControls[1]?.id)
    const firstSexo = sexoControls[0]
    if (!firstSexo) throw new Error("first sexo control expected")
    await user.click(firstSexo)
    await user.click(screen.getByRole("option", { name: "Macho" }))
    const codigoInputs = screen.getAllByLabelText("Código *")
    const firstCodigo = codigoInputs[0]
    if (!firstCodigo) throw new Error("first codigo input expected")
    await user.type(firstCodigo, "SX-1")
    const nombreInputs = screen.getAllByLabelText("Nombre")
    const firstNombre = nombreInputs[0]
    if (!firstNombre) throw new Error("first nombre input expected")
    await user.type(firstNombre, "Sexo dinámico")
    const guardarButtons = screen.getAllByRole("button", { name: "Guardar" })
    const firstGuardar = guardarButtons[0]
    if (!firstGuardar) throw new Error("first guardar button expected")
    await user.click(firstGuardar)
    const firstCall = onSave.mock.calls[0]
    const firstArg = firstCall?.[0]
    if (!(firstArg instanceof FormData)) throw new Error("expected FormData as first arg")
    expect(firstArg.get("sexoKey")).toBe("0")

    rerender(
      <AnimalFormScreen
        mode="desktop"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        catalogOptions={{ sexo: [] }}
      />,
    )
    expect(screen.getByRole("combobox", { name: "Sexo" })).toBeDisabled()
    expect(screen.getByRole("combobox", { name: "Sexo" })).toHaveTextContent("No disponible")
  })

  it("shows a safe unavailable label for missing CA-UI-001/003 catalog values", () => {
    render(
      <AnimalFormScreen
        mode="desktop"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        initialValues={{ origen: "origen-legacy" }}
        catalogOptions={{ origen: [] }}
      />,
    )

    expect(screen.getByRole("combobox", { name: "Origen" })).toHaveTextContent("No disponible")
    expect(screen.queryByText("origen-legacy")).not.toBeInTheDocument()
  })

  it("falls back to 'No disponible' for create-mode location selectors when catalog options are missing (CA-UI-001/003/005)", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={onSave}
        onCancel={vi.fn()}
        catalogOptions={{}}
      />,
    )

    for (const label of ["Potrero", "Sector", "Lote", "Grupo"] as const) {
      expect(screen.getByRole("combobox", { name: label })).toHaveTextContent("No disponible")
    }

    await user.type(screen.getByLabelText("Código *"), "NV-46")
    await user.type(screen.getByLabelText("Nombre"), "Novilla 46")
    await user.click(screen.getByRole("button", { name: "Guardar" }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const [formData] = onSave.mock.calls[0] as [FormData]
    for (const name of ["potreroId", "sectorId", "loteId", "grupoId"] as const) {
      expect(formData.get(name)).toBe("")
    }
    expect(formData.get("codigo")).toBe("NV-46")
    expect(formData.get("nombre")).toBe("Novilla 46")
    expect(formData.has("ubicacion")).toBe(false)
  })

  it("renders split CA-UI-005 location controls in create mode and submits selected ids", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={onSave}
        onCancel={vi.fn()}
        catalogOptions={{
          potrero: [{ value: "potrero-4", label: "Potrero 4" }],
          sector: [{ value: "sector-norte", label: "Sector Norte" }],
          lote: [{ value: "lote-cria", label: "Lote Cría" }],
          grupo: [{ value: "grupo-novillas", label: "Grupo Novillas" }],
        }}
      />,
    )

    expect(screen.queryByLabelText("Potrero/Sector/Lote/Grupo")).not.toBeInTheDocument()

    for (const [label, option] of [
      ["Potrero", "Potrero 4"],
      ["Sector", "Sector Norte"],
      ["Lote", "Lote Cría"],
      ["Grupo", "Grupo Novillas"],
    ] as const) {
      await user.click(screen.getByRole("combobox", { name: label }))
      await user.click(screen.getByRole("option", { name: option }))
    }

    await user.type(screen.getByLabelText("Código *"), "NV-44")
    await user.type(screen.getByLabelText("Nombre"), "Novilla 44")
    await user.click(screen.getByRole("button", { name: "Guardar" }))

    const [formData] = onSave.mock.calls[0] as [FormData]
    expect(formData.get("potreroId")).toBe("potrero-4")
    expect(formData.get("sectorId")).toBe("sector-norte")
    expect(formData.get("loteId")).toBe("lote-cria")
    expect(formData.get("grupoId")).toBe("grupo-novillas")
    expect(formData.has("ubicacion")).toBe(false)
  })

  it("renders edit-mode CA-UI-005 location as read-only and excludes direct mutations", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="edit"
        onSave={onSave}
        onCancel={vi.fn()}
        currentLocation={{
          potrero: "Potrero 4",
          sector: "Sector Norte",
          lote: "Lote Cría",
          grupo: "Grupo Novillas",
        }}
      />,
    )

    const location = screen.getByRole("region", { name: "Ubicación actual" })
    expect(within(location).getByText("Potrero 4")).toBeInTheDocument()
    expect(within(location).getByText("Sector Norte")).toBeInTheDocument()
    expect(within(location).getByText("Lote Cría")).toBeInTheDocument()
    expect(within(location).getByText("Grupo Novillas")).toBeInTheDocument()
    expect(within(location).getByRole("button", { name: "Mover animal" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Potrero/Sector/Lote/Grupo")).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: "Potrero" })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText("Código *"), "NV-45")
    await user.type(screen.getByLabelText("Nombre"), "Novilla 45")
    await user.click(screen.getByRole("button", { name: "Guardar" }))

    const [formData] = onSave.mock.calls[0] as [FormData]
    expect(formData.has("potreroId")).toBe(false)
    expect(formData.has("sectorId")).toBe(false)
    expect(formData.has("loteId")).toBe(false)
    expect(formData.has("grupoId")).toBe(false)
    expect(formData.has("ubicacion")).toBe(false)
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

  it("renders the v1.3 field set with the new primitives and gates '+ Crear nuevo' on configuracion:crear (CA-UI-001/002/004)", () => {
    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        catalogOptions={{
          raza: [
            { value: "r1", label: "Angus" },
            { value: "r2", label: "Brahman" },
          ],
          color: [{ value: "c1", label: "Negro" }],
          calidad: [{ value: "q1", label: "Excelente" }],
          madre: [
            { value: "a-100", codigo: "MT-100", nombre: "Lola" },
            { value: "a-200", codigo: "MT-200", nombre: "Maya" },
          ],
          padre: [{ value: "a-300", codigo: "MT-300", nombre: "Roble" }],
          canCreateCatalog: { raza: true, color: true, lugarCompra: true },
        }}
      />,
    )

    // fechaNacimiento is a DatePicker — trigger is a button labelled by the "Fecha de nacimiento" <Label htmlFor>.
    const fechaTrigger = screen.getByRole("button", { name: "Fecha de nacimiento" })
    expect(fechaTrigger).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "Fecha de nacimiento" })).not.toBeInTheDocument()

    // Raza / Color are SelectConCreacion (combobox role) with label association.
    expect(screen.getByRole("combobox", { name: "Raza" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Color" })).toBeInTheDocument()

    // Calidad is also a SelectConCreacion (per spec the form MUST NOT display raw keys
    // for calidad either), but `+ Crear nuevo` must NOT render — the spec is explicit
    // that calidad is a read-only catalog.
    const calidadCombobox = screen.getByRole("combobox", { name: "Calidad" })
    expect(calidadCombobox).toBeInTheDocument()

    // Origen is a PillsSegmentadas — radiogroup with 2 options, not a combobox.
    const origenGroup = screen.getByRole("radiogroup", { name: "Origen" })
    expect(origenGroup).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Nacido en finca" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Comprado" })).toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: "Origen" })).not.toBeInTheDocument()

    // Default origen = nacido_en_finca → parents visible, purchase fields not.
    expect(screen.getByRole("combobox", { name: "Madre" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Padre" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Fecha de nacimiento" })).toBeInTheDocument() // only fechaNacimiento trigger
    expect(screen.queryByRole("combobox", { name: "Lugar de compra" })).not.toBeInTheDocument()
  })

  it("gates '+ Crear nuevo' inside Raza, Color, Lugar de compra on canCreateCatalog; Calidad never shows it (CA-UI-002)", async () => {
    const user = userEvent.setup()

    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        catalogOptions={{
          raza: [{ value: "r1", label: "Angus" }],
          color: [{ value: "c1", label: "Negro" }],
          calidad: [{ value: "q1", label: "Excelente" }],
          lugarCompra: [{ value: "l1", label: "Feria local" }],
          canCreateCatalog: { raza: true, color: false, lugarCompra: true },
        }}
      />,
    )

    // Switch to comprado so lugarCompra renders
    await user.click(screen.getByRole("radio", { name: "Comprado" }))

    // Raza (canCreate) — `+ Crear nuevo` last item
    await user.click(screen.getByRole("combobox", { name: "Raza" }))
    const razaList = await screen.findByRole("listbox")
    expect(within(razaList).getByText("+ Crear nuevo")).toBeInTheDocument()
    await user.keyboard("{Escape}")
    // close popover
    await user.click(document.body)
    cleanup()

    // Re-render to reset popover state — this is the cleanest way to test the
    // next field without dealing with stacked Radix popovers in jsdom.
    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        catalogOptions={{
          raza: [{ value: "r1", label: "Angus" }],
          color: [{ value: "c1", label: "Negro" }],
          calidad: [{ value: "q1", label: "Excelente" }],
          lugarCompra: [{ value: "l1", label: "Feria local" }],
          canCreateCatalog: { raza: true, color: false, lugarCompra: true },
        }}
      />,
    )
    await user.click(screen.getByRole("radio", { name: "Comprado" }))

    // Color (canCreate=false) — `+ Crear nuevo` NOT present
    await user.click(screen.getByRole("combobox", { name: "Color" }))
    const colorList = await screen.findByRole("listbox")
    expect(within(colorList).queryByText("+ Crear nuevo")).not.toBeInTheDocument()
    await user.click(document.body)
    cleanup()

    // Calidad (canCreate always false per spec) — `+ Crear nuevo` NOT present
    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        catalogOptions={{
          raza: [{ value: "r1", label: "Angus" }],
          calidad: [{ value: "q1", label: "Excelente" }],
          canCreateCatalog: { raza: true, color: false, lugarCompra: true },
        }}
      />,
    )
    await user.click(screen.getByRole("combobox", { name: "Calidad" }))
    const calidadList = await screen.findByRole("listbox")
    expect(within(calidadList).queryByText("+ Crear nuevo")).not.toBeInTheDocument()
    await user.click(document.body)
    cleanup()

    // Lugar de compra (canCreate=true) — `+ Crear nuevo` present
    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        catalogOptions={{
          raza: [{ value: "r1", label: "Angus" }],
          lugarCompra: [{ value: "l1", label: "Feria local" }],
          canCreateCatalog: { raza: true, color: false, lugarCompra: true },
        }}
      />,
    )
    await user.click(screen.getByRole("radio", { name: "Comprado" }))
    await user.click(screen.getByRole("combobox", { name: "Lugar de compra" }))
    const lugarList = await screen.findByRole("listbox")
    expect(within(lugarList).getByText("+ Crear nuevo")).toBeInTheDocument()
  })

  it("shows purchase fields (fechaCompra/precioCompra/pesoCompra/lugarCompra) ONLY when origen='comprado' (CA-UI-007)", async () => {
    const user = userEvent.setup()

    render(
      <AnimalFormScreen mode="desktop" formVariant="create" onSave={vi.fn()} onCancel={vi.fn()} />,
    )

    // Default: nacido_en_finca → purchase fields NOT visible
    expect(screen.queryByRole("button", { name: "Fecha de nacimiento" })).toBeInTheDocument() // only fechaNacimiento
    expect(screen.queryByLabelText("Fecha de compra")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Precio")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Peso compra")).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: "Lugar de compra" })).not.toBeInTheDocument()

    // Toggle to comprado
    await user.click(screen.getByRole("radio", { name: "Comprado" }))

    // Purchase fields visible
    expect(screen.getByLabelText("Fecha de compra")).toBeInTheDocument()
    expect(screen.getByLabelText("Precio")).toBeInTheDocument()
    expect(screen.getByLabelText("Peso compra")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Lugar de compra" })).toBeInTheDocument()

    // Parents NOT visible
    expect(screen.queryByRole("combobox", { name: "Madre" })).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: "Padre" })).not.toBeInTheDocument()
  })

  it("discards abandoned purchase-field values when origen flips back to 'nacido_en_finca' (CA-UI-007)", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <AnimalFormScreen mode="desktop" formVariant="create" onSave={onSave} onCancel={vi.fn()} />,
    )

    // Switch to comprado
    await user.click(screen.getByRole("radio", { name: "Comprado" }))

    // Type a value in Precio
    const precio = screen.getByLabelText("Precio")
    await user.type(precio, "1500,75")

    // Switch back to nacido_en_finca
    await user.click(screen.getByRole("radio", { name: "Nacido en finca" }))

    // Switch to comprado again — the previous value should NOT be there
    await user.click(screen.getByRole("radio", { name: "Comprado" }))
    const precioAfter = screen.getByLabelText("Precio")
    expect(precioAfter).toHaveValue("")

    // Submit and verify the FormData does NOT carry the abandoned value
    await user.type(screen.getByLabelText("Código *"), "NV-99")
    await user.type(screen.getByLabelText("Nombre"), "Novilla 99")
    await user.click(screen.getByRole("button", { name: "Guardar" }))

    const [formData] = onSave.mock.calls[0] as [FormData]
    // CA-UI-007: the purchase-field input may still be in the DOM
    // (uncontrolled), but its VALUE must be empty so the FormData
    // does not carry the abandoned user input.
    expect(formData.get("precioCompra")).toBe("")
  })

  it("serializes controlled birth and purchase dates while rejecting purchase dates before birth", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <AnimalFormScreen mode="desktop" formVariant="create" onSave={onSave} onCancel={vi.fn()} />,
    )

    await user.click(screen.getByRole("button", { name: "Fecha de nacimiento" }))
    await user.click(await screen.findByRole("button", { name: /, 10 de julio de 2026/ }))
    await user.click(screen.getByRole("radio", { name: "Comprado" }))
    await user.click(screen.getByRole("button", { name: "Fecha de compra" }))

    const beforeBirth = await screen.findByRole("button", { name: /, 9 de julio de 2026/ })
    expect(beforeBirth).toBeDisabled()
    await user.click(await screen.findByRole("button", { name: /, 15 de julio de 2026/ }))
    expect(screen.getByRole("button", { name: "Fecha de compra" })).toHaveTextContent("15/07/2026")

    await user.type(screen.getByLabelText("Código *"), "NV-DATE")
    await user.type(screen.getByLabelText("Nombre"), "Fecha controlada")
    await user.click(screen.getByRole("button", { name: "Guardar" }))
    const [formData] = onSave.mock.calls[0] as [FormData]
    expect(formData.get("fechaNacimiento")).toBe("2026-07-10")
    expect(formData.get("fechaCompra")).toBe("2026-07-15")
  })

  it("filters out the current animal from the madre/padre options to prevent self-parenting", async () => {
    const user = userEvent.setup()

    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="edit"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        currentAnimalId="a-200"
        catalogOptions={{
          madre: [
            { value: "a-100", codigo: "MT-100", nombre: "Lola" },
            { value: "a-200", codigo: "MT-200", nombre: "Maya" },
          ],
          padre: [{ value: "a-300", codigo: "MT-300", nombre: "Roble" }],
        }}
      />,
    )

    // open madre combobox
    await user.click(screen.getByRole("combobox", { name: "Madre" }))
    const list = await screen.findByRole("listbox")
    expect(within(list).queryByText("MT-200 · Maya")).not.toBeInTheDocument()
    expect(within(list).getByText("MT-100 · Lola")).toBeInTheDocument()
  })

  it("'Estimar por edad' produces an ISO date and appends '[fecha estimada]' to comentarios (CA-CRE-004)", async () => {
    const user = userEvent.setup()

    render(
      <AnimalFormScreen mode="desktop" formVariant="create" onSave={vi.fn()} onCancel={vi.fn()} />,
    )

    // The 'Estimar por edad' affordance is an inline button next to the fechaNacimiento DatePicker.
    const estimarBtn = screen.getByRole("button", { name: /Estimar por edad/i })
    await user.click(estimarBtn)

    // A tiny popover with an age input appears
    const ageInput = await screen.findByRole("spinbutton", { name: /a[ñn]os/i })
    await user.clear(ageInput)
    await user.type(ageInput, "3")

    // Confirm
    await user.click(screen.getByRole("button", { name: /Aplicar/i }))

    // The DatePicker trigger now shows the formatted date (3 years ago)
    const today = new Date()
    const threeYearsAgo = new Date(today)
    threeYearsAgo.setFullYear(today.getFullYear() - 3)
    const dd = String(threeYearsAgo.getDate()).padStart(2, "0")
    const mm = String(threeYearsAgo.getMonth() + 1).padStart(2, "0")
    const yyyy = threeYearsAgo.getFullYear()
    const expectedDisplay = `${dd}/${mm}/${yyyy}`
    expect(screen.getByText(expectedDisplay)).toBeInTheDocument()

    // comentarios ends with [fecha estimada]
    const comentarios = screen.getByLabelText("Comentarios")
    expect(comentarios).toHaveValue("[fecha estimada]")
  })

  it("rejects future dates on fechaNacimiento with aria-invalid='true' and the error message (RN-002)", () => {
    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        fieldErrors={{ fechaNacimiento: "La fecha no puede ser futura" }}
      />,
    )

    const trigger = screen.getByRole("button", { name: "Fecha de nacimiento" })
    expect(trigger).toHaveAttribute("aria-invalid", "true")
    const describedBy = trigger.getAttribute("aria-describedby")
    expect(describedBy).toBeTruthy()
    const alert = describedBy ? document.getElementById(describedBy) : null
    expect(alert).not.toBeNull()
    expect(alert).toHaveAttribute("role", "alert")
    expect(alert).toHaveTextContent("La fecha no puede ser futura")
  })

  it("submit button shows 'Guardando…' and preserves width when isSubmitting is true (CA-UI-006)", () => {
    render(
      <AnimalFormScreen
        mode="desktop"
        formVariant="create"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting
      />,
    )

    const btn = screen.getByRole("button", { name: "Guardando…" })
    expect(btn).toBeInTheDocument()
    expect(btn).toBeDisabled()
    // Width preservation — a fixed minimum that resists collapsing to fit the new label.
    // Asserted via class because jsdom does not compute layout-derived properties.
    expect(btn).toHaveClass("min-w-[120px]")
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
